import express from 'express'; // Use import for consistency
import cors from 'cors'; // Fixed: Removed duplicate require statement
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io/dist/socket';
import dotenv from 'dotenv';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import mongoose from 'mongoose';


dotenv.config();

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'https://idea-board-virid.vercel.app'
];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Add a very early log to see if requests hit the app
app.use((req: any,res: any,next: any) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});


app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

//error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
})

//create http server
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

type Point = { x: number; y: number };
type DrawingLine = {
  points: Point[];
  color: string;
  width: number;
};

let drawingLines: DrawingLine[] = [];

// Add database persistence (install lowdb)
type Data = { drawingLines: DrawingLine[] };
const adapter = new JSONFile<Data>('db.json');
const db = new Low(adapter, { drawingLines: [] });


// Initialize data
(async () => {
  await db.read();
  db.data ||= { drawingLines: [] };
  drawingLines = db.data.drawingLines;
})();


// Connection handler
io.on('connection', (socket: Socket) => {
  console.log('New client connected:', socket.id);

  // Send existing drawing to new client
  socket.emit('initial-state', drawingLines);

  socket.on('draw', async (line: DrawingLine) => {
    // Add the new line segment to our drawing
    drawingLines.push(line);
    try{
      await db.write(); // Save to file
      // Broadcast to all other clients
      socket.broadcast.emit('draw', line);
    } catch (err) {
      console.error('DB write error:', err)
    }
  });

  socket.on('clear', async () => {
    drawingLines = [];
    try{
      await db.write();
      io.emit('clear');
    } catch (err) {
      console.error('DB write error:', err)
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

//fixed server startup sequence
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not defined');
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Mongodb connected');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
          // Temporarily log JWT_SECRET here to confirm it loads at startup
        console.log(`[Server] JWT_SECRET loaded: ${!!process.env.JWT_SECRET}`); // Checks if it's truthy
        if (!process.env.JWT_SECRET) {
            console.error('[Server ERROR] JWT_SECRET is NOT set in environment variables!');
        }
    })
  })
  .catch((err: Error)=> {
    console.error('MongoDB connection error:',err);
    process.exit(1);
  })



// Add a global uncaught exception handler (for synchronous errors not in try/catch)
process.on('uncaughtException', (err: Error) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    process.exit(1); // Exit process after logging
});

// Add a global unhandled rejection handler (for unhandled Promise rejections)
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1); // Exit process after logging
});