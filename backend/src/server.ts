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

import listEndpoints from 'express-list-endpoints';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Socket } from 'socket.io/dist/socket';
import dotenv from 'dotenv';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import connectDB from './config/db';
//import type { Socket } from 'socket.io/dist/socket';

dotenv.config();

console.log('🔵 server.ts is starting...');
debugger;

const app = express();
const server = createServer(app);
const allowedOrigins = [
  'https://idea-board-virid.vercel.app',
  'http://localhost:5173'
];

// Middleware
app.use(
  cors({
    origin: (origin: string | undefined, callback: (arg0: Error | null, arg1: boolean | undefined) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use(express.json());
app.use((req: { method: any; url: any; }, res: any, next: () => void) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

/*
// --- TEMPORARY DIAGNOSTIC ROUTE (add this line) ---
app.post('/api/auth/test', (req: any, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; }) => {
    console.log('[DIAGNOSTIC] /api/auth/test route hit!');
    res.status(200).json({ message: 'Test route hit!' });
});
// --- END TEMPORARY DIAGNOSTIC ROUTE ---
*/

//TEMPORARY TEST ROUTE
app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('🟢 Server is up!');
});


// LowDB Setup for Drawing Lines
type Point = { x: number; y: number };
type DrawingLine = {
  points: Point[];
  color: string;
  width: number;
};
type Data = { drawingLines: DrawingLine[] };

const adapter = new JSONFile<Data>('db.json');
const db = new Low(adapter, { drawingLines: [] });

let drawingLines: DrawingLine[] = [];

// Initialize LowDB
(async () => {
  await db.read(); // 🛑 Set a breakpoint here to confirm DB is read
  db.data ||= { drawingLines: [] }; // 🛑 Watch `db.data`
  drawingLines = db.data.drawingLines;
})();


//Make connectedUsers map accessible globally  (within server.ts code)
const connectedUsers = new Map<string, string>(); // userId -> socketId


const io = new Server(server, {
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

// Socket.io Handlers
io.on('connection', (socket: Socket) => {
  console.log('New client connected:', socket.id);

  // Send initial drawing state
  //socket.emit('initial-state', drawingLines);

  // --- NEW: Handle client joining a specific room ---
  socket.on('joinRoom', (roomCode: string, userId: string) => {
    //add validation
    if (typeof roomCode !== 'string' || roomCode.length > 20) {
      return socket.disconnect(true);
    }
    socket.join(roomCode); //make this socket join a Socket.IO room named by roomCode
    connectedUsers.set(userId, socket.id)//store the user's socket id
    console.log(`Socket ${socket.id} (User ${userId}) joined room ${roomCode}`);
  });

  // --- Refined 'draw' event handling ---
  // Client sends the *updated* line object
  socket.on('draw', async(line: DrawingLine, roomCode: string) => { // Client must send roomCode with draw events
    const existingLineIndex = drawingLines.findIndex(l => 
      l.points[0].x === line.points[0].x && l.points[0].y === line.points[0].y &&
      l.color === line.color && l.width === line.width
    );
    if(existingLineIndex > -1) {
      drawingLines[existingLineIndex] = line;
    }else {
      drawingLines.push(line)
    }

    try{
      db.data!.drawingLines = drawingLines;
      await db.write();

      io.to(roomCode).emit('draw',line)
    }catch(err) {
      console.error('DB write error (draw):', err)
    }
  });

  socket.on('clear', async (roomCode: string) => {
    drawingLines = [];
    try{
      db.data!.drawingLines = [];
      await db.write();
      io.to(roomCode).emit('clear'); // Emit clear event to the specific room
    }catch(err) {
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
    for (let [key,value] of connectedUsers.entries())  {
      if(value === socket.id) {
        connectedUsers.delete(key);
        console.log(`User ${key} removed from connected users.`);
        break;
      }
    }
  });


  socket.on('leaveRoom', (roomCode: string, userId: string) => {
    socket.leave(roomCode);
    connectedUsers.delete(userId);
    console.log(`User ${userId} left room ${roomCode}.`);
  })
});

// --- EXPORT io and connectedUsers BEFORE importing routes that might use them ---
// This is the CRITICAL change to break potential circular dependencies.
// --- EXPORT io and connectedUsers BEFORE importing routes that might use them ---
// This is the CRITICAL change to break potential circular dependencies.
export { app, io, connectedUsers, server };

// Error Handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express Error]', err);
  res.status(500).json({ message: 'Internal server error' });
});


// Start Server
const startServer = async () => {
  try {
    await connectDB();
    debugger;

    let authRoutes;

    // --- Import and Validate authRoutes ---
    try {
      const authModule = await import('./routes/auth');
      console.log('[DEBUG] authModule loaded:', typeof authModule.default);

      authRoutes = authModule.default;
      if (typeof authRoutes !== 'function') {
        console.error('❌ authRoutes is not a function. Did you export default router in auth.ts?');
        throw new Error('authRoutes must be a function (Express Router)');
      }
      app.use('/api/auth', authRoutes);
      console.log('✅ authRoutes registered');
    } catch(err) {
      console.error('❌ Failed to load/register authRoutes:', err);
      throw err; // This will send us to the outer catch block
    }


    // --- Import and Validate roomRoutes ---
    /*
    try {
      const roomModule = await import('./routes/rooms');
      console.log('[DEBUG] roomModule loaded:', typeof roomModule.default);
      debugger;

      
      const roomRoutes = roomModule.default;
      if (typeof roomRoutes !== 'function') {
        console.error('❌ roomRoutes is not a function. Did you export default router in rooms.ts?');
        throw new Error('roomRoutes must be a function (Express Router)');
      }

      console.log('🔍 typeof roomRoutes:', typeof roomRoutes); // Should be function
      console.log('🧪 roomRoutes instanceof Function:', roomRoutes instanceof Function);
      console.log('🧪 roomRoutes keys:', Object.keys(roomRoutes));

      app.use('/api/rooms', roomRoutes);
      console.log('✅ roomRoutes registered');
    } catch (err) {
      console.error('❌ Failed to load/register roomRoutes:', err);
      throw err;
    }
    */
    
    // ✅ Now register the routes

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
  } catch (err) {
    debugger;
    console.error('Failed to start server:', err);
    if (err instanceof Error) {
      console.error('🔴 STACK TRACE:', err.stack);
    } else {
      console.error('🔴 NON-ERROR OBJECT:', JSON.stringify(err));
    }
    process.exit(1);
  }
};


// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
