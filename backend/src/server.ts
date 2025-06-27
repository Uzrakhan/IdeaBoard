import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { Socket } from 'socket.io/dist/socket';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';

dotenv.config();

const app = express();
const allowedOrigins = [
  'https://idea-board-virid.vercel.app',
  'http://localhost:5173'
];

// Middleware
app.use(
  cors({
    origin: (origin: string, callback: (arg0: Error | null, arg1: boolean | undefined) => void) => {
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

// --- TEMPORARY DIAGNOSTIC ROUTE (add this line) ---
app.post('/api/auth/test', (req: any, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; }) => {
    console.log('[DIAGNOSTIC] /api/auth/test route hit!');
    res.status(200).json({ message: 'Test route hit!' });
});
// --- END TEMPORARY DIAGNOSTIC ROUTE ---

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Database Connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MongoDB URI is not defined.')
    throw new Error('MongoDB URI is not defined. Set MONGODB_URI environment variable.');
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

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
  await db.read();
  db.data ||= { drawingLines: [] };
  drawingLines = db.data.drawingLines;
})();

// HTTP Server with Socket.io
const server = createServer(app);
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
  socket.emit('initial-state', drawingLines);

  socket.on('draw', async (line: DrawingLine) => {
    drawingLines.push(line);
    try {
      await db.write();
      socket.broadcast.emit('draw', line);
    } catch (err) {
      console.error('DB write error:', err);
    }
  });

  socket.on('clear', async () => {
    drawingLines = [];
    try {
      await db.write();
      io.emit('clear');
    } catch (err) {
      console.error('DB write error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error Handling
app.use((err: { stack: any; }, req: any, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; }, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`[Server] JWT_SECRET loaded: ${!!process.env.JWT_SECRET}`);
      if (!process.env.JWT_SECRET) {
        console.error('[Server ERROR] JWT_SECRET is NOT set in environment variables!');
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Global Error Handlers
process.on('uncaughtException', (err: Error) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
