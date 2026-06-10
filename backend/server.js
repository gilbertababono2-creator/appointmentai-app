const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: [
    "https://appointmentai-app.onrender.com",
    "https://www.appointmentai-app.onrender.com"
  ]
}));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", app: "Zyvora AI Proxy", provider: getProvider() });
});

// Determine which AI provider to use based on available keys
function getProvider() {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  return "none";
}

// AI proxy — supports Groq (free) and DeepSeek
app.post("/api/ai", async (req, res) => {
  const { messages, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const provider = getProvider();

  if (provider === "none") {
    console.error("❌ No AI API key configured!");
    return res.status(500).json({ error: "No AI API key configured on server." });
  }

  // ── Groq (free tier) ──────────────────────────────────────────
  if (provider === "groq") {
    try {
      console.log("🤖 Calling Groq with", messages.length, "messages");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Fast, free, great quality
          max_tokens,
          messages
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error("❌ Groq error:", data.error);
        return res.status(500).json({ error: data.error.message || "Groq error" });
      }

      console.log("✅ Groq responded OK");
      res.json(data);
    } catch (e) {
      console.error("❌ Groq fetch error:", e.message);
      res.status(500).json({ error: "AI request failed: " + e.message });
    }
    return;
  }

  // ── DeepSeek (paid) ───────────────────────────────────────────
  if (provider === "deepseek") {
    try {
      console.log("🤖 Calling DeepSeek with", messages.length, "messages");
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({ model: "deepseek-chat", max_tokens, messages })
      });

      const data = await response.json();

      if (data.error) {
        console.error("❌ DeepSeek error:", data.error);
        return res.status(500).json({ error: data.error.message || "DeepSeek error" });
      }

      console.log("✅ DeepSeek responded OK");
      res.json(data);
    } catch (e) {
      console.error("❌ DeepSeek fetch error:", e.message);
      res.status(500).json({ error: "AI request failed: " + e.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Zyvora backend running on port ${PORT} | Provider: ${getProvider()}`);
  // Self-ping every 14 minutes to prevent Render free tier spin-down
  setInterval(() => {
    fetch(`http://localhost:${PORT}/`)
      .then(() => console.log("🏓 Self-ping OK"))
      .catch(e => console.error("Self-ping failed:", e.message));
  }, 14 * 60 * 1000);
});
