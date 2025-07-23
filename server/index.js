import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('STRUKT Server is live 💪');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  try {
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE = process.env.AIRTABLE_USER_TABLE_ID;
    const INTERACTIONS_TABLE = 'tblDtOOmahkMYEqmy';

    const MEALS_TABLE = 'tblDqdqBixZ7X1W6f';
    const WORKOUTS_TABLE = 'tbljLbzmP1bHf4DOL';
    const SUPPLEMENTS_TABLE = 'tbl89kPJUc1IMg9Yu';
    const SLEEP_TABLE = 'tblLfajkFi6exqZxU';
    const MOOD_TABLE = 'tblsRLFVJLy3JjSZX';
    const REFLECTIONS_TABLE = 'tbl0YHy7ZLLkIBK6J';

    const userRes = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${USERS_TABLE}?filterByFormula={Email Address}='${email}'`,
      {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      }
    );

    const user = userRes.data.records?.[0];
    if (!user) throw new Error('❌ No user found');

    const f = user.fields;

    const context = `
Name: ${f['Full Name'] || 'Not set'}
Pronouns: ${f['Pronouns'] || 'Not set'}
Gender Identity: ${f['Gender Identity'] || 'Not set'}
Main Goal(s): ${f['Main Goal']?.join(', ') || 'Not set'}
Workout Preferences: ${f['Workout Preferences']?.join(', ') || 'Not set'}
Equipment Access: ${f['Equipment Access'] || 'Not set'}
Injuries / Limitations: ${f['Do you have any injuries or movement limitations we should be aware of?'] || 'None noted'}
Nutrition Style: ${f['Current Nutrition Style']?.join(', ') || 'Not set'}
Allergies: ${f['Allergies & Food Intolerances'] || 'None listed'}
Preferred Tone: ${f['Preferred Coaching Tone']?.join(', ') || 'Default'}
Vision of Success: ${f['Vision of Success'] || ''}
`;

    const systemPrompt = `
You are the STRUKT Coach — a warm, smart, structured fitness and mindset AI.

Use inclusive, supportive tone. Speak like a top-tier coach: clear, focused, practical, non-judgmental.

Use emojis where helpful: 
✅ confirmation, 💡 tips, 📊 insights, 💬 prompts, 🏋️ workouts, 🍽️ meals, 🧠 mindset, 🌙 sleep, 🔁 tracking.

User Context:
${context}

Give the best possible reply to this question:
“${question}”
`;

    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const response = aiRes.data.choices[0]?.message?.content || 'No response generated.';

    // Step 1: Log interaction
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTERACTIONS_TABLE}`,
        {
          records: [
            {
              fields: {
                Name: `Chat – ${new Date().toLocaleString()}`,
                User: [user.id],
                'User Email': [f['Email Address']],
                Topic: detectTopic(question),
                Message: question,
                'AI Response': response,
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Chat logged for ${email}`);
    } catch (err) {
      console.warn('⚠️ Could not log chat interaction:', err.message);
    }

    // Step 2: Auto-log to other tables
    const tasks = [
      { table: MEALS_TABLE, topic: 'Nutrition' },
      { table: WORKOUTS_TABLE, topic: 'Workout' },
      { table: SUPPLEMENTS_TABLE, topic: 'Supplement' },
      { table: SLEEP_TABLE, topic: 'Sleep' },
      { table: MOOD_TABLE, topic: 'Mood' },
      { table: REFLECTIONS_TABLE, topic: 'Reflection' },
    ];

    const matched = tasks.find(t => detectTopic(question) === t.topic);
    if (matched) {
      try {
        await axios.post(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${matched.table}`,
          {
            records: [
              {
                fields: {
                  Name: `AI Log – ${new Date().toLocaleString()}`,
                  User: [user.id],
                  'User Email': [f['Email Address']],
                  Notes: response,
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Auto-logged to ${matched.topic} for ${email}`);
      } catch (logErr) {
        console.warn('⚠️ Auto-log failed:', logErr.message);
      }
    }

    res.json({ success: true, email, response });
  } catch (err) {
    console.error('🔥 ERROR:', err.message);
    res.json({
      success: false,
      email,
      response: 'Sorry, something went wrong. Please try again later.',
    });
  }
});

function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise')) return 'Workout';
  if (t.includes('supplement') || t.includes('vitamin')) return 'Supplement';
  if (t.includes('sleep') || t.includes('bed') || t.includes('rest')) return 'Sleep';
  if (t.includes('mood') || t.includes('feel') || t.includes('emotion')) return 'Mood';
  if (t.includes('reflect') || t.includes('journal') || t.includes('review')) return 'Reflection';
  return 'Other';
}

app.listen(PORT, () => console.log(`🚀 STRUKT Server running on ${PORT}`));
