const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// ✅ Load STRUKT system prompt (optional inline reference)
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

// ✅ Import logging + AI functions
const {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
} = require("../utils/logging");

const { getAIReply } = require("../ai/openai");

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("✅ STRUKT server is live");
});

// ✅ /ASK — AI Coach reply
app.post("/ask", async (req, res) => {
  const { message, email, context = {}, imageBase64 = null } = req.body;

  if (!message || !email) {
    return res.status(400).json({ error: "Missing message or email" });
  }

  try {
    const aiReply = await getAIReply(message, context, imageBase64);

    // Optional: log the chat interaction
    await logChatInteraction(email, "Chat", message, aiReply);

    res.status(200).json({ reply: aiReply });
  } catch (err) {
    console.error("❌ /ask error:", err?.response?.data || err.message);
    res.status(500).json({ error: "AI response failed" });
  }
});

// ✅ Unified /log route
app.post("/log", async (req, res) => {
  const { email, topic, message, coachReply, logType, meal, workout, supplement, sleep, mood, reflection } = req.body;

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

app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});
