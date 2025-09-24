import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { socket } from '../socket';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import RoomAdminPanel from './RoomAdminPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import { toast } from 'react-toastify';
import { Pen, Eraser, Circle, RectangleHorizontal, PanelRight  } from 'lucide-react';

type Point = { x: number; y: number };
type DrawingLine = {
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
            const newLine = {
                id: Date.now().toString() + Math.random().toString(36).substring(2,9),
                type: activeTool,
                points: [point],
                color: activeTool === "eraser" ? '#FFFFFF' : colorRef.current,
                width: brushSizeRef.current
            };
            linesRef.current = [...linesRef.current, newLine];
            lastPointRef.current = point;
            if (room && socket.connected) {
                socket.emit('draw', newLine, room.roomCode);
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
                socket.emit('draw', updatedLine, room.roomCode);
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
                width: brushSizeRef.current
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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
    };

    /*
    // Start drawing
    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        console.log(`DEBUG: Event Handler Triggered: startDrawing (type: ${e.type})`);
        // Crucial: Use e.preventDefault() to block default browser behavior
        // and check for the primary pointer to prevent multi-touch issues.
        e.preventDefault();
        e.stopPropagation();
        if (!e.isPrimary) return;

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

        if(activeTool === "pen" || activeTool === "eraser") {
            const newLine: DrawingLine = {
                id: Date.now().toString() + Math.random().toString(36).substring(2,9),
                type: activeTool,
                points: [point],
                color: activeTool === "eraser" ? '#FFFFFF' : colorRef.current,
                width: brushSizeRef.current
            };
            linesRef.current = [...linesRef.current, newLine];
            lastPointRef.current = point;

            console.log("FRONTEND: Initial line added to linesRef:", linesRef.current.length, linesRef.current[linesRef.current.length - 1].id);
            if (room && socket.connected) {
                socket.emit('draw', newLine, room.roomCode);
                console.log('*** SOCKET: Emitted initial line! ***', newLine.id);
            }
        } else if(activeTool === 'rectangle' || activeTool === 'circle'){
            startPointRef.current = point;
        }
    };

    // Draw while moving
    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        console.log(`DEBUG: Event Handler Triggered: draw (type: ${e.type})`);

        console.log(`DEBUG DRAW CHECK: canDraw=${canDraw}, isDrawing=${isDrawing}, lastPointRef.current=${lastPointRef.current ? 'true' : 'false'}`);
        e.preventDefault();
        e.stopPropagation()

        if (!canDraw || !isDrawing) return;

        console.log('*** EVENT: draw (mousemove/touchmove) triggered! ***', e.type);

        const canvas = canvasRef.current;
        const ctx = ctxRef.current; // Use the stored context

        // --- NEW LOGS HERE ---
        console.log(`DEBUG DRAW CHECK: canvasRef.current=${canvas ? 'true' : 'false'}, ctxRef.current=${ctx ? 'true' : 'false'}`);
        // --- END NEW LOGS ---

        if (!canvas || !ctx) {
            console.warn("DRAW Function: Early exit due to missing canvas or context."); // <-- NEW LOG
            return;
        }

        const point = getCoordinates(e);

        if (activeTool === "pen"|| activeTool === "eraser") {
            const lastLine = linesRef.current[linesRef.current.length - 1];

            // Ensure lastLine exists and has a points array
            if (!lastLine || !lastLine.points) {
                console.warn("DRAW Function: Cannot update line. Last line is not a pen/eraser line or has no points.");
                return;
            }

            // Correctly update the points array
            const updatedLine: DrawingLine = {
                ...lastLine,
                points: [...lastLine.points, point]
            };
            linesRef.current[linesRef.current.length - 1] = updatedLine;
            ctx.beginPath();
            ctx.lineWidth = brushSizeRef.current;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : colorRef.current;
            ctx.moveTo(lastPointRef.current!.x, lastPointRef.current!.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            console.log('*** CANVAS: Local drawing stroke performed! ***');
            if (room && socket.connected) {
                socket.emit('draw', updatedLine, room.roomCode);
            }
        }else if(activeTool === 'rectangle' || activeTool === 'circle'){
                // Redraw canvas with temporary shape for real-time feedback
                redrawCanvas();
                ctx.beginPath();
                ctx.strokeStyle = colorRef.current;
                ctx.lineWidth = brushSizeRef.current;

                if (activeTool === 'rectangle') {
                    const width = point.x - startPointRef.current!.x;
                    const height = point.y - startPointRef.current!.y;
                    ctx.strokeRect(startPointRef.current!.x, startPointRef.current!.y, width, height);
                } else if (activeTool === 'circle') {
                    const dx = point.x - startPointRef.current!.x;
                    const dy = point.y - startPointRef.current!.y;
                    const radius = Math.sqrt(dx * dx + dy * dy);
                    ctx.arc(startPointRef.current!.x, startPointRef.current!.y, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            }
            // ✅ The crucial fix: Always update lastPointRef.current at the end of the function
        lastPointRef.current = point;
    };

    // Stop drawing
    const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        console.log('DEBUG: Event Handler Triggered: endDrawing');
        e.preventDefault();
        e.stopPropagation()
        if (!canDraw || !isDrawing) { // Add this line if it's not there
            return;
        }
        console.log('*** EVENT: endDrawing triggered! ***');

        if (activeTool === 'rectangle' || activeTool === 'circle') {
            if (!startPointRef.current || !lastPointRef.current) return;
            const newShape: DrawingLine = {
                id: Date.now().toString(),
                type: activeTool,
                startPoint: startPointRef.current,
                endPoint: lastPointRef.current,
                color: colorRef.current,
                width: brushSizeRef.current
            };
            linesRef.current = [...linesRef.current, newShape];

            // ✅ Add a null check for 'room' before attempting to use it
            if (room && socket.connected) {
                socket.emit('draw', newShape, room.roomCode)
            }

            // NEW HISTORY LOGIC
            // If the history is not at the end, truncate it before adding the new state
            historyRef.current = historyRef.current.slice(0, historyRefIndex.current + 1);

            // Push the new state onto the history stack
            historyRef.current.push(JSON.parse(JSON.stringify(linesRef.current)));

            // Update the history index
            historyRefIndex.current = historyRef.current.length - 1;

            if (activeTool === 'rectangle' || activeTool === 'circle') {
                redrawCanvas();
            }
        }
        setIsDrawing(false);
        lastPointRef.current = null;
        startPointRef.current = null;
    };
    */

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

    /*
    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        console.log('DEBUG: Event Handler Triggered: handleTouchStart'); // <-- ADD THIS LOG
        if (!canDraw) {
            toast.warn("You don't have permission to draw yet. Please wait for the room owner to approve your request.");
            return;
        }
        e.preventDefault();
        startDrawing(e);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        console.log('DEBUG: Event Handler Triggered: handleTouchMove'); // <-- ADD THIS LOG
        if (!canDraw) {
            return;
        }
        e.preventDefault();
        draw(e);
    };
    */


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
                                        onClick={() => { 
                                            setColor('#000000')
                                            setActiveTool('pen');
                                        }}
                                        className={`p-2 rounded ${activeTool === 'pen' ? 'bg-indigo-200' : 'bg-gray-200'}`}
                                        title="Black Pen"
                                    >
                                        <Pen className="w-5 h-5 text-gray-700" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setColor('#FFFFFF')
                                            setActiveTool('eraser');
                                        }}
                                        className={`p-2 rounded ${activeTool === 'eraser' ? 'bg-indigo-200' : 'bg-gray-200'}`}
                                        title="Eraser (White)"
                                    >
                                        <Eraser className="w-5 h-5 text-gray-700" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveTool('rectangle')
                                        }}
                                        className={`p-2 rounded ${activeTool === 'rectangle' ? 'bg-indigo-200' : 'bg-gray-200'}`}
                                        title='Rectangle Tool'
                                    >
                                        <RectangleHorizontal className="w-5 h-5 text-gray-700" />
                                    </button>
                                    <button
                                        onClick={() => setActiveTool('circle')}
                                        className={`p-2 rounded ${activeTool === 'circle' ? 'bg-indigo-200' : 'bg-gray-200'}`}
                                        title="Circle Tool"
                                    >
                                        <Circle className="w-5 h-5 text-gray-700" />
                                    </button>
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
                                    <button
                                        className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium shadow-md'
                                        onClick={clearBoard}
                                        title="Clear Board"
                                    >
                                        Clear Board
                                    </button>
                                </div>
                            </>
                        )}
                        {isOwner && (
                            <div className='relative'>
                                <button
                                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                                    className={`p-2 rounded-lg ml-auto transition-colors ${isPanelOpen ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-700'}`}
                                    title='Admin Panel'
                                >
                                    <PanelRight className='w-5 h-5'/>
                                </button>
                                {pendingRequestsCount > 0 && (
                                    <span className='absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full'>
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </div>
                        )}
                        {renderDrawingPermissionMessage()}
                    </div>

                    {/* Main drawing and admin panel area */}
                    <div className='flex flex-col md:flex-row h-[70vh]'>
                        <div
                            ref={containerRef}
                            className={`relative bg-white rounded-xl shadow-md ${isPanelOpen ? 'md:w-3/4' : 'w-full'} transition-all duration-300 ease-in-out`}
                        >
                            <canvas
                                ref={canvasRef}
                                className='w-full h-full cursor-crosshair drawing-canvas'
                                style={{
                                    touchAction: 'none',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: 'none'
                                }}
                            />
                        </div>
                        {/* The side panel */}
                        {isOwner && isPanelOpen && (
                            <div className="md:w-1/4 md:border-l md:border-gray-200 p-4 overflow-y-auto bg-white rounded-xl shadow-md ml4 mt-4 md:mt-0">
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