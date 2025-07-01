import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import RoomAdminPanel from './RoomAdminPanel';
/*
// Mock room data - in a real app, this would come from an API
const mockRoom: Room = {
  _id: "1",
  roomCode: "ABC123",
  owner: {
    _id: "user1",
    username: "John Doe"
  },
  members: [
    { user: { _id: "user1", username: "John Doe" }, status: "approved" },
    { user: { _id: "user2", username: "Jane Smith" }, status: "approved" },
    { user: { _id: "user3", username: "Bob Johnson" }, status: "pending" }
  ],
  createdAt: new Date().toISOString(),
  name: ''
}
*/

interface WhiteboardProps {
  room: Room;
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}

type Point = { x: number; y: number };
type DrawingLine = {
  points: Point[];
  color: string;
  width: number;
};

const Whiteboard: React.FC<WhiteboardProps> = ({ room, setCurrentRoom }) => {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const lastPointRef = useRef<Point | null>(null);
  const linesRef = useRef<DrawingLine[]>([]);
  const redrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  //const [message,setMessage] = useState('');// For Socket.IO notifications
  //access room details directtly from teh 'room' prop
  const currentRoom = room;

  // Use the auth context to get the current user
  const { currentUser } = useAuth();

  //determine if current user is owner
  const isOwner = currentUser && room.owner._id === currentUser._id;

  console.log('Current User from AuthContext:', currentUser);
  
  // Keep refs updated with current state
  useEffect(() => {
    colorRef.current = color;
    brushSizeRef.current = brushSize;
  }, [color, brushSize]);

  //handler for the Invite button
  const handleInviteClick = async() => {
    const inviteLink = `${window.location.origin}/join/${currentRoom.roomCode}`;
    console.log("Attempting to copy link:", inviteLink); // Debugging
    try{
      await navigator.clipboard.writeText(inviteLink);
      alert('Room link copied to clipboard');
      console.log('Link copied successfully!'); // Debugging
    }catch(err) {
      console.error('Failed to copy text:', err);
      // Fallback for older browsers or if clipboard API fails (e.g., non-HTTPS, security restrictions)
      prompt("Please copy this link manually:", inviteLink);
      alert('Failed to automatically copy link. Please use the prompt to copy manually.');
    }
  }

  // Initialize canvas and set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up socket event handlers
    const handleInitialState = (lines: DrawingLine[]) => {
      linesRef.current = lines;
      redrawCanvas();
    };

    const handleDraw = (line: DrawingLine) => {
      // Check if we already have this line
      const isNewLine = !linesRef.current.some(l => 
        l.points === line.points && 
        l.color === line.color && 
        l.width === line.width
      );
      
      if (isNewLine) {
        linesRef.current = [...linesRef.current, line];
        drawLine(ctx, line);
      }
    };

    const handleClear = () => {
      linesRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Initialize canvas size
    const initCanvas = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = Math.min(container.clientHeight, window.innerHeight * 0.7);
      
      setCanvasDimensions({ width, height });
      
      // Set actual pixel dimensions
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      
      // Set CSS dimensions
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Scale drawing context
      ctx.scale(scale, scale);
      
      // Redraw existing lines
      redrawCanvas();
    };

    // Redraw all lines on canvas
    const redrawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      linesRef.current.forEach(line => drawLine(ctx, line));
    };

    //Draw a line on the canvas
    const drawLine = (ctx: CanvasRenderingContext2D, line: DrawingLine) => {
      if (line.points.length === 0) return;
      
      ctx.beginPath();
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = line.color;

      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    };

    // Handle window resize with debounce
    const handleResize = () => {
      if (redrawTimeoutRef.current) {
        clearTimeout(redrawTimeoutRef.current);
      }
      
      redrawTimeoutRef.current = setTimeout(() => {
        initCanvas();
      }, 100);
    };

    // Initial setup
    initCanvas();
    window.addEventListener('resize', handleResize);

    // Socket events
    socket.on('initial-state', handleInitialState);
    socket.on('draw', handleDraw);
    socket.on('clear', handleClear);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('initial-state', handleInitialState);
      socket.off('draw', handleDraw);
      socket.off('clear', handleClear);
      if (redrawTimeoutRef.current) clearTimeout(redrawTimeoutRef.current);
    };
  }, []);


  // Get coordinates relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const point = getCoordinates(e);
    lastPointRef.current = point;

    // Create new line
    const newLine: DrawingLine = {
      points: [point],
      color: colorRef.current,
      width: brushSizeRef.current
    };
    
    // Add to local storage and emit to server
    linesRef.current = [...linesRef.current, newLine];
    socket.emit('draw', newLine, room.roomCode);
  };

  // Draw while moving
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPointRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const point = getCoordinates(e);
    
    // Draw locally
    ctx.beginPath();
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colorRef.current;
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    
    // Add to last line
    if (linesRef.current.length > 0) {
      const lastLine = linesRef.current[linesRef.current.length - 1];
      const updatedLine: DrawingLine = {
        ...lastLine,
        points: [...lastLine.points, point]
      };
      
      // Update local storage and emit to server
      linesRef.current = [
        ...linesRef.current.slice(0, -1), 
        updatedLine
      ];
      
      socket.emit('draw', updatedLine, room.roomCode);
    }
    
    lastPointRef.current = point;
  };

  // Stop drawing
  const endDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Clear the board
  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    linesRef.current = [];
    socket.emit('clear', room.roomCode);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    draw(e);
  };

  return (
    <div className='bg-gray-100 min-h-screen font-inter'> {/* Added font-inter to root div */}
            <div className='max-w-7xl mx-auto px-4 py-6'>
                <div className='bg-white rounded-xl shadow-md mb-6 p-4'>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h1 className='text-xl font-bold text-gray-800'>
                                Collaboration Room: <span className='text-indigo-600'>
                                    {room.roomCode} {/* Use 'room' prop directly */}
                                </span>
                            </h1>
                            <p className='text-gray-600'>
                                Created by: {room.owner.username} {/* Use 'room' prop directly */}
                            </p>
                        </div>

                        <div className='mt-4 md:mt-0 flex items-center space-x-4'>
                            <div className='flex space-x-2'>
                                {room.members
                                    .filter(m => m.status === "approved")
                                    .slice(0, 3)
                                    .map((member, index) => (
                                        <div key={member.user._id || index} className='bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white'>
                                            <span className='text-indigo-700 text-xs font-medium'>
                                                {member?.user?.username?.charAt(0)}
                                            </span>
                                        </div>
                                    ))}
                                {room.members.filter(m => m.status === "approved").length > 3 && (
                                    <div className='bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white'>
                                        <span className='text-gray-600 text-xs'>
                                            +{room.members.filter(m => m.status === "approved").length - 3}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleInviteClick}
                                className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-full text-sm'
                            >
                                Invite
                            </button>
                        </div>
                    </div>
                </div>

                <div className='bg-white rounded-xl shadow-md p-4 mb-6'>
                    <div className='flex flex-wrap gap-4'>
                        {/* Pen/Eraser/Color/Size Controls */}
                        <div className="flex items-center space-x-2"> {/* Grouping controls */}
                            <button
                                onClick={() => setColor('#000000')}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center shadow-sm hover:border-indigo-500 transition-colors"
                                style={{ backgroundColor: '#000000' }}
                                title="Black Pen"
                            ></button>
                            <button
                                onClick={() => setColor('#FFFFFF')}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white shadow-sm hover:border-indigo-500 transition-colors"
                                title="Eraser (White)"
                            ></button>
                            <input
                                type='color'
                                value={color}
                                className='w-8 h-8 border-0 cursor-pointer rounded-full overflow-hidden'
                                onChange={(e) => setColor(e.target.value)}
                                title="Custom Color"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <select
                                className='border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:ring-indigo-500 focus:border-indigo-500'
                                value={brushSize}
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                title="Brush Size"
                            >
                                <option value={2}>Thin</option>
                                <option value={5}>Medium</option>
                                <option value={10}>Thick</option>
                            </select>
                        </div>

                        <div className='flex items-center space-x-2'>
                            {/* Undo/Redo - Placeholders */}
                            <button
                                className='bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center text-gray-700 text-lg font-bold'
                                title="Undo"
                            >
                                <span>↺</span>
                            </button>
                            <button
                                className='bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded flex items-center justify-center text-gray-700 text-lg font-bold'
                                title="Redo"
                            >
                                <span>↻</span>
                            </button>
                            <button
                                className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium shadow-md'
                                onClick={clearBoard}
                                title="Clear Board"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="bg-white rounded-xl shadow-md overflow-hidden"
                    style={{ height: '500px' }} // Fixed height for rectangular shape
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={endDrawing}
                        className="w-full h-full border border-gray-200 cursor-crosshair" // Set h-full here too
                        width={canvasDimensions.width}
                        height={canvasDimensions.height}
                    />
                </div>

                {/* Room Admin Panel - only show for room owner */}
                {isOwner && (
                    <div className="bg-white rounded-xl shadow-md mt-6 p-4">
                        <RoomAdminPanel room={room} setCurrentRoom={setCurrentRoom} />
                    </div>
                )}
            </div>
    </div>
  );
};

export default Whiteboard;