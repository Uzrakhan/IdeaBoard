// src/server.ts
/*
console.log('--- ENTERING server.ts ---'); // DIAGNOSTIC LOG
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io/dist/socket';
import dotenv from 'dotenv';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';


dotenv.config();

console.log('🔵 server.ts is starting...');

const app = express();
const server = createServer(app);
const allowedOrigins = [
  'https://idea-board-virid.vercel.app', 
  'http://localhost:5173' 
];
// --- CRITICAL REORDERING FOR CIRCULAR DEPENDENCY ---
// Define connectedUsers and io immediately after app and server are created.
// This ensures they are fully initialized when other modules (like roomController)
// try to import them during their own loading process.
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
// --- END CRITICAL REORDERING ---


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
app.use(express.json());
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use((req: { method: any; url: any; }, res: any, next: () => void) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

app.get('/test-route', (req: any, res: any) => {
    console.log('[Server] /test-route was hit!');
    res.status(200).json({ message: 'Test route is working!' });
});


app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);


// TEMPORARY TEST ROUTE (keep for now to confirm server is up)
app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('🟢 Server is up!');
});


// LowDB Setup for Drawing Lines (now comes AFTER io/connectedUsers definitions)
type Point = { x: number; y: number };
type DrawingLine = {
  id: string;
  points: Point[];
  color: string;
  width: number;
};

// Define the overall LowDB data structure
type RoomData = {
  drawingLines: DrawingLine [];   // Each room will have its own list of lines
}

type DbData = { 
  rooms: { [roomCode: string]: RoomData } // The main database structure: an object mapping room codes to
};

const adapter = new JSONFile<DbData>('db.json');
const db = new Low(adapter, { rooms: {} }); // Initialize with an empty rooms object



// Initialize LowDB
(async () => {
  await db.read();
  // If 'db.json' is empty or malformed, make sure 'db.data.rooms' exists
  db.data ||= { rooms: {} };
  console.log('LowDB initialized. Current rooms in DB:', Object.keys(db.data.rooms).length);
})();


// HELPER FUNCTION: Get data for a specific room. If room doesn't exist, create an empty one.
async function getRoomData(roomCode: string): Promise<RoomData> {
  await db.read(); //always read the latest state from the file first!
  if (!db.data!.rooms[roomCode]) {
    db.data!.rooms[roomCode] = { drawingLines: [] } //create an empty room if it's new  
  }
  return db.data!.rooms[roomCode] //return data for this specific room
}

//HELPER FUNCTION: Save data for a specific room
async function saveRoomData(roomCode:string, data: RoomData) {
  await db.read(); //read the latest state before writing to prevent overwrititng other rooms
  db.data!.rooms[roomCode] = data; //update only this room's data
  await db.write(); //write changes back to db.json
}

// Socket.io Handlers (now comes after io is defined)
io.on('connection', (socket: Socket) => { // 'socket' here will infer type correctly from 'socket.io'
  console.log('New client connected:', socket.id);

  //1. `joinRoom` (Change name to `joinRoomChannel` for client match)
  socket.on('joinRoomChannel', async (data : { roomCode: string; userId: string }) => {
    const { roomCode, userId } = data;

    if (typeof roomCode !== 'string' || roomCode.length > 20) {
      console.warn(`Invalid roomCode receieved for joinRoomChannel: ${roomCode}`)
      return socket.disconnect(true);
    }
    socket.join(roomCode); //add this socket to the Socket.IO room group
    connectedUsers.set(userId, socket.id); //track user to socket mapping
    console.log(`Socket ${socket.id} (User ${userId}) joined room ${roomCode}`);

    //IMPORTANT: Send initial-state for THIS specific room only
    try{
      const roomData = await getRoomData(roomCode);
      socket.emit('initial-state', roomData.drawingLines); //send only THIS room's lines to the joining client
      console.log(`Sent initial-state (${roomData.drawingLines.length} lines) to ${socket.id} for room ${roomCode}`);
    }catch (error) {
      console.error(`Error sending initial-state for room ${roomCode}:`, error);
    }
  });

  //2. `draw` event
  socket.on('draw', async(line: DrawingLine, roomCode: string) => {
    try{
      //RECOMMENDED ADDITION (Authorization check)
      // You should add logic here to ensure the user (socket.id) is an approved member of `roomCode`.
      // Example (requires you to fetch room from DB and check member status):
      
      const roomData = await getRoomData(roomCode); //await it immediately
      const currentDrawingLines = roomData.drawingLines; //now roomData is the actual object

      // Logic to find and update/add the line in THIS room's drawingLines
      // (This specific findIndex approach can be improved with a unique `lineId` from client)
      const existingLineIndex = currentDrawingLines.findIndex(l =>
          l.id === line.id
      );

      if(existingLineIndex > -1) {
        currentDrawingLines[existingLineIndex] = line;
        console.log(`Updated existing line ${line.id} in room ${roomCode}`);
      } else {
        currentDrawingLines.push(line);
        console.log(`Added new line ${line.id} to room ${roomCode}`);
      }

      await saveRoomData(roomCode, roomData);
      socket.to(roomCode).emit('draw', line);
      console.log(`Broadcasted draw event for line ${line.id} to room ${roomCode} (excluding sender)`);
    }catch (err: any) {
      console.error('DB write/draw processing error for room', roomCode, ':', err);
      // Optionally, emit an error back to the client
      socket.emit('drawingError', { message: 'Failed to process drawing.', error: err.message });
    }
  });

  //3. `clear` event
  socket.on('clear', async (roomCode: string) => {
    try{
      const roomData = await getRoomData(roomCode);
      roomData.drawingLines = [];
      await saveRoomData(roomCode, roomData);
      io.to(roomCode).emit('clear');
    }catch(err) {
      console.error('DB write error (clear) for room', roomCode, ":", err)
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
console.log(`DEBUG: typeof authRoutes = ${typeof authRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: authRoutes is an Express Router? ${authRoutes && typeof authRoutes === 'function' && typeof (authRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG
console.log(`DEBUG: typeof roomRoutes = ${typeof roomRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: roomRoutes is an Express Router? ${roomRoutes && typeof roomRoutes === 'function' && typeof (roomRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG



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
*/





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
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';


