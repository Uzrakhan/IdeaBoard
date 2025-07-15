import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import RoomAdminPanel from './RoomAdminPanel';
import { useParams,useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import { toast } from 'react-toastify';
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

/*
interface WhiteboardProps {
  room: Room;
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}
*/

type Point = { x: number; y: number };
type DrawingLine = {
  points: Point[];
  color: string;
  width: number;
};

const Whiteboard: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room,setRoom] = useState<Room | null>(null);
  const [error,setError] = useState('');
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
  //const currentRoom = room;

  // Use the auth context to get the current user
  const { currentUser } = useAuth();

  //determine if current user is owner
  const isOwner = currentUser && room?.owner?._id === currentUser._id;

  console.log('Current User from AuthContext:', currentUser);

  // --- START: Room Data Fetching (FIXED) ---
  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomCode) {
        setError('No room code provided.');
        // Optionally redirect if no roomCode is present
        navigate('/');
        return;
      }
      try{
        console.log("Whiteboard: Fetching room details for:", roomCode);
        const res = await getRoom(roomCode);
        
        // FIX #1: Correctly extract the room object from the response
        if (res && res.room) {
          setRoom(res.room); // <--- IMPORTANT FIX: Use res.room
          console.log("Whiteboard: Room fetched successfully:", res.room);
        } else {
          // If room not found (e.g., status 404), your getRoom API might throw,
          // which the catch block handles. If it returns { message: 'Room not found' }
          // without an error, then this 'throw new Error' is good.
          throw new Error(res.message || "Room data not found in response.");
        }
      } catch(err: any) {
        console.error("Whiteboard: Failed to fetch room details:", err);
        const errorMessage = err.response?.data?.message || "Failed to load room."
        setError(errorMessage);
        toast.error(errorMessage) //show toast for room loading errors
        navigate('/'); // Redirect to home or dashboard if room not found/error
      }
    };
    fetchRoomDetails();
  },[roomCode,navigate]);


  // --- START: Socket.IO Connection and Listeners (UPDATED) ---
  useEffect(() => {
    //ensure currnetUser is available before connecting
    if (!roomCode || !currentUser) { 
      console.log("Socket.IO: Waiting for roomCode or currentUser to connect socket.");
      return;
    }

    //only connect if not already connected
    if (!socket.connected) {
      console.log("Socket.IO: Attempting to connect for room:", roomCode);
      socket.connect()
    }

    
    // Add general connection/disconnection logs for debugging
    socket.on('connect', () => {
      console.log('Socket.IO: Connected successfully! Socket ID:', socket.id);
      //emit 'joinRoomChannel' only after connecteion is established
      console.log(`Socket.IO: Emitting 'joinRoomChannel' for room ${roomCode} with user ${currentUser._id}`);
      socket.emit('joinRoomChannel', { roomCode, userId: currentUser._id });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO: Disconnected. Reason:', reason);
      // Optionally show a toast for unexpected disconnects
      if (reason === "io server disconnect" || reason === "io client disconnect") {
        toast.info('Disconnected from room. Please refresh if issue persists.')
      }else {
        toast.error('Lost connection to the room. Attempting to reconnect...')
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO: Connection error:', error);
      toast.error(`Connection error: ${error.message}`)
    });

    // Add event listeners for real-time features like join requests and member updates
    // These events must be emitted by your backend when relevant changes occur.
    //1. Listen for 'roomUpdated' (General Room Data Refresh)
    socket.on('roomUpdated', ({ room: updatedRoomData }: { room: Room }) => {
      console.log('Socket.IO: Received roomUpdated:', updatedRoomData);
      setRoom(updatedRoomData) //update the main room state
    });

    //2. Listen for 'room:joinRequest' (For the room owner)
    socket.on('room:joinRequest', (data: { roomCode: string; requester: string; requesterId: string }) => {
      console.log('Socket.IO: Received new join request:', data);
      // This will now only show for the owner, as the backend emits it to the owner's socket
      toast.info(`New join request for room ${data.roomCode} from ${data.requester}!`);
      // The `roomUpdated` event (handled above) will eventually bring the new member into the `room.members` array.
      // So, the RoomAdminPanel will naturally update if it uses the `room` prop.
    });

    //3. Listen for 'memberUpdate' (for admin panel member list)
    socket.on('room:memberUpdate', (data: { roomCode: string; memberId: string; status: string; username: string; message?: string }) => {
      console.log('Socket.IO: Received member update:', data);
      // This event tells you a specific member's status changed.
      // The `roomUpdated` event (handled above) will update the `room` state which is passed to RoomAdminPanel.
      // So, this toast is mainly for notification.
      toast.info(data.message || `${data.username}'s status updated to ${data.status}`)
    });

    //4. Listen for 'yourRoomStatusUpdated' (for the affected user)
    socket.on('yourRoomStatusUpdated', (data: { roomCode: string; status: string; message?: string }) => {
      console.log(`Socket.IO: Your status in room ${data.roomCode} updated to ${data.status}.`);
      if (data.status === "approved") {
        toast.success(data.message || `You have been approved for room ${data.roomCode}!`)
      } else if (data.status === "rejected") {
        toast.error(data.message || `Your request for room ${data.roomCode} was rejected.`)
      }
    })

    // Cleanup on component unmount
    return () => {
      console.log("Socket.IO: Disconnecting and cleaning up listeners.");
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('roomUpdated')
      socket.off('room:joinRequest');
      socket.off('room:memberUpdate');
      socket.off('yourRoomStatusUpdated')
      // It's good practice to disconnect the socket when leaving the room/component
      // if it's specific to this room.
      socket.disconnect();
    };
  }, [roomCode, currentUser]); // Dependencies: roomCode, currentUser

  // --- END: Socket.IO Connection and Listeners ---

  
  //REDUNDANT FETCHING CODE
  /*
  useEffect(() => {
    if(!roomCode) return;
    getRoom(roomCode)
      .then(res => {
        const fetchedRoom = res;
        setRoom(fetchedRoom)
      })
      .catch(() => setError('Room not found.'))
  },[roomCode]);
  */

  // Keep refs updated with current state
  useEffect(() => {
    colorRef.current = color;
    brushSizeRef.current = brushSize;
  }, [color, brushSize]);

  //handler for the Invite button
  const handleInviteClick = async() => {
    if (!room) {
      alert('Room information is not available.');
      return;
    }
    const inviteLink = `${window.location.origin}/join/${room.roomCode}`;
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
      console.log("Socket.IO: Received initial-state:", lines);
      linesRef.current = lines;
      redrawCanvas();
    };

    const handleDraw = (line: DrawingLine) => {
      // Check if we already have this line
      console.log("Socket.IO: Received draw event:", line);
      // Your drawing logic here needs to accurately handle if it's a new line segment or a full new line.
      // The current logic tries to determine if it's a new line or an update.
      // If your backend always sends the *full current line* for each segment,
      // the `redrawCanvas()` in the else block is important.
      // If backend sends only the *new segment*, `drawLine` is enough.
      // Given your backend emits the `updatedLine` (full line), the `redrawCanvas` is more robust.

      const existingLineIndex = linesRef.current.findIndex(l => 
        l.color === line.color && 
        l.width === line.width && 
        // This comparison might be tricky, consider adding a unique ID for lines if possible.
        // For simplicity, we'll assume the backend sends the full updated line if an existing one is being drawn.
        // A better approach for drawing is often to just append the new point to the last line's points.
        // If it's a new line, add it.
        // For simplicity with full line updates:
        (l.points.length > 0 && line.points.length > 0 
          && l.points[0].x === line.points[0].x && 
          l.points[0].y === line.points[0].y
        )
      );
      
      if (existingLineIndex !== -1) {
        linesRef.current[existingLineIndex] = line; //replace the exsisting line with updatd one
      }else {
        linesRef.current = [...linesRef.current, line] // Add as a new line
        redrawCanvas()
      }
    };

    const handleClear = () => {
      console.log("Socket.IO: Received clear event.");
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
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the scaled canvas
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
      }, 100); // Debounce time
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
    // Prevent default touch behavior (e.g., scrolling)
    if ('touches' in e) {
      e.preventDefault();
    }

    setIsDrawing(true);
    const point = getCoordinates(e);
    lastPointRef.current = point;

    // Create new line
    const newLine: DrawingLine = {
      points: [point],
      color: colorRef.current,
      width: brushSizeRef.current
    };
    
    // Add to local lines and emit to server
    linesRef.current = [...linesRef.current, newLine];
    if (room && socket.connected) { // Only emit if room is loaded and socket is connected
      socket.emit('draw', newLine, room.roomCode);
    } else {
      console.warn("Attempted to draw but room not loaded or socket not connected.");
    }
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
      
      if (room && socket.connected) { // Only emit if room is loaded and socket is connected
        // Emit the *updated* full line. Your backend should handle this by replacing
        // or appending to the current state of that line in the database/memory.
        socket.emit('draw', updatedLine, room.roomCode);
      }
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
    if (room && socket.connected) { // Only emit if room is loaded and socket is connected
      socket.emit('clear', room.roomCode); // Notify server to clear for everyone
    } else {
      console.warn("Attempted to clear board but room not loaded or socket not connected.");
    }
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

  console.log("Whiteboard received room:", room);
  if (!room) {
    if (error) {
      return <div className="text-center mt-10 text-red-600">{error}</div>;
    }
    return <div className="text-center mt-10 text-gray-600">Loading Room...</div>;
  }


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
                                Created by: {room.owner?.username ?? 'Unknown Owner'} {/* Use 'room' prop directly */}
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
                        <RoomAdminPanel room={room} setCurrentRoom={setRoom} />
                    </div>
                )}
            </div>
    </div>
  );
};

export default Whiteboard;