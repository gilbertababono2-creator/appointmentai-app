// plans.js — Plan management & usage tracking
// Uses username (from localStorage) as the key, not Firebase UID
import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const PLAN_LIMITS = {
  free: 10,
  starter: 50,
  pro: Infinity,
  business: Infinity
};

export async function getUserPlan(username) {
  try {
    const snap = await getDoc(doc(db, "plans", username));
    if (snap.exists()) return snap.data();
    return { plan: "free" };
  } catch (e) {
    console.error("getUserPlan error:", e);
    return { plan: "free" };
  }
}

export async function getUsageCount(username) {
  try {
    const monthKey = getMonthKey();
    const snap = await getDoc(doc(db, "usage", username + "_" + monthKey));
    if (snap.exists()) return snap.data().count || 0;
    return 0;
  } catch (e) {
    console.error("getUsageCount error:", e);
    return 0;
  }
}

export async function incrementUsage(username) {
  try {
    const monthKey = getMonthKey();
    const ref = doc(db, "usage", username + "_" + monthKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1) });
    } else {
      await setDoc(ref, { username, month: monthKey, count: 1, createdAt: serverTimestamp() });
    }
  } catch (e) {
    console.error("incrementUsage error:", e);
  }
}

function getMonthKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return now.getFullYear() + "-" + m;
}
