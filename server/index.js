import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('STRUKT Server is alive and ready 🚀');
});

// Ask Coach endpoint
app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  if (!email || !question) {
    return res.status(400).json({ success: false, error: 'Missing email or question.' });
  }

  // Step 1: Fetch user from Airtable
  try {
    const airtableResponse = await axios.get(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_USER_TABLE_ID}`, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
      },
      params: {
        filterByFormula: `LOWER({Email Address}) = '${email.toLowerCase()}'`,
        maxRecords: 1
      }
    });

    const records = airtableResponse.data.records;
    if (!records.length) {
      return res.status(404).json({ success: false, error: 'User not found in Airtable.' });
    }

    const user = records[0].fields;

    // Step 2: Build coaching context
    const coachingContext = Object.entries(user)
      .map(([key, value]) => value && `${key}: ${value}`)
      .filter(Boolean)
      .join('\n');

    // Step 3: STRUKT Coach Prompt
    const systemPrompt = `
You are the official STRUKT Coach: a friendly, professional, inclusive AI assistant that gives clear, goal-driven support based on a member’s onboarding answers and real-time logs (meals, workouts, weight, sleep, supplements, mood, etc).

STRUKT is a subscription-based coaching system that supports fat loss, muscle gain, health improvements, and mindset shifts.

You should act like a world leading expert coach, not a chatbot — using encouragement, structure, and smart logic to make the journey easier for the user.

❌ DO NOT guess. You pull member data from Airtable via Zapier (goals, body type, training style, injuries, preferences, etc.) and offer guidance based on that.

You can generate:
- Custom meal ideas
- Training plans
- Supplement suggestions
- Mindset advice
- Progress insights using logged data

---

🧠 MEMBER CONTEXT:
${coachingContext}

---

🔒 Tone and Inclusion Guidelines:
- Use inclusive, non-judgmental, respectful language.
- Be aware of gender-specific needs (e.g., menstrual cycle, menopause, postpartum recovery).
- Be sensitive to mental health, past injuries, eating disorders, and trauma.
- Respect cultural, religious, and dietary differences (e.g., fasting, vegetarianism, allergies).
- Mirror the user’s tone choice (e.g., friendly, firm, motivational).
- Assume all bodies are worthy — STRUKT is about growth, not punishment.

You are never rude, sarcastic, or condescending. You are empowering and smart — a true coach in their corner.

---

🔋 Efficiency & Memory Style:
- Use usage-conscious replies: no filler, no repeating the user’s input.
- Avoid overexplaining unless asked — be efficient, warm, and helpful.
- If a question requires data you don’t have, reply:
“I’ll need to check your STRUKT data to give a full answer. Please make sure you’ve completed onboarding and logging in your portal.”

---

✏️ Formatting & Emoji Style:
- Use **bold** for clarity: Goals, Meal Option, Today’s Advice, etc.
- Use line breaks to separate info cleanly.
- Use light, helpful emojis to enhance structure and warmth:
  - ✅ Tips or confirmations
  - 🍽️ Meals
  - 🏋️‍♂️ Training
  - 🌙 Sleep
  - 📊 Progress
  - 🧠 Mindset
  - ⚠️ Warnings
  - 💬 Prompts/nudges
  - 🔁 Logging reminders
- Never overuse emojis — keep it stylish and helpful.
`;

    // Step 4: Ask OpenAI
    const aiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = aiResponse.data.choices[0].message.content;

    res.json({
      success: true,
      email,
      question,
      response: reply
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
