"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Ensure dotenv is configured here if this file is imported directly
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            console.error('MongoDB URI is not defined in environment variables!');
            // Exit process if DB URI is missing - critical for app function
            process.exit(1);
        }
        // Mongoose connection event listeners for better debugging
        mongoose_1.default.connection.on('connected', () => {
            console.log('Mongoose default connection open to ' + mongoose_1.default.connection.host);
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('Mongoose default connection error: ' + err);
            // Exit process on DB connection error - critical for app function
            process.exit(1);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('Mongoose default connection disconnected');
        });
        // Attempt to connect to MongoDB
        const conn = await mongoose_1.default.connect(mongoURI, {
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds for Render
            socketTimeoutMS: 60000, // Increase socket timeout to 60 seconds
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn; // Return the connection instance
    }
    catch (err) {
        console.error(`MongoDB connection error (in catch block): ${err.message}`);
        console.error('MongoDB connection error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        // Exit process on connection failure
        process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map