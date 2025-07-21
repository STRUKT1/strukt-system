import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Health check route
app.get('/', (req, res) => {
  res.send('STRUKT Server is alive and ready 🚀');
});

// Build STRUKT AI prompt
const buildPrompt = (user, question) => {
  return `
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

- **Full Name**: ${user['Full Name'] || 'N/A'}
- **Pronouns**: ${user['Pronouns'] || 'N/A'}
- **Gender Identity**: ${user['Gender Identity'] || user['Gender Identity (Self-Described)'] || 'N/A'}
- **Body Type**: ${user['Body Type'] || 'N/A'}
- **Main Goal**: ${user['Main Goal'] || 'N/A'}
- **Activity Level**: ${user['Activity Level'] || 'N/A'}
- **Workout Preferences**: ${user['What type of workouts do you enjoy or want to try?'] || 'N/A'}
- **Equipment Access**: ${user['What equipment do you have access to?'] || 'N/A'}
- **Workout Location**: ${user['Where do you usually work out?'] || 'N/A'}
- **Training Time Available**: ${user['How much time do you realistically have for training each week?'] || 'N/A'}
- **Injuries / Limitations**: ${user['Do you have any injuries or movement limitations we should be aware of?'] || 'None'}
- **Supplement Use**: ${user['Currently taking supplements?'] || 'N/A'}
- **Supplements List**: ${user['If yes, please list your current supplements.'] || 'N/A'}
- **Sleep Duration**: ${user['Typical Sleep Duration (hrs)'] || 'N/A'}
- **Sleep Quality**: ${user['Sleep Quality'] || 'N/A'}
- **Bedtime**: ${user['Usual Bedtime'] || 'N/A'}
- **Wake Time**: ${user['Usual Wake Time'] || 'N/A'}
- **Sleep Challenges**: ${user['Sleep Challenges (optional)'] || 'N/A'}
- **Nutrition Style**: ${user['Current Nutrition Style'] || 'N/A'}
- **Nutrition Challenges**: ${user['Current Challenges with Nutrition'] || 'N/A'}
- **Nutrition Goals**: ${user['Nutrition Goals'] || 'N/A'}
- **Allergies**: ${user['Allergies & Food Intolerances'] || 'N/A'}
- **Medical Considerations**: ${user['Medical Considerations'] || 'N/A'}
- **Religion / Faith**: ${user['Religion / Faith'] || 'N/A'}
- **Cultural Food Notes**: ${user['Any cultural/religious influences on food?'] || 'N/A'}
- **Accessibility Needs**: ${user['Accessibility or Support Needs'] || 'N/A'}
- **Daily Routine**: ${user['Daily Routine'] || 'N/A'}
- **Work Schedule**: ${user['Work Schedule / Commitments'] || 'N/A'}
- **Preferred Coaching Tone**: ${user['Preferred Coaching Tone'] || 'Friendly'}
- **Vision of Success**: ${user['Vision of Success'] || 'N/A'}

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

💬 USER QUESTION:
"${question}"

🎯 YOUR TASK:
Reply like a world-class coach. Be specific, helpful, and uplifting. Reference their personal info if relevant. Always act in the user's best interest.
`.trim();
};

// POST /api/ask-coach
app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  // 🔁 TEMP MOCKED USER DATA (replace with Airtable lookup)
  const user = {
    "Full Name": "Therese",
    "Pronouns": "She/Her",
    "Gender Identity": "Female",
    "Gender Identity (Self-Described)": "",
    "Body Type": "Slim athletic",
    "Main Goal": "Fat loss & strength",
    "Activity Level": "Moderate",
    "What type of workouts do you enjoy or want to try?": "Home workouts and running",
    "What equipment do you have access to?": "Dumbbells, treadmill, resistance bands",
    "Where do you usually work out?": "At home",
    "How much time do you realistically have for training each week?": "3–4 hours",
    "Do you have any injuries or movement limitations we should be aware of?": "Postpartum pelvic floor healing",
    "Currently taking supplements?": "Yes",
    "If yes, please list your current supplements.": "Protein, iron, magnesium",
    "Typical Sleep Duration (hrs)": "6",
    "Sleep Quality": "Interrupted",
    "Usual Bedtime": "10:30pm",
    "Usual Wake Time": "6:30am",
    "Sleep Challenges (optional)": "Baby waking",
    "Current Nutrition Style": "Whole foods, 80/20 balance",
    "Current Challenges with Nutrition": "Snacking, energy crashes",
    "Nutrition Goals": "Balanced eating, fat loss",
    "Allergies & Food Intolerances": "Peanuts",
    "Medical Considerations": "Postpartum recovery",
    "Religion / Faith": "Christian",
    "Any cultural/religious influences on food?": "No pork",
    "Accessibility or Support Needs": "",
    "Daily Routine": "School runs, part-time work, parenting",
    "Work Schedule / Commitments": "Flexible hours",
    "Preferred Coaching Tone": "Motivational",
    "Vision of Success": "Feeling strong, energised, and proud"
  };

  const prompt = buildPrompt(user, question);

  // 🧠 Placeholder AI response (replace with OpenAI call)
  const fakeAIResponse = `Hi ${user['Full Name']}, based on your current goal and routine, I recommend a 25-minute strength circuit using dumbbells 💪, followed by a short run or walk. Stay hydrated, fuel with whole foods, and log your progress. You’re smashing it! 🏋️‍♀️`;

  res.json({
    success: true,
    email,
    question,
    response: fakeAIResponse
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
