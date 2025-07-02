import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Ensure dotenv is configured here if this file is imported directly

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            console.error('MongoDB URI is not defined in environment variables!');
            // Exit process if DB URI is missing - critical for app function
            process.exit(1);
        }

        // Mongoose connection event listeners for better debugging
        mongoose.connection.on('connected', () => {
            console.log('Mongoose default connection open to ' + mongoose.connection.host);
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose default connection error: ' + err);
            // Exit process on DB connection error - critical for app function
            process.exit(1);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose default connection disconnected');
        });

        // Attempt to connect to MongoDB
        const conn = await mongoose.connect(mongoURI, {
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds for Render
            socketTimeoutMS: 60000, // Increase socket timeout to 60 seconds
        });

        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn; // Return the connection instance
    } catch (err: any) {
        console.error(`MongoDB connection error (in catch block): ${err.message}`);
        console.error('MongoDB connection error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        // Exit process on connection failure
        process.exit(1);
    }
};

export default connectDB;
