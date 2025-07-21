// server/index.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Example route — later you’ll link your logic here
app.get('/', (req, res) => {
  res.send('STRUKT Server is alive and ready 🚀');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
