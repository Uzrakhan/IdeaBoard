import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));

/*
app.use(cors({
  origin: "http://localhost:5173",  
  credentials: true
}));
*/

app.get('/health', (req,res) => {
    res.status(200).send('OK');
})

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

type Point = { x: number, y : number };

type DrawingLine = {
    points: Point[];
    color: string;
    width: number;
};

let drawingLines: DrawingLine[] = [];

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    //send existing drawing to new client
    socket.emit('initial-state', drawingLines);

    socket.on('draw', (line: DrawingLine) => {
        drawingLines.push(line);
        socket.broadcast.emit('draw', line);
    });

    socket.on('clear', () => {
        drawingLines = [];
        io.emit('clear')
    });

    socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
    });
})




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});