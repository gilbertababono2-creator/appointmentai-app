// auth.js — Authentication: register, login, logout, guard, admin check
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── ADMIN CONFIG ──────────────────────────────────────────────────────────────
// Add your username here — only this account can access the dashboard
const ADMIN_USERNAMES = ["gilbertababono2"]; // ← change to YOUR username

// ── Guards ────────────────────────────────────────────────────────────────────

/** Redirect to login if no session. Returns username string or null. */
export function requireLogin() {
  const user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

/** Only allow admin users. Redirect others to index.html */
export function requireAdmin() {
  const user = requireLogin();
  if (!user) return null;
  if (!ADMIN_USERNAMES.includes(user)) {
    alert("Access denied. This page is for admins only.");
    window.location.href = "index.html";
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
  window.location.href = "login.html";
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(username, password) {
  username = username.trim().toLowerCase();

  if (username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = await getDocs(
    query(collection(db, "users"), where("username", "==", username))
  );
  if (!existing.empty) throw new Error("Username already taken. Please choose another.");

  await addDoc(collection(db, "users"), {
    username,
    password,
    role:      ADMIN_USERNAMES.includes(username) ? "admin" : "user",
    plan:      "free",
    createdAt: serverTimestamp()
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(username, password) {
  username = username.trim().toLowerCase();

  const snapshot = await getDocs(
    query(
      collection(db, "users"),
      where("username", "==", username),
      where("password", "==", password)
    )
  );

  if (snapshot.empty) throw new Error("Invalid username or password.");

  localStorage.setItem("loggedInUser", username);

  // Redirect admin to dashboard, regular users to booking page
  if (ADMIN_USERNAMES.includes(username)) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "index.html";
  }
}