dotenv.config();

console.log('🔵 server.ts is starting...');

const app = express();
const server = createServer(app);
const allowedOrigins = [
  'https://idea-board-virid.vercel.app', 
  'http://localhost:5173' 
];
// --- CRITICAL REORDERING FOR CIRCULAR DEPENDENCY ---
// Define connectedUsers and io immediately after app and server are created.
// This ensures they are fully initialized when other modules (like roomController)
// try to import them during their own loading process.
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
// --- END CRITICAL REORDERING ---


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
app.use(express.json());
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use((req: { method: any; url: any; }, res: any, next: () => void) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// ✅ CORRECT ROUTE REGISTRATION: Place all your routes here, after middleware.
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// ✅ CORRECT: Place a simple test route here to confirm the server is up.
app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('🟢 Server is up!');
});

app.get('/test-route', (req: any, res: any) => {
    console.log('[Server] /test-route was hit!');
    res.status(200).json({ message: 'Test route is working!' });
});


// LowDB Setup for Drawing Lines (now comes AFTER io/connectedUsers definitions)
type Point = { x: number; y: number };
type DrawingLine = {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle';
  points: Point[];
  startPoint?: Point;
  endPoint?: Point;
  color: string;
  width: number;
};

// Define the overall LowDB data structure
type RoomData = {
  drawingLines: DrawingLine [];   // Each room will have its own list of lines
  history: DrawingLine[][]; //history stack
  historyIndex: number; //history index
}

type DbData = { 
  rooms: { [roomCode: string]: RoomData } // The main database structure: an object mapping room codes to
};

const adapter = new JSONFile<DbData>('db.json');
const db = new Low(adapter, { rooms: {} }); // Initialize with an empty rooms object


// Initialize LowDB
(async () => {
  await db.read();
  // If 'db.json' is empty or malformed, make sure 'db.data.rooms' exists
  db.data ||= { rooms: {} };
  console.log('LowDB initialized. Current rooms in DB:', Object.keys(db.data.rooms).length);
})();


// HELPER FUNCTION: Get data for a specific room. If room doesn't exist, create an empty one.
async function getRoomData(roomCode: string): Promise<RoomData> {
  await db.read(); //always read the latest state from the file first!
  if (!db.data!.rooms[roomCode]) {
    db.data!.rooms[roomCode] = { drawingLines: [], history: [[]], historyIndex: 0 } //create an empty room if it's new  
  }
  return db.data!.rooms[roomCode] //return data for this specific room
}

//HELPER FUNCTION: Save data for a specific room
async function saveRoomData(roomCode:string, data: RoomData) {
  await db.read(); //read the latest state before writing to prevent overwrititng other rooms
  db.data!.rooms[roomCode] = data; //update only this room's data
  await db.write(); //write changes back to db.json
}

