import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('STRUKT Server is alive and ready 🚀');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  try {
    console.log(`🔍 Looking up Airtable data for: ${email}`);

    // Airtable API fetch
    const airtableResponse = await axios.get(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_USER_TABLE_ID}?filterByFormula={Email Address}='${email}'`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
      }
    );

    const records = airtableResponse.data.records;
    if (records.length === 0) {
      throw new Error(`❌ No user found in Airtable for email: ${email}`);
    }

    const user = records[0].fields;
    console.log(`✅ User found: ${user['Full Name'] || 'Unnamed'}`);

    // Build coaching context
    const coachingContext = `
Name: ${user['Full Name'] || ''}
Pronouns: ${user['Pronouns'] || ''}
Gender: ${user['Gender Identity'] || ''}
Goal: ${user['Main Goal'] || ''}
Workout Prefs: ${user['Workout Preferences'] || ''}
Equipment: ${user['Equipment Access'] || ''}
Injuries: ${user['Injuries / Limitations'] || ''}
Nutrition Style: ${user['Nutrition Style'] || ''}
Tone: ${user['Preferred Coaching Tone'] || ''}
...and more.
    `;

    // Send to OpenAI
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `
You are the official STRUKT Coach: a friendly, expert AI trainer.

Use the following user context to generate a smart, structured answer:

${coachingContext}

Answer the question: ${question}
`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiMessage = openaiResponse.data.choices[0].message.content;

    res.json({
      success: true,
      email,
      question,
      response: aiMessage,
    });
  } catch (error) {
    console.error('🔥 ERROR:', error.message);
    res.json({
      success: true,
      email,
      question,
      response: `I'm having trouble generating a response right now. Please try again later.`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
