import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { socket } from '../socket';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import RoomAdminPanel from './RoomAdminPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import { toast } from 'react-toastify';
import { 
    Pen, 
    Eraser, 
    Circle, 
    RectangleHorizontal, 
    PanelRight, 
    Trash2,
    Users,
    Copy,
    Palette,
    Settings,
    Sparkles,
      } from 'lucide-react';

type Point = { x: number; y: number };
type DrawingLine = {
    sentTimestamp: any;
    id: string;
    type: 'pen' | 'eraser' | 'rectangle' | 'circle';
    points?: Point[];
    startPoint?: Point;
    endPoint?: Point;
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
    const historyRef = useRef<DrawingLine[][]>([]); // A stack of drawing states
    const historyRefIndex = useRef<number>(0)
    //const redrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null); // Initialize ctxRef
    const [isPanelOpen, setIsPanelOpen] = useState(false); //New state for panel visibility
    // to tarck which tool is active
    const [activeTool,setActiveTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle'>('pen');
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0); 
    // for shape
    const startPointRef = useRef<Point | null>(null)
    const [isMobile, setIsMobile] = useState(false);
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

    //NEW : Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            return mobile;
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile)
        }
    }, []);


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
        linesRef.current.forEach((line) => {
            // Apply common styles before the type-specific logic
            ctx.lineWidth = line.width;
            ctx.strokeStyle = line.color;

            switch (line.type) {
                case 'pen':
                case 'eraser':
                    // Check for a valid points array before drawing
                    if (line.points && line.points.length >= 2) {
                        ctx.beginPath();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.moveTo(line.points[0].x, line.points[0].y);
                        for (let i = 1; i < line.points.length; i++) {
                            ctx.lineTo(line.points[i].x, line.points[i].y);
                        }
                        ctx.stroke();
                    }
                break;
                case 'rectangle':
                case 'circle':
                    // Check that startPoint and endPoint exist before drawing shapes
                    if (line.startPoint && line.endPoint) {
                        ctx.beginPath();
                        if (line.type === "rectangle") {
                            const width = line.endPoint.x - line.startPoint.x;
                            const height = line.endPoint.y - line.startPoint.y;
                            ctx.strokeRect(line.startPoint.x, line.startPoint.y, width, height);
                        } else if (line.type === "circle") {
                            const dx = line.endPoint.x - line.startPoint.x;
                            const dy = line.endPoint.y - line.startPoint.y;
                            const radius = Math.sqrt(dx * dx + dy * dy);
                            ctx.arc(line.startPoint.x, line.startPoint.y, radius,0, 2 * Math.PI);
                            ctx.stroke()
                        }
                    }
                break;
            }
        });
        console.log("--- CANVAS: redrawCanvas: Finished redrawing all lines. ---");
    }, []); // Depends on drawLine

      // This is a new, unified event handler for mouse/touch down
    const handlePointerDown = useCallback((e: PointerEvent) => {
        e.preventDefault();
        if (!e.isPrimary) return;
        
        if (!canDraw) {
            toast.warn("You don't have permission to draw yet.");
            return;
        }

        setIsDrawing(true);
        if (!canvasRef.current) return;
        
        const point = getCoordinates(e);

        if (activeTool === "pen" || activeTool === "eraser") {
            // 💡 LATENCY METRIC STEP 1: Capture start time
            const startTime = Date.now(); 
            const newLine = {
                id: Date.now().toString() + Math.random().toString(36).substring(2,9),
                type: activeTool,
                points: [point],
                color: activeTool === "eraser" ? '#FFFFFF' : colorRef.current,
                width: brushSizeRef.current,
                // 💡 LATENCY METRIC STEP 2: Attach the timestamp to the data object
                sentTimestamp: startTime 

            };
            linesRef.current = [...linesRef.current, newLine];
            lastPointRef.current = point;
            if (room && socket.connected) {
                // 💡 LATENCY METRIC STEP 3: Emit the data
                socket.emit('draw', newLine, room.roomCode); 
                // We'll log the start of the action here
                console.log(`[LATENCY SENDER] Started drawing line ${newLine.id} at ${startTime.toFixed(2)} ms.`);
            }
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
            startPointRef.current = point;
            lastPointRef.current = point;
        }
    }, [canDraw, activeTool, room]);



      // This is the new, unified event handler for mouse/touch move
    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDrawing || !canDraw) return;
        e.preventDefault();
        
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const lastPoint = lastPointRef.current;

        if (!canvas || !ctx || !lastPoint) return;
        
        const point = getCoordinates(e);

        if (activeTool === "pen" || activeTool === "eraser") {
            const lastLine = linesRef.current[linesRef.current.length - 1];
            const updatedLine = { 
                ...lastLine, 
                points: [...(lastLine.points ?? []), point] 
            };
            linesRef.current[linesRef.current.length - 1] = updatedLine;
            
            ctx.beginPath();
            ctx.lineWidth = brushSizeRef.current;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : colorRef.current;
            
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            
            if (room && socket.connected) {
                // 💡 NEW LATENCY STEP: Capture time right before sending the segment update
                const startTime = Date.now(); 
                
                // 💡 Attach the timestamp to the updated line object
                const lineWithTimestamp = {
                    ...updatedLine,
                    sentTimestamp: startTime
                }
                socket.emit('draw', lineWithTimestamp, room.roomCode);
                console.log(`[LATENCY SENDER MOVE] Emitted update for ${updatedLine.id} at ${startTime.toFixed(2)}ms`); 
            }
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
            redrawCanvas();
            ctx.beginPath();
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth = brushSizeRef.current;
            
            if (startPointRef.current) {
                if (activeTool === 'rectangle') {
                    const width = point.x - startPointRef.current.x;
                    const height = point.y - startPointRef.current.y;
                    ctx.strokeRect(startPointRef.current.x, startPointRef.current.y, width, height);
                } else if (activeTool === 'circle') {
                    const dx = point.x - startPointRef.current.x;
                    const dy = point.y - startPointRef.current.y;
                    const radius = Math.sqrt(dx * dx + dy * dy);
                    ctx.arc(startPointRef.current.x, startPointRef.current.y, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            }
        }
        lastPointRef.current = point;
    }, [isDrawing, canDraw, activeTool, room, redrawCanvas]);



    const handlePointerUp = useCallback((e: PointerEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        setIsDrawing(false);
        
        if (activeTool === 'rectangle' || activeTool === 'circle') {
            if (!startPointRef.current || !lastPointRef.current) return;
            const newShape: DrawingLine = {
                id: Date.now().toString(),
                type: activeTool,
                startPoint: startPointRef.current,
                endPoint: lastPointRef.current,
                color: colorRef.current,
                width: brushSizeRef.current,
                sentTimestamp: undefined
            };
            linesRef.current = [...linesRef.current, newShape];
            if (room && socket.connected) {
                socket.emit('draw', newShape, room.roomCode);
            }
            redrawCanvas();
        }
        
        historyRef.current.push(JSON.parse(JSON.stringify(linesRef.current)));
        historyRefIndex.current = historyRef.current.length - 1;
        lastPointRef.current = null;
        startPointRef.current = null;
    }, [isDrawing, activeTool, room, redrawCanvas]);


    const handlePointerLeave = useCallback((e: PointerEvent) => {
        if (isDrawing) {
            handlePointerUp(e);
        }
    }, [isDrawing, handlePointerUp]);


    // --- Drawing Utility Functions (useCallback for stability) --

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Add event listeners
        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
        canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            // Cleanup event listeners
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerLeave);
        };
    }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave]);

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
                    const initalPendingCount = res.members.filter((m: { status: string; }) => m.status === "pending").length;
                    console.log("DEBUG: Whiteboard: Room fetched successfully:", res);
                    setPendingRequestsCount(initalPendingCount)
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

        //Using the isMobile state for consistent sizing
        const containerWidth = container.clientWidth;
        const maxHeight = isMobile
            ? Math.min(window.innerHeight * 0.5 , 500) 
            : Math.min(container.clientHeight, window.innerHeight * 0.7);

    

        // --- IMPORTANT NEW LOGS ---
        console.log(`DEBUG INIT CALL START: clientWidth=${container.clientWidth}, clientHeight=${container.clientHeight}`);
        console.log(`DEBUG INIT CALL START: canvas.width (before set)=${canvas.width}, canvas.height (before set)=${canvas.height}`);
        // --- END IMPORTANT NEW LOGS ---

        const width = containerWidth;
        const height = maxHeight;
        
        // Update local state to trigger canvas attribute update in JSX
        //setCanvasDimensions({ width, height });

        const scale = window.devicePixelRatio || 1;
        // Set the actual pixel dimensions of the canvas drawing surface
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);

        // Set the CSS dimensions of the canvas for display
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctxRef.current = ctx; // *** CRUCIAL: Store the context in the ref ***
        redrawCanvas(); // Redraw existing lines after canvas re-initialization

        console.log(`Canvas initialized: ${width}x${height}, mobile: ${isMobile}`)
        
    }, [isMobile, redrawCanvas]); // Depends on redrawCanvas

    //initialize canvas when mobile detection changes
    useEffect(() => {
        initCanvas();
    }, [initCanvas])

    // --- Core Canvas Initialization and Resize Handling ---
    // --- Main Canvas Setup and Socket Listeners Effect ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current; // Get container ref here too
        if (!canvas || !container) {
            console.warn("DEBUG INIT EFFECT: Canvas or container ref not available yet. Waiting for mount.");
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
            linesRef.current = lines; // Update the linesRef with the server's state
            //re-sync local history with the server's state
            historyRef.current = [JSON.parse(JSON.stringify(lines))];
            historyRefIndex.current = 0;
            redrawCanvas();
        };

        const handleDraw = (line: DrawingLine) => {
            // 💡 LATENCY METRIC STEP 4: Capture end time upon receipt
            const endTime = Date.now(); 

            // --- NEW CRITICAL DEBUG LOG ---
            console.log(`[LATENCY DEBUG] Received line ID: ${line.id}. sentTimestamp received: ${line.sentTimestamp}`);
            // --- END NEW CRITICAL DEBUG LOG ---


            if (line.sentTimestamp) {
                // Calculate latency based on the segment timestamp
                const latency = endTime - line.sentTimestamp;
                
                // Only log if the latency is reasonable (e.g., less than 5 seconds)
                if (latency > 0 && latency < 5000) { 
                    console.log(`[LATENCY RECEIVER] Latency for segment: ${latency.toFixed(2)} ms.`);
                    // 🚨 RECORD THIS NUMBER 🚨
                }else {
                    // Show the huge numbers if they appear, which proves the property exists
                    console.warn(`[LATENCY WARNING] Latency calculation resulted in a large number: ${latency.toFixed(2)} ms.`);
                }
            }


            const existingLineIndex = linesRef.current.findIndex(l => l.id === line.id);

            if (existingLineIndex !== -1) {
                linesRef.current[existingLineIndex] = line;
            } else {
                linesRef.current = [...linesRef.current, line];
                console.log("--- FRONTEND: Added new line to linesRef.current. Total lines:", linesRef.current.length);
            }
            redrawCanvas();
            console.log("--- FRONTEND: redrawCanvas called after remote draw. ---");
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
            const count = updatedRoomData.members.filter(m => m.status === "pending").length;
            setPendingRequestsCount(count);
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
    const getCoordinates = (e: PointerEvent): Point => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log(`Coordinates: x=${x}, y=${y}, clientX=${e.clientX}, rect.left=${rect.left}`); // Debug log
        return { x, y };
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
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50'>
            <div className='max-w-7xl mx-auto px-4 py-6'>
                {/* Room Header */}
                <div className='bg-white rounded-2xl shadow-lg border border-slate-200/50 mb-6 p-6'>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className='text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
                                        Room: <span className='bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent'>
                                            {room.roomCode}
                                        </span>
                                    </h1>
                                    <p className='text-slate-600 text-sm'>
                                        Created by {room.owner?.username ?? 'Unknown'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='flex items-center gap-4'>
                            <div className='flex items-center gap-2'>
                                <Users className="w-5 h-5 text-slate-500" />
                                <div className='flex -space-x-2'>
                                    {room.members
                                        .filter(m => m.status === "approved")
                                        .slice(0, 3)
                                        .map((member, index) => (
                                            <div key={member.user._id || index} className='w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-400 to-fuchsia-400 border-2 border-white shadow-md'>
                                                <span className='text-white text-sm font-bold'>
                                                    {member?.user?.username?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    {room.members.filter(m => m.status === "approved").length > 3 && (
                                        <div className='w-10 h-10 rounded-full flex items-center justify-center bg-slate-200 border-2 border-white shadow-md'>
                                            <span className='text-slate-600 text-sm font-bold'>
                                                +{room.members.filter(m => m.status === "approved").length - 3}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleInviteClick}
                                className='flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105'
                            >
                                <Copy className="w-4 h-4" />
                                <span className="hidden sm:inline">Invite</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tools and Canvas Area */}
                <div className='bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6'>
                    {/* Toolbar */}
                    <div className='flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-slate-200'>
                        {canDraw && (
                            <>
                                {/* Drawing Tools */}
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                    <button
                                        onClick={() => {
                                            setColor('#000000');
                                            setActiveTool('pen');
                                        }}
                                        className={`p-3 rounded-lg transition-all duration-200 ${
                                            activeTool === 'pen'
                                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                        title="Pen"
                                    >
                                        <Pen className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setColor('#FFFFFF');
                                            setActiveTool('eraser');
                                        }}
                                        className={`p-3 rounded-lg transition-all duration-200 ${
                                            activeTool === 'eraser'
                                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                        title="Eraser"
                                    >
                                        <Eraser className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setActiveTool('rectangle')}
                                        className={`p-3 rounded-lg transition-all duration-200 ${
                                            activeTool === 'rectangle'
                                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                        title='Rectangle'
                                    >
                                        <RectangleHorizontal className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setActiveTool('circle')}
                                        className={`p-3 rounded-lg transition-all duration-200 ${
                                            activeTool === 'circle'
                                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                        title="Circle"
                                    >
                                        <Circle className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Color Picker */}
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                    <Palette className="w-5 h-5 text-slate-600" />
                                    <input
                                        type='color'
                                        value={color}
                                        className='w-12 h-10 border-2 border-slate-200 cursor-pointer rounded-lg overflow-hidden bg-white'
                                        onChange={(e) => setColor(e.target.value)}
                                        title="Color Picker"
                                    />
                                </div>

                                {/* Brush Size */}
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                    <Settings className="w-5 h-5 text-slate-600" />
                                    <select
                                        className='px-4 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 font-medium bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer'
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        title="Brush Size"
                                    >
                                        <option value={2}>Thin</option>
                                        <option value={5}>Medium</option>
                                        <option value={10}>Thick</option>
                                    </select>
                                </div>

                                {/* Clear Button */}
                                <button
                                    className='flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-105'
                                    onClick={clearBoard}
                                    title="Clear Board"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Clear</span>
                                </button>
                            </>
                        )}

                        {/* Admin Panel Toggle */}
                        {isOwner && (
                            <div className='relative ml-auto'>
                                <button
                                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                                    className={`p-3 rounded-xl transition-all duration-300 ${
                                        isPanelOpen
                                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                    title='Admin Panel'
                                >
                                    <PanelRight className='w-5 h-5' />
                                </button>
                                {pendingRequestsCount > 0 && (
                                    <span className='absolute -top-1 -right-1 inline-flex items-center justify-center h-6 w-6 text-xs font-bold text-white bg-gradient-to-br from-red-500 to-rose-500 rounded-full shadow-lg animate-pulse'>
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Permission Message */}
                        {!canDraw && (
                            <div className="w-full">
                                {renderDrawingPermissionMessage()}
                            </div>
                        )}
                    </div>

                    {/* Canvas and Admin Panel Container */}
                    <div className='flex flex-col lg:flex-row gap-6 min-h-[70vh]'>
                        {/* Canvas Container */}
                        <div
                            ref={containerRef}
                            className={`relative bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-inner border-2 border-slate-200 overflow-hidden transition-all duration-300 ${
                                isPanelOpen ? 'lg:w-2/3' : 'w-full'
                            }`}
                        >
                            <canvas
                                ref={canvasRef}
                                className='w-full h-full cursor-crosshair'
                                style={{
                                    touchAction: 'none',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: 'none'
                                }}
                            />
                            
                            {/* Canvas Watermark */}
                            {!canDraw && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="bg-slate-900/5 backdrop-blur-sm px-6 py-3 rounded-xl border border-slate-300/50">
                                        <p className="text-slate-500 font-medium">View Only Mode</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Admin Panel */}
                        {isOwner && isPanelOpen && (
                            <div className="lg:w-1/3 bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-lg border border-slate-200 p-6 overflow-y-auto max-h-[70vh]">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                    <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg">
                                        <Settings className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">Admin Panel</h2>
                                </div>
                                <RoomAdminPanel room={room} setCurrentRoom={setRoom} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;