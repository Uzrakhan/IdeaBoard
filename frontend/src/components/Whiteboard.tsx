import React, {useState, useEffect, useRef} from 'react';
import { socket } from '../socket';

type Point = { x: number, y : number }

type DrawingLine = {
    points: Point[];
    color: string;
    width: number;
};

export default function Whiteboard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    const lastPointRef = useRef<Point | null>(null);

    // Keep refs updated with current state
    useEffect(() => {
        colorRef.current = color;
        brushSizeRef.current = brushSize;
    }, [color, brushSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleInitialState = (lines: DrawingLine[]) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            lines.forEach(line => drawLine(ctx, line))
        };


        const handleDraw = (line: DrawingLine) => {
            drawLine(ctx, line)
        };

        const handleClear = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        };

        //set canvas size
        const resizeCanvas = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width;
                canvas.height = Math.min(window.innerHeight * 0.8, 600);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        //socket events
        socket.on('initial-state', handleInitialState);
        socket.on('draw', handleDraw);
        socket.on('clear', handleClear);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            socket.off('initial-state', handleInitialState);
            socket.off('draw', handleDraw);
            socket.off('clear', handleClear);
        }
    }, []);


    const drawLine = (ctx: CanvasRenderingContext2D, line: DrawingLine) => {
        if (line.points.length === 0) return;
    

        ctx.beginPath();
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = line.color;

        //move to first point
        ctx.moveTo(line.points[0].x, line.points[0].y);

        //draw line to subsequent points
        for (let i = 1; i < line.points.length ; i++) {
            ctx.lineTo(line.points[i].x, line.points[i].y)
        }

        ctx.stroke();
    };


    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const point = getCoordinates(e);
        lastPointRef.current = point;


        //emit to server
        socket.emit('draw', {
            points: [point],
            color: colorRef.current, 
            width: brushSizeRef.current 
        })
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !lastPointRef.current) return;
        const point = getCoordinates(e);

        
        // Get canvas context for local drawing
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw locally immediately
        ctx.beginPath();
        ctx.lineWidth = brushSizeRef.current;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colorRef.current;
    
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        
        //emit to server
        socket.emit('draw', { 
            points: [lastPointRef.current, point], 
            color: colorRef.current, 
            width: brushSizeRef.current
        });
        // Update last point
        lastPointRef.current = point
    };

    const endDrawing = () => {
        setIsDrawing(false);
        lastPointRef.current = null;
    };

    const getCoordinates = (e: React.MouseEvent): Point => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('clear')
    };

    
    return(
        <div className='flex flex-col items-center w-full max-w-6xl mx-auto'>
            <div className='flex gap-4 mb-4 w-full max-w-4xl'>
                <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="cursor-pointer w-12 h-12"
                />
                <div className="flex items-center gap-2">
                    <span className="text-white">Size:</span>
                    <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-white w-8">{brushSize}px</span>
                </div>
                <button
                onClick={clearBoard}
                 className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-auto"
                >
                    Clear
                </button>
            </div>
            <div className="w-full max-w-4xl border-2 border-gray-300 bg-white rounded-lg shadow-lg overflow-hidden"
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    className="cursor-crosshair w-full"
                    height='600'
                />
            </div>
        </div>
    )
}