import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Root route for basic health check
app.get('/', (req, res) => {
  res.send('STRUKT Server is alive and ready 🚀');
});

// POST /api/ask-coach — your assistant endpoint
app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  // 🔁 Replace this with actual OpenAI + Airtable logic later
  const fakeResponse = `Hi ${email}, I suggest doing a full-body workout today based on your current goal. 🏋️‍♂️`;

  res.json({
    success: true,
    email,
    question,
    response: fakeResponse
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
