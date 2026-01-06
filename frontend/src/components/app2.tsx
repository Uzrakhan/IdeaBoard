import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Pen,
    Eraser,
    Circle,
    Square,
    Trash2,
    Users,
    Copy,
    Settings,
    Hand,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Lock,
    MousePointer2,
    ArrowRight
} from 'lucide-react';
import { socket } from '../socket';
import { getRoom, updateRoomMemberStatus } from '../api';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- States ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
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

    const backgroundColors = [
        '#ffffff', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
        'transparent'
    ];

    const strokeWidths = [1, 2, 4];
    const strokeStyles = ['solid', 'dashed', 'dotted'];

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
    const handlePointerDown = useCallback((e: PointerEvent) => {
        e.preventDefault();

        if (activeTool === 'hand') {
            isPanningRef.current = true;
            lastPanPointRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (activeTool === 'select') return;

        setIsDrawing(true);

        const point = getCanvasCoordinates(e);

        if (activeTool === 'pen' || activeTool === 'eraser') {
            linesRef.current.push({
                id: crypto.randomUUID(),
                type: activeTool,
                points: [point],
                color: activeTool === 'eraser' ? '#FFFFFF' : colorRef.current,
                width: brushSizeRef.current,
                sentTimestamp: Date.now()
            });
        } else {
            startPointRef.current = point;
        }

        lastPointRef.current = point;
    }, [activeTool, getCanvasCoordinates]);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        e.preventDefault();

        if (activeTool === 'hand' && isPanningRef.current) {
            const dx = e.clientX - lastPanPointRef.current!.x;
            const dy = e.clientY - lastPanPointRef.current!.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
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
    }, [isDrawing, activeTool, getCanvasCoordinates, redrawCanvas, pan.x, pan.y, zoom]);

    const handlePointerUp = useCallback(() => {
        if (activeTool === 'hand') {
            isPanningRef.current = false;
            return;
        }

        if (!isDrawing) return;
        setIsDrawing(false);

        if (activeTool === 'rectangle' || activeTool === 'circle') {
            if (!startPointRef.current || !lastPointRef.current) return;

            linesRef.current.push({
                id: crypto.randomUUID(),
                type: activeTool,
                startPoint: startPointRef.current,
                endPoint: lastPointRef.current,
                color: colorRef.current,
                width: brushSizeRef.current,
                sentTimestamp: undefined
            });
        }

        startPointRef.current = null;
        lastPointRef.current = null;
        redrawCanvas();
    }, [isDrawing, activeTool, redrawCanvas]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * -0.001;
        setZoom(z => Math.min(5, Math.max(0.2, z + zoomDelta)));
    }, []);

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

    // ---------- JSX ----------
    return (
        <div className='w-full h-screen bg-gray-50 flex flex-col'>
            {/* Top toolbar */}
            <div className='bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between relative'>
                <div className='flex items-center gap-2'>
                    <button className='p-2 rounded-lg hover:bg-gray-100'>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div className='h-8 w-px bg-gray-200 mx-1'/>

                    <ToolButton tool='hand' icon={Hand} label='Hand' />
                    <ToolButton tool='select' icon={MousePointer2} label='Select' />

                    <div className='h-8 w-px bg-gray-200 mx-1'/>

                    <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
                    <ToolButton tool="circle" icon={Circle} label="Circle" />
                    <ToolButton tool="pen" icon={Pen} label="Draw" />
                    <ToolButton tool="eraser" icon={Eraser} label="Eraser" />

                    <div className='h-8 w-px bg-gray-200 mx-1'/>

                    <button onClick={clearBoard} className='p-2 rounded-lg hover:bg-gray-100' title="Clear">
                        <Trash2 className="w-5 h-5" />
                    </button>

                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Users className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                </div>

                {/* Tool options panel */}
                {openPanel && ['pen', 'rectangle', 'circle'].includes(openPanel) && (
                    <div className='absolute left-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-64'>
                        {/* Stroke color */}
                        <div className='mb-4'>
                            <label className='text-xs font-medium text-gray-700 mb-2 block'>Stroke</label>
                            <div className='flex gap-1.5'>
                                {strokeColors.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => {
                                            setStrokeColor(c);
                                            setColor(c);
                                        }}
                                        className={`w-7 h-7 rounded border-2 transition-all ${
                                            strokeColor === c ? 'border-indigo-500 scale-110' : 'border-gray-300'
                                        }`}
                                        style={{
                                            backgroundColor: c,
                                            border: c === '#ffffff' ? '2px solid #e5e7eb' : undefined
                                        }}
                                    />
                                ))}
                                <input
                                    type='color'
                                    value={strokeColor}
                                    onChange={(e) => {
                                        setStrokeColor(e.target.value);
                                        setColor(e.target.value);
                                    }} 
                                    className='w-7 h-7 rounded border-2 border-gray-300 cursor-pointer'
                                />
                            </div>
                        </div>

                        {/* Background color */}
                        {openPanel !== 'pen' && (
                            <div className='mb-4'>
                                <label className='text-xs font-medium text-gray-700 mb-2 block'>Background</label>
                                <div className='flex gap-1.5'>
                                    {backgroundColors.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setBackgroundColor(c)}
                                            className={`w-7 h-7 rounded border-2 transition-all ${
                                                backgroundColor === c ? 'border-indigo-500 scale-110' : 'border-gray-300'
                                            }`}
                                            style={{
                                                backgroundColor: c === 'transparent' ? '#fff' : c,
                                                backgroundImage: c === 'transparent' 
                                                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                                                    : undefined,
                                                backgroundSize: '8px 8px',
                                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                                            }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stroke width */}
                        <div className='mb-4'>
                            <label className='text-xs font-medium text-gray-700 mb-2 block'>Stroke Width</label>
                            <div className='flex gap-2'>
                                {strokeWidths.map(width => (
                                    <button
                                        key={width}
                                        onClick={() => setBrushSize(width * 2)}
                                        className={`flex-1 h-10 rounded border-2 flex items-center justify-center transition-all ${
                                            brushSize === width * 2 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div   
                                            className='bg-gray-800 rounded-full'
                                            style={{
                                                width: `${width * 3}px`,
                                                height: `${width * 3}px`
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Canvas container */}
            <div ref={containerRef} className='flex-1 relative overflow-hidden bg-white'>
                <canvas
                    ref={canvasRef}
                    className='absolute inset-0'
                    style={{
                        cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair'
                    }} 
                />

                {/* Grid */}
                <div 
                    className='absolute inset-0 pointer-events-none opacity-10'
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

            {/* Bottom status bar */}
            <div className='bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600'>
                <div className='flex items-center gap-4'>
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>
                <div className='flex items-center gap-2'>
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className='p-1 hover:bg-gray-100 rounded'>
                        <ZoomOut className='w-4 h-4' />
                    </button>
                    <button onClick={resetView} className="p-1 hover:bg-gray-100 rounded">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-1 hover:bg-gray-100 rounded">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;