// Socket.io Handlers (now comes after io is defined)
io.on('connection', (socket: Socket) => { // 'socket' here will infer type correctly from 'socket.io'
  console.log('New client connected:', socket.id);

  //1. `joinRoom` (Change name to `joinRoomChannel` for client match)
  socket.on('joinRoomChannel', async (data : { roomCode: string; userId: string }) => {
    const { roomCode, userId } = data;

    if (typeof roomCode !== 'string' || roomCode.length > 20) {
      console.warn(`Invalid roomCode receieved for joinRoomChannel: ${roomCode}`)
      return socket.disconnect(true);
    }
    socket.join(roomCode); //add this socket to the Socket.IO room group
    connectedUsers.set(userId, socket.id); //track user to socket mapping
    console.log(`Socket ${socket.id} (User ${userId}) joined room ${roomCode}`);

    //IMPORTANT: Send initial-state for THIS specific room only
    try{
      const roomData = await getRoomData(roomCode);
      socket.emit('initial-state', roomData.drawingLines); //send only THIS room's lines to the joining client
      console.log(`Sent initial-state (${roomData.drawingLines.length} lines) to ${socket.id} for room ${roomCode}`);
    }catch (error) {
      console.error(`Error sending initial-state for room ${roomCode}:`, error);
    }
  });

  //2. `draw` event
  socket.on('draw', async(line: DrawingLine, roomCode: string) => {
    try{
      //RECOMMENDED ADDITION (Authorization check)
      // You should add logic here to ensure the user (socket.id) is an approved member of `roomCode`.
      // Example (requires you to fetch room from DB and check member status):
      
      const roomData = await getRoomData(roomCode); //await it immediately
      const { drawingLines,history, historyIndex } = roomData; 

      // Truncate the history to remove any undone states before adding a new one
      roomData.history = history.slice(0, historyIndex + 1);

      // Logic to find and update/add the line in THIS room's drawingLines
      // (This specific findIndex approach can be improved with a unique `lineId` from client)
      const existingLineIndex = drawingLines.findIndex(l =>
          l.id === line.id
      );

      if(existingLineIndex > -1) {
        drawingLines[existingLineIndex] = line;
        console.log(`Updated existing line ${line.id} in room ${roomCode}`);
      } else {
        drawingLines.push(line);
        console.log(`Added new line ${line.id} to room ${roomCode}`);
      }

      // Save the new state snapshot to the history
      roomData.history.push(JSON.parse(JSON.stringify(drawingLines)));
      roomData.historyIndex = roomData.history.length - 1;

      await saveRoomData(roomCode, roomData);
      socket.to(roomCode).emit('draw', line);
      console.log(`Draw action processed. New history length: ${roomData.history.length}`);
    }catch (err: any) {
      console.error('DB write/draw processing error for room', roomCode, ':', err);
      // Optionally, emit an error back to the client
      socket.emit('drawingError', { message: 'Failed to process drawing.', error: err.message });
    }
  });

  //3. `clear` event
  socket.on('clear', async (roomCode: string) => {
    try{
      const roomData = await getRoomData(roomCode);

      // Truncate history before a new action
      roomData.history = roomData.history.slice(0, roomData.historyIndex + 1);

      // Clear lines and add the new empty state to history
      roomData.drawingLines = [];
      roomData.history.push([]);
      roomData.historyIndex = roomData.history.length - 1;
      
      await saveRoomData(roomCode, roomData);
      io.to(roomCode).emit('clear');
    }catch(err) {
      console.error('DB write error (clear) for room', roomCode, ":", err)
    }
  });

  socket.on('undo', async (roomCode: string) => {
    try{
      const roomData = await getRoomData(roomCode);
      const { history, historyIndex } = roomData;
      if (historyIndex > 0) {
        roomData.historyIndex--;
        roomData.drawingLines = history[roomData.historyIndex];
        await saveRoomData(roomCode, roomData);
        io.to(roomCode).emit('inital-state', roomData.drawingLines);
        console.log(`Undo action broadcasted for room ${roomCode}. New history index: ${roomData.historyIndex}`);
      }
    }catch(err) {
      console.error('DB write error (undo) for room', roomCode, ":", err);
    }
  });

  socket.on('redo', async (roomCode: string) => {
    try {
      const roomData = await getRoomData(roomCode);
      const { history, historyIndex } = roomData;
      if (historyIndex < history.length - 1){
        roomData.historyIndex++;
        roomData.drawingLines = history[roomData.historyIndex];
        await saveRoomData(roomCode, roomData);
        io.to(roomCode).emit('initial-state', roomData.drawingLines);
        console.log(`Redo action broadcasted for room ${roomCode}. New history index: ${roomData.historyIndex}`);
      }
    }catch(err) {
      console.error('DB write error (redo) for room', roomCode, ":", err);
    }
  })

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
console.log(`DEBUG: typeof authRoutes = ${typeof authRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: authRoutes is an Express Router? ${authRoutes && typeof authRoutes === 'function' && typeof (authRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG
console.log(`DEBUG: typeof roomRoutes = ${typeof roomRoutes}`); // DIAGNOSTIC LOG
console.log(`DEBUG: roomRoutes is an Express Router? ${roomRoutes && typeof roomRoutes === 'function' && typeof (roomRoutes as any).stack === 'object'}`); // DIAGNOSTIC LOG



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
        console.log(`  Auth Layer ${index}: Method=${layer.route ? Object.keys(layer.route.methods)[0].toUpperCase() : 'N/A'}, Path=${layer.route ? layer.route.path : layer.regexp.source}`);
    });
} else {
    console.log('DEBUG: authRoutes.stack is not an array or does not exist.');
}

// Check roomRoutes's stack
if ((roomRoutes as any).stack && Array.isArray((roomRoutes as any).stack)) {
    console.log(`DEBUG: roomRoutes.stack has ${ (roomRoutes as any).stack.length } layers.`);
    (roomRoutes as any).stack.forEach((layer: any, index: number) => {
        console.log(`  Room Layer ${index}: Method=${layer.route ? Object.keys(layer.route.methods)[0].toUpperCase() : 'N/A'}, Path=${layer.route ? layer.route.path : layer.regexp.source}`);
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