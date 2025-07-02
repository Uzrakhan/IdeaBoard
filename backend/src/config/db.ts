import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Ensure dotenv is configured here too if this file is imported directly

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            console.error('MongoDB URI is not defined in environment variables!');
            process.exit(1); // Exit if URI is missing
        }

        // Mongoose connection options (optional, but good for stability)
        const conn = await mongoose.connect(mongoURI, {
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
            serverSelectionTimeoutMS: 15000, // Increase timeout to 15 seconds
            socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
        });

        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (err: any) {
        console.error(`MongoDB connection error: ${err.message}`);
        // Log the full error object for more details
        console.error('MongoDB connection error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        process.exit(1); // Exit process on connection failure
    }
};

export default connectDB;
