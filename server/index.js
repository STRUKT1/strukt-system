const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_INTERACTIONS_TABLE_ID = "tblDtOOmahkMYEqmy";

const AIRTABLE_HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  "Content-Type": "application/json",
};

// Function to get user record ID by email
async function getUserRecordId(email) {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/${BASE_ID}/Users?filterByFormula={Email Address}='${email}'`,
      { headers: AIRTABLE_HEADERS }
    );

    const records = response.data.records;
    if (records.length > 0) {
      return records[0].id;
    } else {
      console.warn("❌ No matching user found in Airtable for email:", email);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching user from Airtable:", error.message);
    return null;
  }
}

// Log chat interaction to Airtable
async function logChatInteraction({ email, userRecordId, topic = "Other", message, aiResponse }) {
  try {
    const now = new Date();
    const name = `Chat – ${now.toLocaleString("en-GB", { timeZone: "Europe/London" })}`;

    const payload = {
      records: [
        {
          fields: {
            Name: name,
            User: [userRecordId],
            Topic: topic,
            Message: message,
            "AI Response": aiResponse,
          },
        },
      ],
    };

    await axios.post(
      `https://api.airtable.com/v0/${BASE_ID}/${CHAT_INTERACTIONS_TABLE_ID}`,
      payload,
      { headers: AIRTABLE_HEADERS }
    );

    console.log("✅ Chat interaction logged to Airtable");
  } catch (error) {
    console.error("⚠️ Could not log chat interaction:", error.message);
  }
}

// Placeholder function for asking OpenAI (replace with actual logic)
async function askOpenAI(message, userContext) {
  // This is a placeholder - replace with actual OpenAI call and context
  return `Echo: ${message}`;
}

// Main route for the AI coach
router.post("/api/ask-coach", async (req, res) => {
  const { email, question } = req.body;
  if (!email || !question) {
    return res.status(400).json({ error: "Missing email or question" });
  }

  try {
    const userRecordId = await getUserRecordId(email);
    if (!userRecordId) {
      return res.status(404).json({ error: "User not found in Airtable" });
    }

    const aiResponse = await askOpenAI(question, { email, userRecordId });

    // Log chat interaction
    await logChatInteraction({
      email,
      userRecordId,
      topic: "Nutrition", // Change logic later if dynamic
      message: question,
      aiResponse: aiResponse,
    });

    return res.json({ response: aiResponse });
  } catch (error) {
    console.error("❌ AI Coach error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
