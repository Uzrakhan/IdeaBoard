import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Pen,
    Eraser,
    Circle,
    Square,
    Trash2,
    Users,
    Settings,
    Hand,
    ZoomIn,
    ZoomOut,
    Maximize2,
    MousePointer2,
} from 'lucide-react';
import { socket } from '../socket';
import { getRoom } from '../api';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import RoomAdminPanel from './RoomAdminPanel';
import type { Room } from '../types/index';

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



type ToolType = 'select' | 'hand' | 'pen' | 'eraser' | 'rectangle' | 'circle';


const Whiteboard = () => {
    const lastEmitRef = useRef(0);
    const EMIT_INTERVAL = 30;
 

    const { roomCode } = useParams<{ roomCode: string }>();
    const { currentUser } = useAuth();

    const [room,setRoom] = useState<Room | null>(null)
    const [pendingRequests, setPendingRequests] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);


    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- States ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [activeTool, setActiveTool] = useState<ToolType>('pen');
    const [openPanel, setOpenPanel] = useState<string | null>(null);

    // --- Refs ---
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    const lastPointRef = useRef<Point | null>(null);
    const startPointRef = useRef<Point | null>(null);
    const linesRef = useRef<DrawingLine[]>([]);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isPanningRef = useRef(false);
    const lastPanPointRef = useRef<Point | null>(null);

    // --- Color palette ---
    const strokeColors = [
        '#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
        '#ffffff'
    ];

    /*
    const backgroundColors = [
        '#ffffff', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
        'transparent'
    ];
    */

    //const strokeWidths = [1, 2, 4];
    //const strokeStyles = ['solid', 'dashed', 'dotted'];

    // Keep refs updated
    useEffect(() => {
        colorRef.current = color;
        brushSizeRef.current = brushSize;
    }, [color, brushSize]);

    // ---------- DRAW REDRAW ----------
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        linesRef.current.forEach((line) => {
            ctx.lineWidth = line.width;
            ctx.strokeStyle = line.color;

            switch (line.type) {
                case 'pen':
                case 'eraser':
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
                    if (line.startPoint && line.endPoint) {
                        const w = line.endPoint.x - line.startPoint.x;
                        const h = line.endPoint.y - line.startPoint.y;
                        ctx.strokeRect(line.startPoint.x, line.startPoint.y, w, h);
                    }
                    break;
                case 'circle':
                    if (line.startPoint && line.endPoint) {
                        const dx = line.endPoint.x - line.startPoint.x;
                        const dy = line.endPoint.y - line.startPoint.y;
                        const radius = Math.sqrt(dx * dx + dy * dy);
                        ctx.beginPath();
                        ctx.arc(line.startPoint.x, line.startPoint.y, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
            }
        });

        ctx.restore();
    }, [pan.x, pan.y, zoom]);

    // ---------- GET COORDS ----------
    const getCanvasCoordinates = useCallback((e: PointerEvent): Point => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    }, [pan.x, pan.y, zoom]);

    // ---------- EVENTS ----------
    /// CAN USER DRAW
    const canDraw = room && currentUser && 
        (room.owner._id === currentUser._id ||
            room.members.some(
                (m) => m.user._id === currentUser._id && m.status === "approved"
            )
        )

    const handlePointerDown = useCallback((e: PointerEvent) => {
        if (!canDraw && activeTool !== 'hand' && activeTool !== 'select') {
            toast.warn('You are not approved to draw.');
            return;
        }

        if (activeTool === 'hand') {
            isPanningRef.current = true;
            lastPanPointRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (activeTool === 'select') return;

        setIsDrawing(true);

        const point = getCanvasCoordinates(e);

        if (activeTool === 'pen' || activeTool === 'eraser') {
            const newLine: DrawingLine ={
                id: crypto.randomUUID(),
                type: activeTool,
                points: [point],
                color: activeTool === 'eraser' ? '#FFFFFF' : colorRef.current,
                width: brushSizeRef.current,
                sentTimestamp: Date.now()
            }
            linesRef.current.push(newLine);
            if (room) socket.emit('draw', newLine, room.roomCode);
        } else {
            startPointRef.current = point;
        }

        lastPointRef.current = point;
    }, [activeTool, getCanvasCoordinates, room, canDraw]);

    const handlePointerMove = useCallback((e: PointerEvent) => {

        if (activeTool === 'hand' && isPanningRef.current) {
            const dx = e.clientX - lastPanPointRef.current!.x;
            const dy = e.clientY - lastPanPointRef.current!.y;
            setPan(p => {
                const newPan = { x: p.x + dx, y: p.y + dy };

                const now = Date.now();
                if (roomCode && now - lastEmitRef.current > EMIT_INTERVAL) {
                    socket.emit("whiteboard:pan", {
                        roomCode,
                        pan: newPan
                    });
                    lastEmitRef.current = now;
                }


                return newPan;
            });
            lastPanPointRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (!isDrawing) return;
        const ctx = ctxRef.current;
        const lastPoint = lastPointRef.current;
        if (!ctx || !lastPoint) return;

        const point = getCanvasCoordinates(e);

        if (activeTool === 'pen' || activeTool === 'eraser') {
            const lastLine = linesRef.current[linesRef.current.length - 1];
            lastLine.points!.push(point);

            // live draw
            redrawCanvas();
            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);
            ctx.beginPath();
            ctx.lineWidth = brushSizeRef.current;
            ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : colorRef.current;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            ctx.restore();

            if (room) socket.emit(
                'draw', 
                { ...lastLine, sentTimeStamp: Date.now() },
                room.roomCode
            );
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
            redrawCanvas();
            const ctx2 = ctxRef.current!;
            ctx2.save();
            ctx2.translate(pan.x, pan.y);
            ctx2.scale(zoom, zoom);
            ctx2.beginPath();
            ctx2.lineWidth = brushSizeRef.current;
            ctx2.strokeStyle = colorRef.current;

            if (startPointRef.current) {
                if (activeTool === 'rectangle') {
                    ctx2.strokeRect(
                        startPointRef.current.x,
                        startPointRef.current.y,
                        point.x - startPointRef.current.x,
                        point.y - startPointRef.current.y
                    );
                } else {
                    const dx = point.x - startPointRef.current.x;
                    const dy = point.y - startPointRef.current.y;
                    const radius = Math.sqrt(dx * dx + dy * dy);
                    ctx2.arc(startPointRef.current.x, startPointRef.current.y, radius, 0, Math.PI * 2);
                    ctx2.stroke();
                }
            }
            ctx2.restore();
        }

        lastPointRef.current = point;
    }, [isDrawing, activeTool, getCanvasCoordinates, redrawCanvas, pan.x, pan.y, zoom, room]);

    const handlePointerUp = useCallback(() => {
        if (activeTool === 'hand') {
            isPanningRef.current = false;
            return;
        }

        if (!isDrawing) return;
        setIsDrawing(false);

        if (activeTool === 'rectangle' || activeTool === 'circle') {
            if (!startPointRef.current || !lastPointRef.current) return;

            const newShape: DrawingLine = {
                id: crypto.randomUUID(),
                type: activeTool,
                startPoint: startPointRef.current,
                endPoint: lastPointRef.current,
                color: colorRef.current,
                width: brushSizeRef.current,
                sentTimestamp: undefined
            }
            linesRef.current.push(newShape);

            if (room) socket.emit('draw', newShape, room.roomCode);
        }

        startPointRef.current = null;
        lastPointRef.current = null;
        redrawCanvas();
    }, [isDrawing, activeTool, redrawCanvas, room]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        const zoomDelta = e.deltaY * -0.001;
        const newZoom = Math.min(5, Math.max(0.2, zoom + zoomDelta));

        setZoom(newZoom);

        const now = Date.now();
        if (roomCode && now - lastEmitRef.current > EMIT_INTERVAL) {
            socket.emit("whiteboard:zoom", {
                roomCode,
                zoom: newZoom
            });
            lastEmitRef.current = now;
        }
    }, [zoom, roomCode]);


    // ---------- ATTACH EVENTS ----------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
        canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

    // ---------- CANVAS INIT ----------
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;

        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(scale, scale);
        ctxRef.current = ctx;

        redrawCanvas();
    }, [redrawCanvas]);

    // ---------- CLEAR ----------
    const clearBoard = () => {
        linesRef.current = [];
        redrawCanvas();
    };

    const resetView = () => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleToolClick = (tool: ToolType) => {
        if (activeTool === tool && openPanel === tool) {
            setOpenPanel(null);
        } else {
            setActiveTool(tool);
            if (['pen', 'rectangle', 'circle'].includes(tool)) {
                setOpenPanel(tool);
            } else {
                setOpenPanel(null);
            }
        }
    };

    const ToolButton = ({ tool, icon: Icon, label }: { tool: ToolType; icon: React.ElementType; label: string }) => (
        <button
            onClick={() => handleToolClick(tool)}
            className={`p-2.5 rounded-lg transition-all ${
                activeTool === tool
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={label}
        >
            <Icon className="w-5 h-5" />
        </button>
    );


    // ⬇️ When someone joins and is not approved → they create a join request
    useEffect(() => {
        if (!socket.connected) socket.connect();

        socket.on("connect", () => {
            console.log("Socket connected: ", socket.id);

            if (roomCode && currentUser) {
                socket.emit("joinRoomChannel", {
                    roomCode,
                    userId: currentUser._id
                })
            }
        });

        socket.on("initial-state", (lines) => {
            linesRef.current = lines;
            redrawCanvas();
        });


        socket.on("draw", (line) => {
            const idx = linesRef.current.findIndex((l) => l.id === line.id);
            if (idx !== -1) linesRef.current[idx] = line;
            else linesRef.current.push(line);

            redrawCanvas();
        });

        socket.on("clear", () => {
            linesRef.current = [];
            redrawCanvas();
        });

        socket.on("whiteboard:stateUpdate", ({ pan, zoom }) => {
            if (pan) setPan(pan);
            if (zoom) setZoom(zoom);
        });



        socket.on("roomUpdated", ({ room }) => {
            setRoom(room);

            const pending = room.members.filter(
                (m: { status: string; }) => m.status === "pending"
            ).length;

            setPendingRequests(pending);
        });

        socket.on("room:joinRequest", (data) => {
            toast.info(`${data.requester} requested to join`);
            setPendingRequests((n) => n + 1);
        });


        socket.on("yourRoomStatusUpdated", (data) => {
            if (data.status === "approved") {
                toast.success("You are approved!");
            } else if (data.status === "rejected") {
                toast.error("Your request was rejected.");
            }
        });


        return () => {
            socket.off("connect");
            socket.off("draw");
            socket.off("clear");
            socket.off("initial-state");
            socket.off("roomUpdated");
            socket.off("room:joinRequest");
            socket.off("yourRoomStatusUpdated");
            socket.off("whiteboard:stateUpdate");
        }
    }, [roomCode, currentUser, redrawCanvas]);



    // FETCH ROOM DETAILS
    useEffect(() => {
        if (!roomCode) return;

        const fetchRoom = async () => {
            try {
                const data = await getRoom(roomCode);
                setRoom(data);
                
                const pending = data.members.filter(
                    (m: { status: string; }) => m.status === "pending"
                ).length;

                setPendingRequests(pending)
            } catch(err) {
                console.error(err);
                toast.error("Failed to load room.")
            }
        };
        fetchRoom()
    }, [roomCode])



    const handleShare = async () => {
        try {
            const link = `${window.location.origin}/join/${roomCode}`;
            await navigator.clipboard.writeText(link);
            toast.success("Room link copied to clipboard!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to copy link");
        }
    }

    // ---------- JSX ----------
    return (
        <div className="w-full h-screen flex flex-col bg-gray-50">

            {/* ⭐ TOP BAR */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                
                {/* LEFT TOOLS */}
                <div className="flex items-center gap-2">
                    <ToolButton tool="hand" icon={Hand} label="Hand" />
                    <ToolButton tool="select" icon={MousePointer2} label="Select" />

                    <div className="h-6 w-px bg-gray-300" />

                    <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
                    <ToolButton tool="circle" icon={Circle} label="Circle" />
                    <ToolButton tool="pen" icon={Pen} label="Draw" />
                    <ToolButton tool="eraser" icon={Eraser} label="Eraser" />

                    <div className="h-6 w-px bg-gray-300" />

                    <button
                        onClick={clearBoard}
                        className="p-2 rounded-md hover:bg-gray-100"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* 🎨 TOOL OPTIONS PANEL */}
                {['pen', 'rectangle', 'circle'].includes(activeTool) && openPanel && (
                <div className="absolute top-14 left-4 bg-white shadow-xl border rounded-lg p-4 z-50">

                    <div className="mb-3">
                    <p className="text-sm font-semibold mb-1">Stroke Color</p>

                    <div className="flex gap-2">
                        {strokeColors.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border shadow 
                            ${color === c ? "ring-2 ring-indigo-500" : ""}`}
                            style={{ backgroundColor: c }}
                        />
                        ))}

                        {/* Native color picker */}
                        <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="ml-2 cursor-pointer"
                        />
                    </div>
                    </div>

                    <div>
                    <p className="text-sm font-semibold mb-1">Stroke Width</p>

                    <div className="flex gap-2">
                        {[2, 4, 6, 10, 14].map(w => (
                        <button
                            key={w}
                            onClick={() => setBrushSize(w)}
                            className={`px-3 py-1 rounded border 
                            ${brushSize === w ? "bg-indigo-100 border-indigo-500" : "bg-gray-50"}`}
                        >
                            {w}px
                        </button>
                        ))}
                    </div>
                    </div>

                </div>
                )}



                {/* RIGHT BUTTONS */}
                <div className="flex items-center gap-3">
                    {/* SHARE BUTTON */}
                    <button
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
                        onClick={handleShare}
                    >
                        <Users className="w-4 h-4" /> Share
                    </button>

                    {/* ⭐ OPEN SIDEBAR BUTTON (EVERYONE CAN CLICK) */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 relative"
                    >
                        <Settings className="w-5 h-5" />

                        {/* Badge for pending requests */}
                        {pendingRequests > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {pendingRequests}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ⭐ MAIN AREA (Canvas + Sidebar) */}
            <div className="flex flex-1 overflow-hidden">

                {/* CANVAS AREA */}
                <div className="flex-1 relative" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 z-0"
                        style={{
                            cursor:
                                activeTool === "hand"
                                    ? "grab"
                                    : activeTool === "select"
                                    ? "default"
                                    : "crosshair"
                        }}
                    />

                    {/* Grid overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                            backgroundImage: `
                                linear-gradient(to right, #d1d5db 1px, transparent 1px),
                                linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
                            `,
                            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                            backgroundPosition: `${pan.x}px ${pan.y}px`
                        }}
                    />
                </div>

                {/* ⭐ RIGHT SIDEBAR (Approve/Reject Panel) */}
                {isSidebarOpen && (
                    <div className="w-72 bg-white border-l border-gray-200 h-full p-4 overflow-y-auto relative z-20">

                        <h2 className="text-lg font-semibold mb-3">
                            Room Members
                        </h2>

                        {!room ? (
                            <p>Loading room...</p>
                        ) : (
                            <>
                                {/* OWNER */}
                                <RoomAdminPanel room={room} setCurrentRoom={setRoom}/>
                            </>
                        )}
                    </div>
                )}

                
            </div>

            {/* BOTTOM BAR */}
            <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
                <div>Zoom: {Math.round(zoom * 100)}%</div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>

                    <button onClick={resetView} className="p-1 hover:bg-gray-100 rounded">
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Whiteboard