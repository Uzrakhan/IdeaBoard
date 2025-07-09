"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
// This is the new main entry point for your server application.
// This log should appear every time this file is executed.
console.log('#########################################################');
console.log('##################### INDEX.TS EXECUTED #####################');
console.log('#########################################################');
// Import the 'server' instance (along with app, io, connectedUsers) from server.ts
// This will initialize all the Express and Socket.IO setup.
const server_1 = require("./server");
const db_1 = __importDefault(require("./config/db"));
// Get the port from environment variables or default to 5000
const PORT = process.env.PORT || 5000;
// Call connectDB BEFORE starting the server to ensure DB is ready
(0, db_1.default)().then(() => {
    console.log('Database connection successful. Attempting to start HTTP server...');
    // Start the HTTP server by calling the listen method on the imported 'server' instance.
    server_1.server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    // Add an error handler for the server's 'error' event.
    // This is crucial for catching errors like EADDRINUSE (address already in use).
    server_1.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. This might indicate a previous process did not shut down cleanly, or Render is attempting to restart too quickly.`);
        }
        else {
            console.error('Server encountered an unexpected error:', err);
        }
        // Exit the process to allow Render to attempt a clean restart
        process.exit(1);
    });
}).catch(err => {
    console.error('Failed to start server due to database connection error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map