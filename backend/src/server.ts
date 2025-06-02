/// <reference types="node" />
import express from 'express'; // Use import for consistency
import cors from 'cors'; // Fixed: Removed duplicate require statement
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io/dist/socket';
import dotenv from 'dotenv';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

dotenv.config();

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'https://idea-board-virid.vercel.app',
  'https://ideaboard-backend.onrender.com',
];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
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
db.data ||= { drawingLines: [] };
drawingLines = db.data.drawingLines;

// Connection handler
io.on('connection', (socket: Socket) => {
  console.log('New client connected:', socket.id);

  // Send existing drawing to new client
  socket.emit('initial-state', drawingLines);

  socket.on('draw', async (line: DrawingLine) => {
    // Add the new line segment to our drawing
    drawingLines.push(line);

    await db.write(); // Save to file
    // Broadcast to all other clients
    socket.broadcast.emit('draw', line);
  });

  socket.on('clear', () => {
    drawingLines = [];
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
