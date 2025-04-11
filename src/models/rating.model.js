import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
    
    trackId: {
        type: String,
        required: true,
    },
    trackName: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    
});

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;