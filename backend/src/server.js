"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.connectedUsers = exports.io = exports.app = void 0;
process.on('unhandledRejection', (reason, promise) => {
    console.error('----- Unhandled Rejection (GLOBAL) -----');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    console.error('---------------------------------------');
    // Optionally, exit the process after logging, or just log and continue
    // process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error('----- Uncaught Exception (GLOBAL) -----');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('-------------------------------------');
    // This is a synchronous error, usually indicates a bug.
    // It's often recommended to exit the process after an uncaught exception.
    process.exit(1);
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const lowdb_1 = require("lowdb");
const node_1 = require("lowdb/node");
//import type { Socket } from 'socket.io/dist/socket';
dotenv_1.default.config();
console.log('🔵 server.ts is starting...');
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const allowedOrigins = [
    'https://idea-board-virid.vercel.app',
    'http://localhost:5173'
];
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
});
// --- TEMPORARY DIAGNOSTIC ROUTE (add this line) ---
app.post('/api/auth/test', (req, res) => {
    console.log('[DIAGNOSTIC] /api/auth/test route hit!');
    res.status(200).json({ message: 'Test route hit!' });
});
const adapter = new node_1.JSONFile('db.json');
const db = new lowdb_1.Low(adapter, { drawingLines: [] });
let drawingLines = [];
// Initialize LowDB
(async () => {
    await db.read();
    db.data || (db.data = { drawingLines: [] });
    drawingLines = db.data.drawingLines;
})();
//Make connectedUsers map accessible globally  (within server.ts code)
const connectedUsers = new Map(); // userId -> socketId
exports.connectedUsers = connectedUsers;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
});
exports.io = io;
// Socket.io Handlers
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    // Send initial drawing state
    //socket.emit('initial-state', drawingLines);
    // --- NEW: Handle client joining a specific room ---
    socket.on('joinRoom', (roomCode, userId) => {
        socket.join(roomCode); //make this socket join a Socket.IO room named by roomCode
        connectedUsers.set(userId, socket.id); //store the user's socket id
        console.log(`Socket ${socket.id} (User ${userId}) joined room ${roomCode}`);
    });
    // --- Refined 'draw' event handling ---
    // Client sends the *updated* line object
    socket.on('draw', async (line, roomCode) => {
        const existingLineIndex = drawingLines.findIndex(l => l.points[0].x === line.points[0].x && l.points[0].y === line.points[0].y &&
            l.color === line.color && l.width === line.width);
        if (existingLineIndex > -1) {
            drawingLines[existingLineIndex] = line;
        }
        else {
            drawingLines.push(line);
        }
        try {
            db.data.drawingLines = drawingLines;
            await db.write();
            io.to(roomCode).emit('draw', line);
        }
        catch (err) {
            console.error('DB write error (draw):', err);
        }
    });
    socket.on('clear', async (roomCode) => {
        drawingLines = [];
        try {
            db.data.drawingLines = [];
            await db.write();
            io.to(roomCode).emit('clear'); // Emit clear event to the specific room
        }
        catch (err) {
            console.error('DB write error (clear):', err);
        }
    });
    /*
      socket.on('clear', async () => {
        drawingLines = [];
        try {
          await db.write();
          io.emit('clear');
        } catch (err) {
          console.error('DB write error:', err);
        }
      });
    */
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        //remove users from connectedUsers map on disconnect
        for (let [key, value] of connectedUsers.entries()) {
            if (value === socket.id) {
                connectedUsers.delete(key);
                console.log(`User ${key} removed from connected users.`);
                break;
            }
        }
    });
    socket.on('leaveRoom', (roomCode, userId) => {
        socket.leave(roomCode);
        connectedUsers.delete(userId);
        console.log(`User ${userId} left room ${roomCode}.`);
    });
});
const auth_1 = __importDefault(require("./routes/auth"));
const rooms_1 = __importDefault(require("./routes/rooms"));
app.use('/api/auth', auth_1.default);
app.use('/api/rooms', rooms_1.default);
// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});
// Start Server
const startServer = async () => {
    try {
        //await connectDB();
        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            const testDebug = { msg: "Debugger should stop here!" };
            console.log(testDebug); // ← set a BREAKPOINT on this line
            console.log(`[Server] JWT_SECRET loaded: ${!!process.env.JWT_SECRET}`);
            if (!process.env.JWT_SECRET) {
                console.error('[Server ERROR] JWT_SECRET is NOT set in environment variables!');
            }
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};
// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer();
}
//# sourceMappingURL=server.js.map