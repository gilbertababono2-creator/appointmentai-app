// plans.js — Plan management & usage tracking
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

/**
 * Get the user's current plan from Firestore.
 * Returns { plan: 'free' | 'starter' | 'pro' | 'business' }
 */
export async function getUserPlan(uid) {
  try {
    const snap = await getDoc(doc(db, "plans", uid));
    if (snap.exists()) return snap.data();
    return { plan: "free" };
  } catch (e) {
    console.error("getUserPlan error:", e);
    return { plan: "free" };
  }
}

/**
 * Get the current month's usage count for a user.
 */
export async function getUsageCount(uid) {
  try {
    const monthKey = getMonthKey();
    const snap = await getDoc(doc(db, "usage", `${uid}_${monthKey}`));
    if (snap.exists()) return snap.data().count || 0;
    return 0;
  } catch (e) {
    console.error("getUsageCount error:", e);
    return 0;
  }
}

/**
 * Increment usage by 1 for current month.
 */
export async function incrementUsage(uid) {
  try {
    const monthKey = getMonthKey();
    const ref = doc(db, "usage", `${uid}_${monthKey}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1) });
    } else {
      await setDoc(ref, { uid, month: monthKey, count: 1, createdAt: serverTimestamp() });
    }
  } catch (e) {
    console.error("incrementUsage error:", e);
  }
}

/**
 * Returns a string like "2026-06" for the current month.
 */
function getMonthKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${m}`;
}
