// subscription.js — Subscription helpers using Paystack
import { db } from "./firebase.js";
import { getPlan } from "./plans.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Get user Firestore document ───────────────────────────────────────────────
async function getUserDoc(username) {
  const snap = await getDocs(
    query(collection(db, "users"), where("username", "==", username))
  );
  if (snap.empty) throw new Error("User not found.");
  return snap.docs[0];
}

// ── Get user's current active plan ───────────────────────────────────────────
export async function getUserPlan(username) {
  const userDoc = await getUserDoc(username);
  return getPlan(userDoc.data().plan ?? "free");
}

// ── Count appointments booked this calendar month ─────────────────────────────
export async function getMonthlyCount(username) {
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Firestore will prompt you to create a composite index on first run.
  // Click the auto-generated link in the console — takes 1 minute.
  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("bookedBy",  "==", username),
      where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
      where("createdAt", "<=", Timestamp.fromDate(endOfMonth))
    )
  );

  return snap.size;
}

// ── Booking gate: can this user book another appointment? ─────────────────────
export async function canBook(username) {
  const plan  = await getUserPlan(username);
  const count = await getMonthlyCount(username);

  if (plan.appointmentLimit === Infinity) {
    return { allowed: true, plan, count, limit: Infinity };
  }

  const allowed = count < plan.appointmentLimit;
  return { allowed, plan, count, limit: plan.appointmentLimit };
}

// ── Save Paystack subscription after successful payment ───────────────────────
// Called inside the Paystack onSuccess callback with the transaction reference
export async function savePaystackSubscription(username, planKey, reference) {
  const userDoc = await getUserDoc(username);

  await updateDoc(userDoc.ref, {
    plan:                planKey,
    paymentMethod:       "paystack",
    paystackReference:   reference,
    subscribedAt:        Timestamp.now(),
    subscriptionStatus:  "active",
  });
}

// ── Downgrade to free ─────────────────────────────────────────────────────────
export async function cancelSubscription(username) {
  const userDoc = await getUserDoc(username);

  await updateDoc(userDoc.ref, {
    plan:               "free",
    paymentMethod:      null,
    paystackReference:  null,
    subscriptionStatus: "cancelled",
  });
}