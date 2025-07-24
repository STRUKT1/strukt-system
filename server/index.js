const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// ✅ Load STRUKT AI prompt from file
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "../utils/prompts/strukt-system-prompt.txt"),
  "utf-8"
);

// ✅ Airtable Config
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// ✅ Table IDs
const CHAT_TABLE_ID = "tblDtOOmahkMYEqmy";
const MEALS_TABLE_ID = "tblWLkTKkxkSEcySD";

// ✅ Field IDs - Chat
const CHAT_FIELDS = {
  Name: "fldcHOwNiQlFpwuly",
  User: "fldDtbxnE1PyTleqo",
  Message: "fldgNRKet3scJ8PIe",
  AI_Response: "fld3vU9nKXNmu6OZV",
  Topic: "fld2eLzWRUnKNR7Im"
};

// ✅ Field IDs - Meals
const MEAL_FIELDS = {
  User: "fldaTFIo8vKLoQYhS",
  Description: "fldLJXOsnTDqfp9mJ",
  Calories: "fldUOPuN6n39Aj1v7",
  Protein: "fldbqKkHfEqmStvbn",
  Carbs: "fld8EvDjPVmY5vfhR",
  Fats: "fldLnl83bsw9ZSCka",
  MealType: "fldoN35qBpJ2y7OFS",
  MealSource: "fld5DuMMbBBnYbCnS"
};

app.post("/log", async (req, res) => {
  const { email, topic, message, coachReply, logType, meal } = req.body;

  try {
    // ✅ 1. Find User Record
    const userRes = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
        params: { filterByFormula: `{Email Address} = '${email}'` }
      }
    );

    const userRecord = userRes.data.records[0];
    if (!userRecord) {
      console.error("❌ No user found for:", email);
      return res.status(404).send("User not found");
    }
    const userId = userRecord.id;

    // ✅ 2. Log Chat Interaction
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CHAT_TABLE_ID}`,
      {
        fields: {
          [CHAT_FIELDS.Name]: `Chat – ${new Date().toLocaleString()}`,
          [CHAT_FIELDS.User]: [userId],
          [CHAT_FIELDS.Message]: message,
          [CHAT_FIELDS.AI_Response]: coachReply,
          [CHAT_FIELDS.Topic]: topic || "Other"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`✅ Chat logged for ${email}`);

    // ✅ 3. Log Meal (if applicable)
    if (logType === "meal" && meal) {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${MEALS_TABLE_ID}`,
        {
          fields: {
            [MEAL_FIELDS.User]: [userId],
            [MEAL_FIELDS.Description]: meal.description,
            [MEAL_FIELDS.Calories]: meal.calories,
            [MEAL_FIELDS.Protein]: meal.protein,
            [MEAL_FIELDS.Carbs]: meal.carbs,
            [MEAL_FIELDS.Fats]: meal.fats,
            [MEAL_FIELDS.MealType]: meal.mealType,
            [MEAL_FIELDS.MealSource]: meal.mealSource || "AI-Estimated"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log(`✅ Meal logged for ${email}`);
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
