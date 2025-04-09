import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import cors from 'cors'
import bodyParser from 'body-parser'
import Rating from './models/rating.model.js';
import dotenv from 'dotenv'

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json());


//connect to MongoDB
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ratingdb.9uvniag.mongodb.net/?retryWrites=true&w=majority&appName=RatingDB`)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB...', err));


// get all ratings route
app.get('/api/ratings', async (req, res) => {
  try {
    const ratings = await Rating.find({});
    res.status(200).json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }

});


// upsert rating route
app.post('/api/rating', async (req,res) => {
  const { trackId, trackName, rating, userId } = req.body;

  if (!trackId || !trackName || !rating) {
    return res.status(400).json({ error: 'trackId, trackName and rating are required' });
  };

  try {
    const result = await Rating.findOneAndUpdate(
      { trackId },
      {trackId, trackName, rating},
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Rating updated successfully', data: result });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(5500, () => {
  console.log('Server running at http://127.0.0.1:5500');
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
})

app.get('/src', (req, res) => {
  res.sendFile(__dirname);
});
