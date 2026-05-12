// plans.js — Plan definitions with Paystack Plan Codes (GHS currency)
//
// ─── SETUP INSTRUCTIONS ───────────────────────────────────────────────────────
// 1. Go to https://dashboard.paystack.com (make sure you are in LIVE mode)
// 2. Products → Plans → Create Plan for each paid tier below
//    - Set billing interval: Monthly
//    - Set currency: GHS
// 3. Copy each Plan Code (starts with PLN_) and paste below
// 4. Copy your Live Public Key → Settings → API Keys & Webhooks
//    Paste it below replacing pk_live_REPLACE_...
//
// 💰 PRICING NOTE:
//    Paystack amounts are sent in PESEWAS (smallest unit).
//    1 GHS = 100 pesewas — so GHS 50 = 5000 in the amount field.
//    The `price` field below is in GHS (human-readable).
//    The conversion (× 100) happens automatically in pricing.html.
// ─────────────────────────────────────────────────────────────────────────────

export const PAYSTACK_PUBLIC_KEY = "pk_live_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";

export const PLANS = {
  free: {
    key:              "free",
    name:             "Free",
    price:            0,           // GHS 0
    currency:         "GHS",
    appointmentLimit: 20,
    staffLimit:       1,
    paystackPlanCode: null,
    features: [
      "20 appointments / month",
      "1 user account",
      "Basic dashboard",
    ],
  },

  starter: {
    key:              "starter",
    name:             "Starter",
    price:            50,          // GHS 50/month → sent as 5000 pesewas
    currency:         "GHS",
    appointmentLimit: 100,
    staffLimit:       1,
    paystackPlanCode: "PLN_REPLACE_STARTER_CODE",   // ← from Paystack dashboard
    features: [
      "100 appointments / month",
      "1 user account",
      "Full dashboard & stats",
      "Email reminders",
    ],
  },

  pro: {
    key:              "pro",
    name:             "Pro",
    price:            150,         // GHS 150/month → sent as 15000 pesewas
    currency:         "GHS",
    appointmentLimit: Infinity,
    staffLimit:       5,
    paystackPlanCode: "PLN_REPLACE_PRO_CODE",       // ← from Paystack dashboard
    features: [
      "Unlimited appointments",
      "Up to 5 staff accounts",
      "Priority support",
      "Advanced analytics",
    ],
  },

  business: {
    key:              "business",
    name:             "Business",
    price:            350,         // GHS 350/month → sent as 35000 pesewas
    currency:         "GHS",
    appointmentLimit: Infinity,
    staffLimit:       Infinity,
    paystackPlanCode: "PLN_REPLACE_BUSINESS_CODE",  // ← from Paystack dashboard
    features: [
      "Everything in Pro",
      "Unlimited staff accounts",
      "White-label branding",
      "API access",
    ],
  },
};

export function getPlan(key) {
  return PLANS[key] ?? PLANS.free;
}