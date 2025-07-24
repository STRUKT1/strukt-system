const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// Load STRUKT system prompt
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

// Logging functions
const {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
} = require("../utils/logging");

// ✅ Unified logging endpoint
app.post("/log", async (req, res) => {
  const { email, topic, message, coachReply, logType } = req.body;

  try {
    // Always log chat interaction if message + reply exist
    if (message && coachReply) {
      await logChatInteraction(email, topic, message, coachReply);
    }

    // Handle each log type if data is present
    if (logType === "meal" && req.body.meal) {
      await logMeal(email, req.body.meal);
    } else if (logType === "workout" && req.body.workout) {
      await logWorkout(email, req.body.workout);
    } else if (logType === "supplement" && req.body.supplement) {
      await logSupplement(email, req.body.supplement);
    } else if (logType === "sleep" && req.body.sleep) {
      await logSleep(email, req.body.sleep);
    } else if (logType === "mood" && req.body.mood) {
      await logMood(email, req.body.mood);
    } else if (logType === "reflection" && req.body.reflection) {
      await logReflection(email, req.body.reflection);
    }

    res.status(200).send("✅ Log successful");
  } catch (err) {
    console.error("🔥 Logging error:", err?.response?.data || err.message);
    res.status(500).send("❌ Logging failed");
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ STRUKT Coach API is running.");
});

app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});
