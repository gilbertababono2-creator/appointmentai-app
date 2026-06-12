// auth.js — Authentication: register, login, Google sign-in, logout, guards
import { db, auth, googleProvider } from "./firebase.js";
import {
  collection, addDoc, query, where,
  getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithPopup, signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── ADMIN CONFIG ──────────────────────────────────────────────
const ADMIN_USERNAMES = ["gilbertababono2"];

// ── GUARDS ────────────────────────────────────────────────────
/** Redirect to login if no session. Returns username string or null. */
export function requireLogin() {
  const user = localStorage.getItem("loggedInUser");
  if (!user) { window.location.href = "login.html"; return null; }
  return user;
}

/** Only allow admin users. Redirect others to app.html */
export function requireAdmin() {
  const user = requireLogin();
  if (!user) return null;
  if (!ADMIN_USERNAMES.includes(user)) {
    alert("Access denied. This page is for admins only.");
    window.location.href = "app.html";
    return null;
  }
  return user;
}

/** Check if current user is admin — returns true/false */
export function isAdmin() {
  const user = localStorage.getItem("loggedInUser");
  return user ? ADMIN_USERNAMES.includes(user) : false;
}

/** Clear session and go to login. */
export function logout() {
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userEmail");
  firebaseSignOut(auth).catch(() => {});
  window.location.href = "login.html";
}

// ── USERNAME/PASSWORD LOGIN ───────────────────────────────────
export async function loginUser(username, password) {
  username = username.trim().toLowerCase();

  const snapshot = await getDocs(query(
    collection(db, "users"),
    where("username", "==", username),
    where("password", "==", password)
  ));

  if (snapshot.empty) throw new Error("Invalid username or password.");

  const userData = snapshot.docs[0].data();
  localStorage.setItem("loggedInUser", username);
  if (userData.email) localStorage.setItem("userEmail", userData.email);

  // Redirect
  if (ADMIN_USERNAMES.includes(username)) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "app.html";
  }
}

// ── REGISTER ──────────────────────────────────────────────────
export async function registerUser(username, password) {
  username = username.trim().toLowerCase();

  if (username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = await getDocs(query(
    collection(db, "users"),
    where("username", "==", username)
  ));
  if (!existing.empty) throw new Error("Username already taken. Please choose another.");

  await addDoc(collection(db, "users"), {
    username,
    password,
    role: ADMIN_USERNAMES.includes(username) ? "admin" : "user",
    createdAt: serverTimestamp()
  });

  localStorage.setItem("loggedInUser", username);
  window.location.href = "app.html";
}

// ── GOOGLE SIGN-IN ────────────────────────────────────────────
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const gUser = result.user;

  // Use email prefix as username (e.g. kofi.mensah@gmail.com → kofi.mensah)
  const username = gUser.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const email = gUser.email;
  const displayName = gUser.displayName || username;

  // Check if user already exists in Firestore
  const existing = await getDocs(query(
    collection(db, "users"),
    where("username", "==", username)
  ));

  if (existing.empty) {
    // First time — create user record
    await addDoc(collection(db, "users"), {
      username,
      email,
      displayName,
      googleUid: gUser.uid,
      password: "", // no password for Google users
      role: ADMIN_USERNAMES.includes(username) ? "admin" : "user",
      authMethod: "google",
      createdAt: serverTimestamp()
    });
  }

  // Save session
  localStorage.setItem("loggedInUser", username);
  localStorage.setItem("userEmail", email);

  // Redirect
  if (ADMIN_USERNAMES.includes(username)) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "app.html";
  }
}
