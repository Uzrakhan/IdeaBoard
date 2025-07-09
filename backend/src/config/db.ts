import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Ensure dotenv is configured here if this file is imported directly

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            console.error('MongoDB URI is not defined in environment variables!');
            throw new Error('Set MONGO_URI environment variable');
            // Exit process if DB URI is missing - critical for app function
            process.exit(1);
        }

        try{
            mongoose.connection.on('connecting', () => {
                console.log('[DB] ✅ MongoDB connection is fully open!');
            });
            mongoose.connection.on('connected', () => console.log('[DB] MongoDB connected!'));
            mongoose.connection.on('error', (err) => console.error('[DB] Connection error:', err));
            
            // Add proper connection options
            await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 30000,  // 30 seconds
            socketTimeoutMS: 45000,
            waitQueueTimeoutMS: 30000,
            });
        } catch(err) {
            console.error('MongoDB connection error:', err);
            throw err;
        }
    } catch (err: any) {
        console.error(`MongoDB connection error (in catch block): ${err.message}`);
        console.error('MongoDB connection error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        // Exit process on connection failure
        process.exit(1);
    }
};


export default connectDB;
