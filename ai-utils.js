// ai-utils.js — Shared AI fetch utility used by all pages
// Handles: timeout, retries, network check, error distinction

/**
 * Call the Zyvora AI backend with timeout + retry support.
 * @param {Array} messages - OpenAI-format messages array
 * @param {number} maxTokens - max tokens for response
 * @param {function} onRetry - optional callback when retrying (e.g. to update UI)
 * @returns {Promise<string>} - AI response text
 */
export async function callAI(messages, maxTokens = 1000, onRetry = null) {
  const cfg = window.ZYVORA_CONFIG || {};
  const AI_URL = cfg.AI_URL || "https://zyvora-appointment-booking.onrender.com/api/ai";
  const TIMEOUT = cfg.AI_TIMEOUT_MS || 20000;
  const MAX_RETRIES = cfg.AI_RETRIES || 2;

  // Check network first
  if (!navigator.onLine) {
    throw new Error("No internet connection. Please check your network.");
  }

  async function attempt(retriesLeft) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ messages, max_tokens: maxTokens })
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Server error (${res.status}). Try again.`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || data.error);
      }

      return data.choices?.[0]?.message?.content || "No response received.";

    } catch (e) {
      clearTimeout(timer);

      // Distinguish error types
      if (e.name === "AbortError") {
        if (retriesLeft > 0) {
          if (onRetry) onRetry(MAX_RETRIES - retriesLeft + 1, MAX_RETRIES);
          await sleep(4000);
          return attempt(retriesLeft - 1);
        }
        throw new Error("⏳ AI is taking too long. The server may be waking up — try again in a moment.");
      }

      if (!navigator.onLine) {
        throw new Error("📵 No internet connection detected.");
      }

      if (retriesLeft > 0) {
        if (onRetry) onRetry(MAX_RETRIES - retriesLeft + 1, MAX_RETRIES);
        await sleep(3000);
        return attempt(retriesLeft - 1);
      }

      throw e;
    }
  }

  return attempt(MAX_RETRIES);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Get today's date string in local timezone (YYYY-MM-DD)
 * Avoids UTC mismatch for Ghana time
 */
export function getLocalToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Safely escape HTML — use textContent instead of innerHTML for user data
 */
export function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
