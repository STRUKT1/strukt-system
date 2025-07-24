const axios = require("axios");

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// Table IDs
const TABLE_IDS = {
  users: "Users",
  chat: "tblDtOOmahkMYEqmy",
  meals: "tblWLkTKkxkSEcySD",
  workouts: "tblZqXq1Jh5nZm6SK",
  supplements: "tblkmQIT3KpvJhX2y",
  sleep: "tblUbU7kXJ9Gv9M2J",
  mood: "tbluLcu1kUgwPR4ne",
  reflections: "tblM8CcF2t1IEA7bm"
};

// Field IDs (minimal version – use field names where safe)
const FIELD_IDS = {
  chat: {
    Name: "fldcHOwNiQlFpwuly",
    User: "fldDtbxnE1PyTleqo",
    Message: "fldgNRKet3scJ8PIe",
    AI_Response: "fld3vU9nKXNmu6OZV",
    Topic: "fld2eLzWRUnKNR7Im"
  },
  meals: {
    User: "fldaTFIo8vKLoQYhS",
    Description: "fldLJXOsnTDqfp9mJ",
    Calories: "fldUOPuN6n39Aj1v7",
    Protein: "fldbqKkHfEqmStvbn",
    Carbs: "fld8EvDjPVmY5vfhR",
    Fats: "fldLnl83bsw9ZSCka",
    MealType: "fldoN35qBpJ2y7OFS",
    MealSource: "fld5DuMMbBBnYbCnS"
  },
  workouts: {
    User: "fldabcd123ExampleUser",
    Type: "fldabcd123Type",
    Duration: "fldabcd123Duration",
    Notes: "fldabcd123Notes"
  },
  supplements: {
    User: "fld123SupUser",
    SupplementName: "fld123Name",
    Dosage: "fld123Dosage",
    Time: "fld123Time"
  },
  sleep: {
    User: "fld123SleepUser",
    Duration: "fld123Duration",
    Quality: "fld123Quality",
    Bedtime: "fld123Bedtime",
    WakeTime: "fld123WakeTime",
    Notes: "fld123SleepNotes"
  },
  mood: {
    User: "fld123MoodUser",
    Mood: "fld123MoodScore",
    Notes: "fld123MoodNotes"
  },
  reflections: {
    User: "fld123RefUser",
    Prompt: "fld123Prompt",
    Response: "fld123Response"
  }
};

async function findUserIdByEmail(email) {
  const res = await axios.get(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.users}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    params: { filterByFormula: `{Email Address} = '${email}'` }
  });

  return res.data.records[0]?.id || null;
}

async function logChatInteraction(email, topic, message, aiReply) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.chat}`, {
      fields: {
        [FIELD_IDS.chat.Name]: `Chat – ${new Date().toLocaleString()}`,
        [FIELD_IDS.chat.User]: [userId],
        [FIELD_IDS.chat.Message]: message,
        [FIELD_IDS.chat.AI_Response]: aiReply,
        [FIELD_IDS.chat.Topic]: topic || "Other"
      }
    }, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`✅ Chat logged for ${email}`);
  } catch (err) {
    console.error("❌ Chat logging failed", err?.response?.data || err.message);
  }
}

async function logMeal(email, meal) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.meals}`, {
      fields: {
        [FIELD_IDS.meals.User]: [userId],
        [FIELD_IDS.meals.Description]: meal.description,
        [FIELD_IDS.meals.Calories]: meal.calories,
        [FIELD_IDS.meals.Protein]: meal.protein,
        [FIELD_IDS.meals.Carbs]: meal.carbs,
        [FIELD_IDS.meals.Fats]: meal.fats,
        [FIELD_IDS.meals.MealType]: meal.mealType,
        [FIELD_IDS.meals.MealSource]: meal.mealSource || "AI-Estimated"
      }
    }, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`✅ Meal logged for ${email}`);
  } catch (err) {
    console.error("❌ Meal logging failed", err?.response?.data || err.message);
  }
}

// Add similar stubs for other log types here (you can fill them out later)
async function logWorkout(email, workout) { /* TODO */ }
async function logSupplement(email, supplement) { /* TODO */ }
async function logSleep(email, sleep) { /* TODO */ }
async function logMood(email, mood) { /* TODO */ }
async function logReflection(email, reflection) { /* TODO */ }

module.exports = {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
};
