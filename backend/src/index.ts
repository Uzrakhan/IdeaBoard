// src/index.ts
// This is the new main entry point for your server application.

// Import the 'server' instance (along with app, io, connectedUsers) from server.ts
// This will initialize all the Express and Socket.IO setup.
import { server } from './server';
import connectDB from './config/db';

// Get the port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;

// Start the HTTP server by calling the listen method on the imported 'server' instance.
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


// Call connectDB BEFORE starting the server to ensure DB is ready
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to start server due to database connection error:', err);
    process.exit(1);
});

