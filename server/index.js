// server/index.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔑 ENV DEBUG
console.log('✅ ENV DEBUG:', {
  PORT: port,
  OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get('/', (req, res) => {
  res.send('👋 Hello from STRUKT Coach Server!');
});

app.post('/ask', async (req, res) => {
  try {
    const { messages } = req.body;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({
      success: true,
      reply: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('❌ /ask error:', error);

    res.status(500).json({
      success: false,
      error: {
        message: error?.message || 'Unknown error',
        type: error?.type || 'Unknown',
        full: error,
      },
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});
