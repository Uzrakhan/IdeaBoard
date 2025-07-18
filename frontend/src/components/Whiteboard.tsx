import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { socket } from '../socket';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import RoomAdminPanel from './RoomAdminPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import { toast } from 'react-toastify';

type Point = { x: number; y: number };
type DrawingLine = {
    id: string;
    points: Point[];
    color: string;
    width: number;
};

const Whiteboard: React.FC = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [error, setError] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    const lastPointRef = useRef<Point | null>(null);
    const linesRef = useRef<DrawingLine[]>([]);
    //const redrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null); // Initialize ctxRef
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 }); // This state is actually for the <canvas> attributes

    const { currentUser } = useAuth();

    const isOwner = currentUser && room?.owner?._id === currentUser._id;
    const canDraw = isOwner || (
        currentUser && room?.members.some(member =>
            member.user._id === currentUser._id && member.status === 'approved'
        )
    );

    console.log('Current User from AuthContext:', currentUser);
    console.log('Current room state:', room);
    console.log('Can Draw:', canDraw);

    // --- Room Data Fetching ---
    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (!roomCode) {
                setError('No room code provided.');
                navigate('/');
                console.error("DEBUG: No roomCode found in URL. Redirecting.");
                return;
            }
            try {
                console.log("DEBUG: Whiteboard: Attempting to fetch room details for:", roomCode);
                const res = await getRoom(roomCode);

                if (res) {
                    setRoom(res);
                    console.log("DEBUG: Whiteboard: Room fetched successfully:", res);
                } else {
                    throw new Error(res?.message || "Room data not found in response.");
                }
            } catch (err: any) {
                console.error("DEBUG: Whiteboard: Failed to fetch room details due to an error:", err);
                const errorMessage = err.response?.data?.message || "Failed to load room."
                setError(errorMessage);
                toast.error(errorMessage)
                navigate('/');
                console.error("DEBUG: Whiteboard: Redirecting to homepage due to fetch error.");
            }
        };
        fetchRoomDetails();
    }, [roomCode, navigate]);

    // Keep refs updated with current state
    useEffect(() => {
        colorRef.current = color;
        brushSizeRef.current = brushSize;
    }, [color, brushSize]);

    //to handle invite click
    const handleInviteClick = async (): Promise<void> => {
        if (!room) {
            alert('Room information is not available.');
            return;
        }

        const inviteLink = `${window.location.origin}/join/${room.roomCode}`;
        console.log("Attempting to copy link:", inviteLink);
        try{
            await navigator.clipboard.writeText(inviteLink);
            alert('Room link copied to clipboard');
            console.log('Link copied successfully!');
        } catch(err) {
            console.error('Failed to copy text:', err);
            prompt("Please copy this link manually:", inviteLink);
            alert('Failed to automatically copy link. Please use the prompt to copy manually.');
        }
    }

    // --- Drawing Utility Functions (useCallback for stability) ---

    // Define drawLine outside of useEffect so it's stable
    const drawLine = useCallback((ctx: CanvasRenderingContext2D, line: DrawingLine) => {
        if (line.points.length === 0) {
            console.warn(`--- DRAWLINE: Line ID ${line.id} has no points, skipping draw. ---`);
            return;
        }

        ctx.beginPath();
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = line.color;

        console.log(`--- DRAWLINE: Setting style for line ${line.id}: Color=${line.color}, Width=${line.width} ---`);

        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
            ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.stroke();
        console.log(`--- DRAWLINE: Line ${line.id} stroke completed. ---`);
    }, []); // No dependencies, as it only uses its arguments

    // Define redrawCanvas outside of useEffect so it's stable
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current; // Use the stored context
        if (!canvas || !ctx) {
            console.warn("--- CANVAS: redrawCanvas: Canvas or context not available. ---");
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log("--- CANVAS: redrawCanvas: Canvas cleared. ---");
        console.log(`--- CANVAS: redrawCanvas: Attempting to draw ${linesRef.current.length} lines. ---`);
        linesRef.current.forEach((line, index) => {
            console.log(`--- CANVAS: redrawCanvas: Drawing line ${index + 1}/${linesRef.current.length} (ID: ${line.id}, Points: ${line.points.length}) ---`);
            drawLine(ctx, line);
        });
        console.log("--- CANVAS: redrawCanvas: Finished redrawing all lines. ---");
    }, [drawLine]); // Depends on drawLine


    // Define initCanvas outside of useEffect, using useCallback for stability
    const initCanvas = useCallback(() => {
        if (!containerRef.current || !canvasRef.current) {
            console.warn("DEBUG INIT: containerRef or canvasRef not available during initCanvas.");
            return;
        }

        const container = containerRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("DEBUG INIT: Failed to get 2D context from canvas!");
            return;
        }

        // --- IMPORTANT NEW LOGS ---
        console.log(`DEBUG INIT CALL START: clientWidth=${container.clientWidth}, clientHeight=${container.clientHeight}`);
        console.log(`DEBUG INIT CALL START: canvas.width (before set)=${canvas.width}, canvas.height (before set)=${canvas.height}`);
        // --- END IMPORTANT NEW LOGS ---


        const width = container.clientWidth;
        const height = Math.min(container.clientHeight, window.innerHeight * 0.7);

        // Update local state to trigger canvas attribute update in JSX
        setCanvasDimensions({ width, height });

        const scale = window.devicePixelRatio || 1;
        // Set the actual pixel dimensions of the canvas drawing surface
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);

        // Set the CSS dimensions of the canvas for display
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(scale, scale);
        ctxRef.current = ctx; // *** CRUCIAL: Store the context in the ref ***

        redrawCanvas(); // Redraw existing lines after canvas re-initialization

        // --- IMPORTANT NEW LOGS ---
        console.log(`DEBUG INIT CALL END: Final Canvas Pixel Width (attribute): ${canvas.width}`);
        console.log(`DEBUG INIT CALL END: Final Canvas Pixel Height (attribute): ${canvas.height}`);
        // --- END IMPORTANT NEW LOGS ---
        
    }, [redrawCanvas]); // Depends on redrawCanvas

    // --- Main Canvas Setup and Socket Listeners Effect ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current; // Get container ref here too
        if (!canvas || !container || !room || !socket.connected) {
            console.log("DEBUG: Main useEffect waiting for refs, room, or socket connection.");
            return;
        }

        // Initialize canvas when dependencies are ready
        initCanvas();

        // Setup ResizeObserver for robust resizing
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target === container) {
                    console.log("DEBUG: Container resized! Re-initializing canvas via ResizeObserver.");
                    initCanvas();
                }
            }
        });
        resizeObserver.observe(container);

        // Socket.IO Drawing Event Handlers
        const handleInitialState = (lines: DrawingLine[]) => {
            console.log("Socket.IO: Received initial-state:", lines);
            linesRef.current = lines;
            redrawCanvas();
        };

        const handleDraw = (line: DrawingLine) => {
            console.log("--- FRONTEND: Received remote draw event! ---");
            const existingLineIndex = linesRef.current.findIndex(l => l.id === line.id);

            if (existingLineIndex !== -1) {
                linesRef.current[existingLineIndex] = line;
                console.log("--- FRONTEND: Updated existing line in linesRef.current. ---");
            } else {
                linesRef.current = [...linesRef.current, line];
                console.log("--- FRONTEND: Added new line to linesRef.current. ---");
            }
            redrawCanvas();
        };

        const handleClear = () => {
            console.log("Socket.IO: Received clear event.");
            linesRef.current = [];
            // Use ctxRef.current for clearing
            if (ctxRef.current && canvasRef.current) {
                 ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };

        socket.on('initial-state', handleInitialState);
        socket.on('draw', handleDraw);
        socket.on('clear', handleClear);

        // Cleanup
        return () => {
            console.log("DEBUG: Cleaning up canvas/socket listeners.");
            resizeObserver.disconnect(); // Disconnect ResizeObserver
            socket.off('initial-state', handleInitialState);
            socket.off('draw', handleDraw);
            socket.off('clear', handleClear);
        };
    }, [socket, room, initCanvas, redrawCanvas]); // Added initCanvas and redrawCanvas as dependencies


    // --- Socket.IO Connection (Separate Effect for clarity) ---
    useEffect(() => {
        if (!roomCode || !currentUser) {
            console.log("Socket.IO: Waiting for roomCode or currentUser to connect socket.");
            return;
        }

        if (!socket.connected) {
            console.log("Socket.IO: Attempting to connect for room:", roomCode);
            socket.connect()
        }

        socket.on('connect', () => {
            console.log('Socket.IO: Connected successfully! Socket ID:', socket.id);
            console.log(`Socket.IO: Emitting 'joinRoomChannel' for room ${roomCode} with user ${currentUser._id}`);
            socket.emit('joinRoomChannel', { roomCode, userId: currentUser._id });
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO: Disconnected. Reason:', reason);
            if (reason === "io server disconnect" || reason === "io client disconnect") {
                toast.info('Disconnected from room. Please refresh if issue persists.')
            } else {
                toast.error('Lost connection to the room. Attempting to reconnect...')
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO: Connection error:', error);
            toast.error(`Connection error: ${error.message}`)
        });

        socket.on('roomUpdated', ({ room: updatedRoomData }: { room: Room }) => {
            console.log('Socket.IO: Received roomUpdated:', updatedRoomData);
            setRoom(updatedRoomData)
        });

        socket.on('room:joinRequest', (data: { roomCode: string; requester: string; requesterId: string }) => {
            console.log('Socket.IO: Received new join request:', data);
            toast.info(`New join request for room ${data.roomCode} from ${data.requester}!`);
        });

        socket.on('room:memberUpdate', (data: { roomCode: string; memberId: string; status: string; username: string; message?: string }) => {
            console.log('Socket.IO: Received member update:', data);
            toast.info(data.message || `${data.username}'s status updated to ${data.status}`)
        });

        socket.on('yourRoomStatusUpdated', (data: { roomCode: string; status: string; message?: string }) => {
            console.log(`Socket.IO: Your status in room ${data.roomCode} updated to ${data.status}.`);
            if (data.status === "approved") {
                toast.success(data.message || `You have been approved for room ${data.roomCode}!`)
            } else if (data.status === "rejected") {
                toast.error(data.message || `Your request for room ${data.roomCode} was rejected.`)
            }
        })

        return () => {
            console.log("Socket.IO: Disconnecting and cleaning up listeners.");
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('roomUpdated')
            socket.off('room:joinRequest');
            socket.off('room:memberUpdate');
            socket.off('yourRoomStatusUpdated')
            socket.disconnect();
        };
    }, [roomCode, currentUser]); // Dependencies for socket connection


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

        // Return coordinates relative to the canvas's CSS size
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    // Start drawing
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) {
            toast.warn("You don't have permission to draw yet. Please wait for the room owner to approve your request.");
            console.log("Drawing prevented: User does not have permission.");
            return;
        }

        console.log('*** EVENT: startDrawing triggered! ***', e.type);
        if ('touches' in e) {
            e.preventDefault();
        }

        setIsDrawing(true);
        const point = getCoordinates(e);
        lastPointRef.current = point;

        const newLine: DrawingLine = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            points: [point],
            color: colorRef.current,
            width: brushSizeRef.current
        };

        linesRef.current = [...linesRef.current, newLine];
        if (room && socket.connected) {
            socket.emit('draw', newLine, room.roomCode);
        } else {
            console.warn("Attempted to draw but room not loaded or socket not connected.");
        }
    };

    // Draw while moving
    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw || !isDrawing || !lastPointRef.current) {
            return; 
        }

        console.log('*** EVENT: draw (mousemove/touchmove) triggered! ***', e.type);

        const canvas = canvasRef.current;
        const ctx = ctxRef.current; // Use the stored context
        if (!canvas || !ctx) return;

        const point = getCoordinates(e);

        ctx.beginPath();
        ctx.lineWidth = brushSizeRef.current;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorRef.current;
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        console.log('*** CANVAS: Local drawing stroke performed! ***');


        if (linesRef.current.length > 0) {
            const lastLine = linesRef.current[linesRef.current.length - 1];
            const updatedLine: DrawingLine = {
                ...lastLine,
                points: [...lastLine.points, point]
            };

            linesRef.current = [
                ...linesRef.current.slice(0, -1),
                updatedLine
            ];

            if (room && socket.connected) {
                socket.emit('draw', updatedLine, room.roomCode);
                console.log('*** SOCKET: Emitted updated line segment! ***', updatedLine.id, updatedLine.points.length);
            }
        }

        lastPointRef.current = point;
    };

    // Stop drawing
    const endDrawing = () => {
        console.log('*** EVENT: endDrawing triggered! ***');
        setIsDrawing(false);
        lastPointRef.current = null;
    };

    // Clear the board
    const clearBoard = () => {
        if (!canDraw) { 
            toast.warn("Only approved members or the owner can clear the board.");
            console.log("Clear board prevented: User does not have permission.");
            return;
        }

        const canvas = canvasRef.current;
        const ctx = ctxRef.current; // Use the stored context
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        linesRef.current = [];
        if (room && socket.connected) {
            socket.emit('clear', room.roomCode);
        } else {
            console.warn("Attempted to clear board but room not loaded or socket not connected.");
        }
    };

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!canDraw) {
            toast.warn("You don't have permission to draw yet. Please wait for the room owner to approve your request.");
            return;
        }
        e.preventDefault();
        startDrawing(e);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!canDraw) {
            return;
        }
        e.preventDefault();
        draw(e);
    };

    // Display a message if drawing is not allowed
    const renderDrawingPermissionMessage = () => {
        if (!room) return null; // Room not loaded yet

        const isCurrentUserApproved = room.members.some(member =>
            currentUser && member.user._id === currentUser._id && member.status === 'approved'
        );
        const isCurrentUserPending = room.members.some(member =>
            currentUser && member.user._id === currentUser._id && member.status === 'pending'
        );

        if (isOwner || isCurrentUserApproved) {
            return null; // Owner or approved member, no message needed
        }

        if (isCurrentUserPending) {
            return (
                <p className="text-yellow-600 bg-yellow-100 p-2 rounded text-center text-sm mt-4">
                    Your request to join and draw is pending. Please wait for the room owner's approval.
                </p>
            );
        }

        // If user is neither owner, approved, nor pending (e.g., just viewing as an unapproved guest)
        return (
            <p className="text-red-600 bg-red-100 p-2 rounded text-center text-sm mt-4">
                You do not have permission to draw on this whiteboard.
            </p>
        );
    };


    if (!room) {
        if (error) {
            return <div className="text-center mt-10 text-red-600">{error}</div>;
        }
        return <div className="text-center mt-10 text-gray-600">Loading Room...</div>;
    }


    return (
        <div className='bg-gray-100 min-h-screen font-inter'>
            <div className='max-w-7xl mx-auto px-4 py-6'>
                <div className='bg-white rounded-xl shadow-md mb-6 p-4'>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h1 className='text-xl font-bold text-gray-800'>
                                Collaboration Room: <span className='text-indigo-600'>
                                    {room.roomCode}
                                </span>
                            </h1>
                            <p className='text-gray-600'>
                                Created by: {room.owner?.username ?? 'Unknown Owner'}
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
                        {/* Only show these controls if the user *can* draw */}
                        {canDraw && (
                            <>
                                <div className="flex items-center space-x-2">
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
                            </>
                        )}
                        {!canDraw && (
                            <p className="text-gray-500 text-sm italic">
                                Drawing tools will appear once you are approved by the room owner.
                            </p>
                        )}
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="bg-white rounded-xl shadow-md overflow-hidden"
                    style={{ height: '500px' }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={canDraw ? startDrawing : undefined}
                        onMouseMove={canDraw ? draw : undefined}
                        onMouseUp={canDraw ? endDrawing : undefined}
                        onMouseLeave={canDraw ? endDrawing : undefined}
                        onTouchStart={canDraw ? handleTouchStart : undefined}
                        onTouchMove={canDraw ? handleTouchMove : undefined}
                        onTouchEnd={canDraw ? endDrawing : undefined}
                        className={`w-full h-full border border-gray-200 ${canDraw ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
                        width={canvasDimensions.width}
                        height={canvasDimensions.height}
                    />
                    {renderDrawingPermissionMessage()}
                </div>

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