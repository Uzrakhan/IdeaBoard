// src/index.ts
// This is the new main entry point for your server application.

// Import the 'server' instance (along with app, io, connectedUsers) from server.ts
// This will initialize all the Express and Socket.IO setup.
import { server } from './server';

// Get the port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// Start the HTTP server by calling the listen method on the imported 'server' instance.
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// You might also want to import and connect to your MongoDB here if it's not already
// handled by a separate database connection file that gets imported by server.ts.
// For example:
// import connectDB from './config/db';
// connectDB();
