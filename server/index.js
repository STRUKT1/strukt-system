const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// Airtable Table IDs
const CHAT_TABLE_ID = "tblDtOOmahkMYEqmy";
const MEALS_TABLE_ID = "tblWLkTKkxkSEcySD";

// Airtable Field IDs for Chat Interactions
const CHAT_FIELDS = {
  Name: "fldcHOwNiQlFpwuly",
  User: "fldDtbxnE1PyTleqo",
  Message: "fldgNRKet3scJ8PIe",
  AI_Response: "fld3vU9nKXNmu6OZV",
  Topic: "fld2eLzWRUnKNR7Im"
};

// Airtable Field IDs for Meals
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
    // Fetch user record ID by email
    const userRes = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        },
        params: {
          filterByFormula: `{Email Address} = '${email}'`
        }
      }
    );

    const userRecord = userRes.data.records[0];
    if (!userRecord) {
      console.error("❌ No user found with email:", email);
      return res.status(404).send("User not found");
    }
    const userId = userRecord.id;

    // Log chat interaction
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

    console.log(`✅ Interaction logged for ${email}`);

    // Log meal if provided
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

    res.status(200).send("Log successful");
  } catch (error) {
    console.error("🔥 Logging error:", error.response?.data || error.message);
    res.status(500).send("Logging failed");
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
