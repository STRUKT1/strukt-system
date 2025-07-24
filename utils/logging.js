const axios = require("axios");

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// ✅ Table IDs
const TABLE_IDS = {
  users: "Users",
  chat: "tblDtOOmahkMYEqmy",
  meals: "tblWLkTKkxkSEcySD",
  workouts: "tblgqvIqFetN2s23J",
  supplements: "tblZ8F0Z8ZcMDYdej",
  sleep: "tblFepeTBkng3zDSY",
  mood: "tbltkNq7OSUcu4Xpp",
  reflections: "tblDrFwiJTYGjOfEv"
};

// ✅ Field IDs
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
    User: "fldUuYZtmkiycOVnb",
    Date: "fldzVeaYTUHMxMDd9",
    Type: "fld9xRDtOz1mBkDQ5",
    Description: "fldKkhKomMg3Cf108",
    Duration: "fldaij5HlQKv8gMcT",
    Calories: "fld2muGFVrfM0xHmI",
    Notes: "fld1aEpGu5H8DWPxY"
  },
  supplements: {
    User: "fldzShNTWJornIZnP",
    Date: "fldQfsrapotczQaCY",
    Time: "fldSherUQZmn2ts73",
    SupplementName: "fldad6mLDsXYMks5A",
    Notes: "fldEoF1lbZoj3wPhO",
    LogType: "fldzGOKvw0IF0Rbmn",
    Confirmed: "fldiqJbsxO4yx4JvB"
  },
  sleep: {
    User: "fldabdr3bNgGqBawm",
    Date: "fldTvCL5QQ9g7fXfw",
    Duration: "fldt7AKiAq2qfHs89",
    Quality: "fldfdd8WYqyWx6Ckc",
    Bedtime: "fldu544VmBsGIvEuw",
    WakeTime: "fld43mo9Z09vYzoGb",
    Notes: "fldzLiz85up5WqPAq"
  },
  mood: {
    User: "flddOxxse2QJe6DMk",
    Date: "fldKVcXqCXvabybIb",
    Mood: "fldUpnuuJRYIBy4mL",
    Notes: "fldFMbuWMrBlhScua",
    Energy: "fld6isxdyHYfjqsQM",
    Stress: "fldmLOpTwpzUc0F4Y"
  },
  reflections: {
    User: "fldub69oCFo7ruloF",
    Date: "fldZibMunrMSu8iRC",
    WentWell: "fldYpH7CM04KeDuT4",
    Challenge: "fldMeD609rZU7w8pI",
    Tomorrow: "fldmDUQ8fkYCYwCUG",
    Highlight: "fldmfnusmD5b4C6Dn"
  }
};

// ✅ Find User ID
async function findUserIdByEmail(email) {
  const url =
    "https://api.airtable.com/v0/" +
    AIRTABLE_BASE_ID +
    "/" +
    TABLE_IDS.users;
  const res = await axios.get(url, {
    headers: { Authorization: "Bearer " + AIRTABLE_API_KEY },
    params: { filterByFormula: "{Email Address} = '" + email + "'" }
  });
  return res.data.records[0]?.id || null;
}

// ✅ Log Chat
async function logChatInteraction(email, topic, message, aiReply) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.chat}`,
      {
        fields: {
          [FIELD_IDS.chat.Name]: `Chat – ${new Date().toLocaleString()}`,
          [FIELD_IDS.chat.User]: [userId],
          [FIELD_IDS.chat.Message]: message,
          [FIELD_IDS.chat.AI_Response]: aiReply,
          [FIELD_IDS.chat.Topic]: topic || "Other"
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
  } catch (err) {
    console.error("❌ Chat logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Meal
async function logMeal(email, meal) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.meals}`,
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Meal logged for ${email}`);
  } catch (err) {
    console.error("❌ Meal logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Workout
async function logWorkout(email, workout) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.workouts}`,
      {
        fields: {
          [FIELD_IDS.workouts.User]: [userId],
          [FIELD_IDS.workouts.Date]: workout.date,
          [FIELD_IDS.workouts.Type]: workout.type,
          [FIELD_IDS.workouts.Description]: workout.description,
          [FIELD_IDS.workouts.Duration]: workout.duration,
          [FIELD_IDS.workouts.Calories]: workout.calories,
          [FIELD_IDS.workouts.Notes]: workout.notes
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Workout logged for ${email}`);
  } catch (err) {
    console.error("❌ Workout logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Supplement
async function logSupplement(email, supplement) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.supplements}`,
      {
        fields: {
          [FIELD_IDS.supplements.User]: [userId],
          [FIELD_IDS.supplements.Date]: supplement.date,
          [FIELD_IDS.supplements.Time]: supplement.time,
          [FIELD_IDS.supplements.SupplementName]: supplement.name,
          [FIELD_IDS.supplements.Notes]: supplement.notes,
          [FIELD_IDS.supplements.LogType]: supplement.logType || "AI",
          [FIELD_IDS.supplements.Confirmed]: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Supplement logged for ${email}`);
  } catch (err) {
    console.error("❌ Supplement logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Sleep
async function logSleep(email, sleep) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.sleep}`,
      {
        fields: {
          [FIELD_IDS.sleep.User]: [userId],
          [FIELD_IDS.sleep.Date]: sleep.date,
          [FIELD_IDS.sleep.Duration]: sleep.duration,
          [FIELD_IDS.sleep.Quality]: sleep.quality,
          [FIELD_IDS.sleep.Bedtime]: sleep.bedtime,
          [FIELD_IDS.sleep.WakeTime]: sleep.wakeTime,
          [FIELD_IDS.sleep.Notes]: sleep.notes
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Sleep logged for ${email}`);
  } catch (err) {
    console.error("❌ Sleep logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Mood
async function logMood(email, mood) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.mood}`,
      {
        fields: {
          [FIELD_IDS.mood.User]: [userId],
          [FIELD_IDS.mood.Date]: mood.date,
          [FIELD_IDS.mood.Mood]: mood.rating,
          [FIELD_IDS.mood.Notes]: mood.notes,
          [FIELD_IDS.mood.Energy]: mood.energy,
          [FIELD_IDS.mood.Stress]: mood.stress
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Mood logged for ${email}`);
  } catch (err) {
    console.error("❌ Mood logging failed", err?.response?.data || err.message);
  }
}

// ✅ Log Daily Reflection
async function logReflection(email, reflection) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.reflections}`,
      {
        fields: {
          [FIELD_IDS.reflections.User]: [userId],
          [FIELD_IDS.reflections.Date]: reflection.date,
          [FIELD_IDS.reflections.WentWell]: reflection.wentWell,
          [FIELD_IDS.reflections.Challenge]: reflection.challenge,
          [FIELD_IDS.reflections.Tomorrow]: reflection.tomorrow,
          [FIELD_IDS.reflections.Highlight]: reflection.highlight
        }
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Reflection logged for ${email}`);
  } catch (err) {
    console.error("❌ Reflection logging failed", err?.response?.data || err.message);
  }
}

// ✅ Export All
module.exports = {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
};
