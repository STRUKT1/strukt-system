const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Load STRUKT system prompt (optional)
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

// ✅ Import logging functions only
const {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
} = require("../utils/logging");

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("✅ STRUKT server is live");
});

// ✅ /ASK — Simplified direct call to OpenAI (no OpenAI.js)
app.post("/ask", async (req, res) => {
  const { message, email } = req.body;

  if (!message || !email) {
    return res.status(400).json({ error: "Missing message or email" });
  }

  try {
    const axios = require("axios");

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are the STRUKT Coach. Respond helpfully when spoken to."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content.trim();

    // Optional logging
    await logChatInteraction(email, "Chat", message, reply);

    res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ /ask error:", err?.response?.data || err.message);
    res.status(500).json({ error: "AI response failed" });
  }
});

// ✅ TEMP: Fetch available OpenAI models
app.get("/api/models", async (req, res) => {
  try {
    const axios = require("axios");

    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const models = response.data.data.map((model) => model.id);
    res.json({ availableModels: models });
  } catch (err) {
    console.error("❌ Error fetching models:", err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch models", details: err?.response?.data || err.message });
  }
});

// ✅ UNIFIED /log route
app.post("/log", async (req, res) => {
  const {
    email,
    topic,
    message,
    coachReply,
    logType,
    meal,
    workout,
    supplement,
    sleep,
    mood,
    reflection
  } = req.body;

  try {
    if (logType === "meal") await logMeal(email, meal);
    else if (logType === "workout") await logWorkout(email, workout);
    else if (logType === "supplement") await logSupplement(email, supplement);
    else if (logType === "sleep") await logSleep(email, sleep);
    else if (logType === "mood") await logMood(email, mood);
    else if (logType === "reflection") await logReflection(email, reflection);

    if (message && coachReply) {
      await logChatInteraction(email, topic || "General", message, coachReply);
    }

    res.status(200).send("✅ Log successful");
  } catch (err) {
    console.error("🔥 Logging Error:", err?.response?.data || err.message);
    res.status(500).send("❌ Logging failed");
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});