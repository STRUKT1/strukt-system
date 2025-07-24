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
    Name: "fldzprSqEbdujTe0a",
    Date: "fldzVeaYTUHMxMDd9",
    WorkoutType: "fld9xRDtOz1mBkDQ5",
    Description: "fldKkhKomMg3Cf108",
    Duration: "fldaij5HlQKv8gMcT",
    CaloriesBurned: "fld2muGFVrfM0xHmI",
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
    SleepDuration: "fldt7AKiAq2qfHs89",
    SleepQuality: "fldfdd8WYqyWx6Ckc",
    Bedtime: "fldu544VmBsGIvEuw",
    WakeTime: "fld43mo9Z09vYzoGb",
    Notes: "fldzLiz85up5WqPAq"
  },
  mood: {
    User: "flddOxxse2QJe6DMk",
    Date: "fldKVcXqCXvabybIb",
    MoodRating: "fldUpnuuJRYIBy4mL",
    MoodNotes: "fldFMbuWMrBlhScua",
    EnergyLevel: "fld6isxdyHYfjqsQM",
    StressLevel: "fldmLOpTwpzUc0F4Y"
  },
  reflections: {
    User: "fldub69oCFo7ruloF",
    Date: "fldZibMunrMSu8iRC",
    WentWell: "fldYpH7CM04KeDuT4",
    Challenges: "fldMeD609rZU7w8pI",
    Tomorrow: "fldmDUQ8fkYCYwCUG",
    Highlight: "fldmfnusmD5b4C6Dn"
  }
};

async function findUserIdByEmail(email) {
  const res = await axios.get(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.users}\`, {
    headers: { Authorization: \`Bearer \${AIRTABLE_API_KEY}\` },
    params: { filterByFormula: \`{Email Address} = '\${email}'\` }
  });
  return res.data.records[0]?.id || null;
}

async function logChatInteraction(email, topic, message, aiReply) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.chat}\`, {
      fields: {
        [FIELD_IDS.chat.Name]: \`Chat – \${new Date().toLocaleString()}\`,
        [FIELD_IDS.chat.User]: [userId],
        [FIELD_IDS.chat.Message]: message,
        [FIELD_IDS.chat.AI_Response]: aiReply,
        [FIELD_IDS.chat.Topic]: topic || "Other"
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Chat log failed", err?.response?.data || err.message);
  }
}

async function logMeal(email, meal) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.meals}\`, {
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
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Meal log failed", err?.response?.data || err.message);
  }
}

async function logWorkout(email, workout) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.workouts}\`, {
      fields: {
        [FIELD_IDS.workouts.User]: [userId],
        [FIELD_IDS.workouts.Name]: workout.name,
        [FIELD_IDS.workouts.Date]: workout.date,
        [FIELD_IDS.workouts.WorkoutType]: workout.workoutType,
        [FIELD_IDS.workouts.Description]: workout.description,
        [FIELD_IDS.workouts.Duration]: workout.duration,
        [FIELD_IDS.workouts.CaloriesBurned]: workout.caloriesBurned,
        [FIELD_IDS.workouts.Notes]: workout.notes
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Workout log failed", err?.response?.data || err.message);
  }
}

async function logSupplement(email, supplement) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.supplements}\`, {
      fields: {
        [FIELD_IDS.supplements.User]: [userId],
        [FIELD_IDS.supplements.Date]: supplement.date,
        [FIELD_IDS.supplements.Time]: supplement.time,
        [FIELD_IDS.supplements.SupplementName]: supplement.name,
        [FIELD_IDS.supplements.Notes]: supplement.notes,
        [FIELD_IDS.supplements.LogType]: supplement.logType || "AI",
        [FIELD_IDS.supplements.Confirmed]: true
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Supplement log failed", err?.response?.data || err.message);
  }
}

async function logSleep(email, sleep) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.sleep}\`, {
      fields: {
        [FIELD_IDS.sleep.User]: [userId],
        [FIELD_IDS.sleep.Date]: sleep.date,
        [FIELD_IDS.sleep.SleepDuration]: sleep.duration,
        [FIELD_IDS.sleep.SleepQuality]: sleep.quality,
        [FIELD_IDS.sleep.Bedtime]: sleep.bedtime,
        [FIELD_IDS.sleep.WakeTime]: sleep.wakeTime,
        [FIELD_IDS.sleep.Notes]: sleep.notes
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Sleep log failed", err?.response?.data || err.message);
  }
}

async function logMood(email, mood) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.mood}\`, {
      fields: {
        [FIELD_IDS.mood.User]: [userId],
        [FIELD_IDS.mood.Date]: mood.date,
        [FIELD_IDS.mood.MoodRating]: mood.rating,
        [FIELD_IDS.mood.MoodNotes]: mood.notes,
        [FIELD_IDS.mood.EnergyLevel]: mood.energy,
        [FIELD_IDS.mood.StressLevel]: mood.stress
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Mood log failed", err?.response?.data || err.message);
  }
}

async function logReflection(email, reflection) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${TABLE_IDS.reflections}\`, {
      fields: {
        [FIELD_IDS.reflections.User]: [userId],
        [FIELD_IDS.reflections.Date]: reflection.date,
        [FIELD_IDS.reflections.WentWell]: reflection.wentWell,
        [FIELD_IDS.reflections.Challenges]: reflection.challenges,
        [FIELD_IDS.reflections.Tomorrow]: reflection.tomorrow,
        [FIELD_IDS.reflections.Highlight]: reflection.highlight
      }
    }, {
      headers: {
        Authorization: \`Bearer \${AIRTABLE_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Reflection log failed", err?.response?.data || err.message);
  }
}

module.exports = {
  logChatInteraction,
  logMeal,
  logWorkout,
  logSupplement,
  logSleep,
  logMood,
  logReflection
};
