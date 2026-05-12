// auth.js — Authentication: register, login, logout, guard
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

/** Clear session and go to login. */
export function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * Create a new user in Firestore.
 * Throws an Error with a user-friendly message on failure.
 */
export async function registerUser(username, password) {
  username = username.trim().toLowerCase();

  if (username.length < 3)  throw new Error("Username must be at least 3 characters.");
  if (password.length < 6)  throw new Error("Password must be at least 6 characters.");

  // Duplicate check
  const existing = await getDocs(
    query(collection(db, "users"), where("username", "==", username))
  );
  if (!existing.empty) throw new Error("Username already taken. Please choose another.");

  await addDoc(collection(db, "users"), {
    username,
    password,                                   // ⚠️ plain-text: fine for dev, hash for production
    createdAt: serverTimestamp()
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Validate credentials against Firestore.
 * Sets localStorage on success, throws on failure.
 */
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
}