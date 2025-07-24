const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
} = require("../utils/logging");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// ✅ Load STRUKT AI system prompt
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

app.post("/log", async (req, res) => {
  const { email, topic, message, coachReply, logType, meal, workout, supplement, sleep, mood, reflection } = req.body;

  try {
    // ✅ Always log the chat interaction
    await logChatInteraction(email, topic, message, coachReply);

    // ✅ Conditionally log the specific entry type
    if (logType === "meal" && meal) {
      await logMeal(email, meal);
    } else if (logType === "workout" && workout) {
      await logWorkout(email, workout);
    } else if (logType === "supplement" && supplement) {
      await logSupplement(email, supplement);
    } else if (logType === "sleep" && sleep) {
      await logSleep(email, sleep);
    } else if (logType === "mood" && mood) {
      await logMood(email, mood);
    } else if (logType === "reflection" && reflection) {
      await logReflection(email, reflection);
    }

    res.status(200).send("✅ Log successful");
  } catch (err) {
    console.error("🔥 Logging Error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Message:", err.message);
    }
    res.status(500).send("❌ Logging failed");
  }
});

app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});
