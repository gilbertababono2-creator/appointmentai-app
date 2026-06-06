const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: "https://appointmentai-app.onrender.com" }));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", app: "Zyvora AI Proxy" });
});

// DeepSeek AI proxy — keeps API key safe on the server
app.post("/api/ai", async (req, res) => {
  const { messages, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens,
        messages
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("DeepSeek error:", e);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Zyvora backend running on port ${PORT}`);
});
      
