// src/server.ts
console.log('--- ENTERING server.ts ---'); // DIAGNOSTIC LOG
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io/dist/socket';
import dotenv from 'dotenv';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

dotenv.config();

console.log('🔵 server.ts is starting...');

const app = express();
const server = createServer(app);

// --- CRITICAL REORDERING FOR CIRCULAR DEPENDENCY ---
// Define connectedUsers and io immediately after app and server are created.
// This ensures they are fully initialized when other modules (like roomController)
// try to import them during their own loading process.
const connectedUsers = new Map<string, string>(); // userId -> socketId

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'], // Corrected: NO TRAILING SLASH HERE
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});
// --- END CRITICAL REORDERING ---


const allowedOrigins = [
  'https://idea-board-virid.vercel.app', 
  'http://localhost:5173' 
];

// Global Error Handlers (Recommended at the very top of your main entry file, e.g., index.ts, but here is fine for server-side
// unhandled rejections/exceptions that happen outside Express middleware)
process.on('unhandledRejection', (reason, promise) => {
  console.error('----- Unhandled Rejection (GLOBAL) -----');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('---------------------------------------');
  // In a server, it's often safer to exit on unhandled rejections to prevent unknown state
  // process.exit(1); // Uncomment if you prefer to exit
});

process.on('uncaughtException', (err) => {
  console.error('----- Uncaught Exception (GLOBAL) -----');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('-------------------------------------');
  // Uncaught synchronous errors usually indicate a bug; exiting is common practice.
  process.exit(1);
});


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

// TEMPORARY TEST ROUTE (keep for now to confirm server is up)
app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('🟢 Server is up!');
});


// LowDB Setup for Drawing Lines (now comes AFTER io/connectedUsers definitions)
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
  await db.read();
  db.data ||= { drawingLines: [] };
  drawingLines = db.data.drawingLines;
})();


// Socket.io Handlers (now comes after io is defined)
io.on('connection', (socket: Socket) => { // 'socket' here will infer type correctly from 'socket.io'
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', (roomCode: string, userId: string) => {
    if (typeof roomCode !== 'string' || roomCode.length > 20) {
      return socket.disconnect(true);
    }
    socket.join(roomCode);
    connectedUsers.set(userId, socket.id);
    console.log(`Socket ${socket.id} (User ${userId}) joined room ${roomCode}`);
  });

  socket.on('draw', async(line: DrawingLine, roomCode: string) => {
    const existingLineIndex = drawingLines.findIndex(l =>
      l.points[0].x === line.points[0].x && l.points[0].y === line.points[0].y &&
      l.color === line.color && l.color === line.color && l.width === line.width // Fixed: duplicate line.color
    );
    if(existingLineIndex > -1) {
      drawingLines[existingLineIndex] = line;
    } else {
      drawingLines.push(line);
    }

    try{
      db.data!.drawingLines = drawingLines;
      await db.write();
      io.to(roomCode).emit('draw',line);
    } catch(err) {
      console.error('DB write error (draw):', err);
    }
  });

  socket.on('clear', async (roomCode: string) => {
    drawingLines = [];
    try{
      db.data!.drawingLines = [];
      await db.write();
      io.to(roomCode).emit('clear');
    } catch(err) {
      console.error('DB write error (clear):', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (let [key,value] of connectedUsers.entries()) {
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
  });
});


// --- IMPORT AND REGISTER ROUTES DIRECTLY HERE (MOVED FROM startServer function) ---
console.log('--- BEFORE ROUTE IMPORTS in server.ts ---'); // DIAGNOSTIC LOG

import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';

console.log('--- AFTER ROUTE IMPORTS in server.ts ---'); // DIAGNOSTIC LOG
console.log(`DEBUG: typeof authRoutes = ${typeof authRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: authRoutes is an Express Router? ${authRoutes && typeof authRoutes === 'function' && typeof (authRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG
console.log(`DEBUG: typeof roomRoutes = ${typeof roomRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: roomRoutes is an Express Router? ${roomRoutes && typeof roomRoutes === 'function' && typeof (roomRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG


app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);



// --- DEBUG: INSPECTING ROUTER STACKS ---
console.log('--- DEBUGGING ROUTER STACKS ---');

// Add a simple test route directly to 'app' to see if it registers
app.get('/api/test-direct-route', (req: express.Request, res: express.Response) => {
    console.log('[DIAGNOSTIC] Direct test route /api/test-direct-route hit!');
    res.send('Direct test route hit!');
});


// Check authRoutes's stack
if ((authRoutes as any).stack && Array.isArray((authRoutes as any).stack)) {
    console.log(`DEBUG: authRoutes.stack has ${ (authRoutes as any).stack.length } layers.`);
    (authRoutes as any).stack.forEach((layer: any, index: number) => {
        console.log(`  Auth Layer ${index}: Method=${layer.route ? Object.keys(layer.route.methods)[0].toUpperCase() : 'N/A'}, Path=${layer.route ? layer.route.path : layer.regexp.source}`);
    });
} else {
    console.log('DEBUG: authRoutes.stack is not an array or does not exist.');
}

// Check roomRoutes's stack
if ((roomRoutes as any).stack && Array.isArray((roomRoutes as any).stack)) {
    console.log(`DEBUG: roomRoutes.stack has ${ (roomRoutes as any).stack.length } layers.`);
    (roomRoutes as any).stack.forEach((layer: any, index: number) => {
        console.log(`  Room Layer ${index}: Method=${layer.route ? Object.keys(layer.route.methods)[0].toUpperCase() : 'N/A'}, Path=${layer.route ? layer.route.path : layer.regexp.source}`);
    });
} else {
    console.log('DEBUG: roomRoutes.stack is not an array or does not exist.');
}
console.log('--- END DEBUGGING ROUTER STACKS ---');
// --- END ROUTE REGISTRATION ---


// Express Error Handling Middleware (should be last app.use, after all routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express Error]', err);
  if (err instanceof Error) {
    console.error('🔴 STACK TRACE:', err.stack);
  } else {
    console.error('🔴 NON-ERROR OBJECT:', JSON.stringify(err));
  }
  res.status(500).json({ message: 'Internal server error' });
});


// --- EXPORT app, io, connectedUsers, and server for index.ts to use ---
// The actual server.listen call is now in index.ts
export { app, io, connectedUsers, server };