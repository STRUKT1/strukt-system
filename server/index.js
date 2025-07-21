import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_USER_TABLE_ID = process.env.AIRTABLE_USER_TABLE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const getUserDataFromAirtable = async (email) => {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USER_TABLE_ID}`;
    const headers = {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    };

    const response = await axios.get(url, {
      headers,
      params: {
        filterByFormula: `LOWER({Email Address}) = "${email.toLowerCase()}"`,
      },
    });

    const record = response.data.records[0];
    return record?.fields || null;
  } catch (error) {
    console.error('❌ Error fetching Airtable data:', error.message);
    return null;
  }
};

const buildCoachingContext = (user) => {
  if (!user) return 'No onboarding data found for this user.';

  const contextFields = {
    "Full Name": "Full Name",
    "Pronouns": "Pronouns",
    "Gender Identity": "Gender Identity",
    "Gender (Self-Described)": "Gender Identity (Self-Described)",
    "Body Type": "Body Type",
    "Main Goal": "Main Goal",
    "Activity Level": "Activity Level",
    "Workout Preferences": "What type of workouts do you enjoy or want to try?",
    "Equipment Access": "What equipment do you have access to?",
    "Workout Location": "Where do you usually work out?",
    "Training Time Available": "How much time do you realistically have for training each week?",
    "Injuries / Limitations": "Do you have any injuries or movement limitations we should be aware of?",
    "Supplement Use": "Currently taking supplements?",
    "Supplements List": "If yes, please list your current supplements.",
    "Sleep Duration": "Typical Sleep Duration (hrs)",
    "Sleep Quality": "Sleep Quality",
    "Bedtime": "Usual Bedtime",
    "Wake Time": "Usual Wake Time",
    "Sleep Challenges": "Sleep Challenges (optional)",
    "Nutrition Style": "Current Nutrition Style",
    "Nutrition Challenges": "Current Challenges with Nutrition",
    "Nutrition Goals": "Nutrition Goals",
    "Allergies": "Allergies & Food Intolerances",
    "Medical Considerations": "Medical Considerations",
    "Religion / Faith": "Religion / Faith",
    "Cultural Food Notes": "Any cultural/religious influences on food?",
    "Accessibility Needs": "Accessibility or Support Needs",
    "Daily Routine": "Daily Routine",
    "Work Schedule": "Work Schedule / Commitments",
    "Preferred Coaching Tone": "Preferred Coaching Tone",
    "Vision of Success": "Vision of Success"
  };

  return Object.entries(contextFields)
    .map(([key, label]) => (user[key] ? `- **${label}**: ${user[key]}` : null))
    .filter(Boolean)
    .join('\n');
};

const generateOpenAIResponse = async (context, question) => {
  try {
    const prompt = `
You are the official STRUKT Coach: a friendly, professional, inclusive AI assistant that gives clear, goal-driven support based on a member’s onboarding answers and real-time logs (meals, workouts, weight, sleep, supplements, mood, etc).

STRUKT is a subscription-based coaching system that supports fat loss, muscle gain, health improvements, and mindset shifts.

You should act like a world-leading expert coach, not a chatbot — using encouragement, structure, and smart logic to make the journey easier for the user.

❌ DO NOT guess. You pull member data from Airtable via Zapier (goals, body type, training style, injuries, preferences, etc.) and offer guidance based on that.

You can generate:
- Custom meal ideas
- Training plans
- Supplement suggestions
- Mindset advice
- Progress insights using logged data

---

🧠 MEMBER CONTEXT:
${context}

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

---

Now answer this user question:

**${question}**
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    return "I'm having trouble generating a response right now. Please try again later.";
  }
};

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  if (!email || !question) {
    return res.status(400).json({ success: false, error: 'Missing email or question.' });
  }

  const user = await getUserDataFromAirtable(email);
  const context = buildCoachingContext(user);
  const aiReply = await generateOpenAIResponse(context, question);

  res.json({
    success: true,
    email,
    question,
    response: aiReply,
  });
});

app.get('/', (req, res) => {
  res.send('🚀 STRUKT Server is alive and ready!');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
