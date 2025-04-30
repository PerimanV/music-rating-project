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

app.use(cors({
  origin: 'https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/',
  methods: ['GET', 'POST', 'DELETE'], 
}));

app.use(bodyParser.json());


//connect to MongoDB
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ratingdb.9uvniag.mongodb.net/?retryWrites=true&w=majority&appName=RatingDB`)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB...', err));


  app.listen(5500, () => {
    console.log('Server running at http://127.0.0.1:5500');
  })
  
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  })
  
  app.get('/src', (req, res) => {
    res.sendFile(__dirname);
  });

  //health check
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });



  app.get('/api/ratings/all', async (req, res) => {
    try {
      const ratings = await Rating.find({});
      res.status(200).json(ratings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

// get all ratings for a user route
app.get('/api/ratings/user/:userId', async (req,res) => {
  const { userId } = req.params;

      try {
        const ratings = await Rating.find({ userId });
        res.status(200).json(ratings);
      } 
      catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
      }

});

//delete all ratings route
app.delete('/api/ratings/delete-all', async (req, res) => {
  try {
    
    //authorization check
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Rating.deleteMany({});
    res.status(200).json({ message: 'All ratings deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


//get average rating for each song route
app.get('/api/rating/average/:trackId', async (req, res) => {
  const { trackId } = req.params;

  try {
    const ratings = await Rating.find({ trackId });

    if (!ratings.length) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    let sum = 0;
    for (let i = 0; i < ratings.length; i++) {
      sum += ratings[i].rating;
    }

    const averageRating = sum / ratings.length;

    return res.status(200).json({ averageRating });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});


//bulk find average ratings route
app.post('/api/rating/averages/bulk', async (req,res) => {
  const { trackIds } = req.body;

  if (!trackIds) {
    return res.status(400).json({ error: 'trackIds must be an array' });
  }

  try {
    const ratings = await Rating.find({ trackId: { $in: trackIds } });

    const ratingMap = {};
    for (const trackId of trackIds) {
      let sum = 0;
      let count = 0;

      for (const rating of ratings) {
        if (rating.trackId === trackId) {
          sum += rating.rating;
          count++;
        }
      }

      let avg;
      if (count > 0) {
        avg = sum / count;
      }
      else {
        avg = null;
      }
      
      ratingMap[trackId] = avg;
    }


    res.json(ratingMap);

  }catch (err) {
    console.error(err);
    res.status(500).json({ errror: 'Error calculating averages' });
  }
});


// get rating by trackId route
app.get('/api/rating/:trackId', async (req, res) => {
  const { trackId } = req.params;

  try {
    const rating = await Rating.findOne({ trackId });
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    } 
    else {
      res.status(200).json(rating);
    }
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error getting rating' });
  }

});


// upsert rating route
app.post('/api/rating', async (req,res) => {
  const { trackId, trackName, rating, userId } = req.body;

  if (!trackId || !trackName || !rating || !userId) {
    return res.status(400).json({ error: 'trackId, trackName, rating and userId are required' });
  };

  try {
    const result = await Rating.findOneAndUpdate(
      { trackId, userId },
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


