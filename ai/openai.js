const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID; // ✅ NEW: Pull org ID
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const VISION_MODEL = "gpt-4-vision-preview"; // reserved for future image input
const CHAT_MODEL = "gpt-4o"; // ✅ confirmed available to your key

// ✅ Load the STRUKT system prompt
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

/**
 * Generates a reply from the STRUKT AI Coach
 *
 * @param {string} userMessage - The user’s raw input.
 * @param {object} context - Optional context (e.g. coachingTone, dietaryNeeds).
 * @param {string} imageBase64 - Optional image in base64 format (for future vision).
 */
async function getAIReply(userMessage, context = {}, imageBase64 = null) {
  try {
    // 👤 Construct identity-aware pre-prompt (optional)
    const contextString = buildContextString(context);

    // 🧠 Build the core message array
    const messages = [
      { role: "system", content: `${systemPrompt}${contextString}` },
      { role: "user", content: userMessage }
    ];

    // 📷 Optional image input (for future use)
    const payload = imageBase64
      ? {
          model: VISION_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userMessage },
                {
                  type: "image_url",
                  image_url: {
                    detail: "high",
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        }
      : {
          model: CHAT_MODEL, // ✅ using gpt-4o
          messages,
          temperature: 0.7
        };

    // 🚀 Send request to OpenAI
    const res = await axios.post(OPENAI_URL, payload, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Organization": OPENAI_ORG_ID // ✅ NEW: Include org header
      }
    });

    const reply = res.data.choices[0].message.content.trim();
    return reply;
  } catch (err) {
    console.error("❌ OpenAI Error:", err?.response?.data || err.message);
    return "Sorry, there was an error generating your response.";
  }
}

/**
 * Converts user context into a string to inject into the system prompt
 */
function buildContextString(context = {}) {
  let contextLines = [];

  if (context.name) contextLines.push(`User: ${context.name}`);
  if (context.coachingTone) contextLines.push(`Preferred tone: ${context.coachingTone}`);
  if (context.mainGoal) contextLines.push(`Main Goal: ${context.mainGoal}`);
  if (context.dietaryNeeds) contextLines.push(`Dietary: ${context.dietaryNeeds}`);
  if (context.medical) contextLines.push(`Medical notes: ${context.medical}`);
  if (context.equipment) contextLines.push(`Training Equipment: ${context.equipment}`);
  if (context.nutritionStyle) contextLines.push(`Nutrition Style: ${context.nutritionStyle}`);

  return contextLines.length > 0
    ? `\n\n[USER CONTEXT]\n${contextLines.join("\n")}\n`
    : "";
}

module.exports = {
  getAIReply
};
