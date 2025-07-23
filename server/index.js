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

    // Lookup Airtable user
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
You are the STRUKT Coach — a smart, warm, structured AI assistant.

Use HTML formatting (bold, italics, line breaks) and emoji to make responses helpful and clear.

Respond to this question using the user's context:

${context}

User's message:
“${question}”

Give a practical, focused reply using the best tone and advice based on their data.
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

    // ✅ Step 1: Log to Chat Interactions
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTERACTIONS_TABLE}`,
        {
          records: [
            {
              fields: {
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
    } catch (logErr) {
      console.warn('⚠️ Could not log chat interaction:', logErr.message);
    }

    // ✅ Step 2: Try Auto-Logging if applicable
    try {
      await autoLogIfMatch(email, question, AIRTABLE_BASE, f['Email Address']);
    } catch (autoErr) {
      console.warn('⚠️ Auto-log failed:', autoErr.message);
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

// Topic detection
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('breakfast') || t.includes('lunch') || t.includes('dinner')) return 'Nutrition';
  if (t.includes('workout') || t.includes('exercise') || t.includes('gym')) return 'Workout';
  if (t.includes('sleep') || t.includes('bed') || t.includes('nap')) return 'Sleep';
  if (t.includes('supplement') || t.includes('magnesium') || t.includes('vitamin')) return 'Supplement';
  if (t.includes('mood') || t.includes('feeling') || t.includes('stress')) return 'Mood';
  if (t.includes('reflect') || t.includes('journal') || t.includes('thought')) return 'Daily Reflection';
  return 'Other';
}

// Auto-log to correct table based on topic
async function autoLogIfMatch(email, message, base, emailValue) {
  const topic = detectTopic(message);
  const now = new Date().toISOString().split('T')[0];

  const tables = {
    Nutrition: {
      table: 'Meals',
      fields: { Date: now, 'Meal Description': message, 'Email Address': emailValue },
    },
    Workout: {
      table: 'Workouts',
      fields: { Date: now, 'Workout Description': message, 'Email Address': emailValue },
    },
    Sleep: {
      table: 'Sleep Log',
      fields: { Date: now, Notes: message, 'Email Address': emailValue },
    },
    Supplement: {
      table: 'Supplements',
      fields: { Date: now, 'Supplement Notes': message, 'Email Address': emailValue },
    },
    Mood: {
      table: 'Mood Logs',
      fields: { Date: now, Mood: message, 'Email Address': emailValue },
    },
    'Daily Reflection': {
      table: 'Daily Reflections',
      fields: { Date: now, Notes: message, 'Email Address': emailValue },
    },
  };

  if (!tables[topic]) return;

  await axios.post(
    `https://api.airtable.com/v0/${base}/${tables[topic].table}`,
    {
      records: [{ fields: tables[topic].fields }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log(`🧠 Auto-logged ${topic} for ${email}`);
}

app.listen(PORT, () => console.log(`🚀 STRUKT Server running on ${PORT}`));
