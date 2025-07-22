import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('STRUKT Server is live and ready 💪🏼');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question, topic = "Other" } = req.body;

  try {
    console.log(`🔍 Fetching user data for ${email}...`);

    // Airtable: Fetch user info
    const airtableUserRes = await axios.get(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_USER_TABLE_ID}?filterByFormula={Email Address}='${email}'`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
      }
    );

    const userRecords = airtableUserRes.data.records;
    if (userRecords.length === 0) throw new Error('❌ No user found.');

    const user = userRecords[0].fields;
    const userId = userRecords[0].id;

    // Build STRUKT coaching context
    const context = `
Name: ${user['Full Name'] || 'User'}
Pronouns: ${user['Pronouns'] || 'Not specified'}
Goal(s): ${Array.isArray(user['Main Goal']) ? user['Main Goal'].join(', ') : user['Main Goal'] || 'Not specified'}
Body Type: ${user['Body Type'] || 'Not specified'}
Workout Style: ${user['Workout Preferences'] || 'Not specified'}
Equipment Access: ${user['Equipment Access'] || 'Not specified'}
Medical: ${user['Medical Considerations'] || 'None'}
Injuries: ${user['Do you have any injuries or movement limitations we should be aware of?'] || 'None'}
Diet Style: ${user['Current Nutrition Style'] || 'Not specified'}
Allergies: ${user['Allergies & Food Intolerances'] || 'None'}
Sleep: ${user['Typical Sleep Duration (hrs)'] || 'Not specified'}, Quality: ${user['Sleep Quality'] || 'Not specified'}
Tone Preference: ${Array.isArray(user['Preferred Coaching Tone']) ? user['Preferred Coaching Tone'].join(', ') : user['Preferred Coaching Tone'] || 'Supportive'}

Vision of Success: ${user['Vision of Success'] || 'N/A'}
Anything else they want us to know: ${user["Anything else you'd like us to know?"] || 'None'}
    `.trim();

    // STRUKT Coach Prompt
    const systemPrompt = `
You are the official STRUKT Coach 🧠💪🏼 — a friendly, expert, inclusive AI assistant.

Use the following user context to guide your tone and suggestions:
${context}

🧠 Your response must:
- Match the user's coaching tone preferences
- Use helpful formatting (e.g., **bold**, line breaks)
- Add emojis to guide readability (✅, 🍽️, 🏋️‍♂️, 🌙, 💬)
- Be warm, professional, and supportive — not robotic or vague
- Avoid repeating the question
- Keep it efficient, no filler — structure your response clearly

---

Now answer this question:

"${question}"
`;

    // OpenAI call
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
        ],
        temperature: 0.7,
        max_tokens: 700,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiReply = aiRes.data.choices[0].message.content;

    // 🔄 Log Chat to Airtable (Chat Interactions)
    try {
      await axios.post(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/tblDtOOmahkMYEqmy`,
        {
          records: [
            {
              fields: {
                Name: `Chat – ${new Date().toLocaleString()}`,
                User: [userId],
                Topic: topic,
                Message: question,
                "AI Response": aiReply,
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
      console.log('📥 Chat interaction logged');
    } catch (logErr) {
      console.warn('⚠️ Chat logging failed:', logErr.message);
    }

    // Respond to frontend
    res.json({
      success: true,
      email,
      question,
      response: aiReply,
    });

  } catch (err) {
    console.error('🔥 Error:', err.message);
    res.json({
      success: false,
      response: `⚠️ Sorry, something went wrong. Please try again later.`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ STRUKT server running on port ${PORT}`);
});
