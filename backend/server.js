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
  res.json({ status: "ok", app: "Zyvora AI Proxy" });
});

// DeepSeek AI proxy
app.post("/api/ai", async (req, res) => {
  const { messages, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("❌ DEEPSEEK_API_KEY is not set!");
    return res.status(500).json({ error: "API key not configured" });
  }

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
      console.error("❌ DeepSeek API error:", data.error);
      return res.status(500).json({ error: data.error.message || "DeepSeek error" });
    }

    console.log("✅ DeepSeek responded OK");
    res.json(data);
  } catch (e) {
    console.error("❌ Fetch error:", e.message);
    res.status(500).json({ error: "AI request failed: " + e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Zyvora backend running on port ${PORT}`);
  // Self-ping every 14 minutes to prevent Render free tier spin-down
  setInterval(() => {
    fetch(`http://localhost:${PORT}/`)
      .then(() => console.log("🏓 Self-ping OK"))
      .catch(e => console.error("Self-ping failed:", e.message));
  }, 14 * 60 * 1000);
});
