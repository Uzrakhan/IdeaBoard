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


    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleInitialState = (lines: DrawingLine[]) => {
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
            canvas.width = window.innerWidth * 0.8;
            canvas.height = window.innerHeight * 0.8;
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
        ctx.beginPath();
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;

        line.points.forEach((point,i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y)
            }else {
                ctx.lineTo(point.x, point.y)
            }
        });

        ctx.stroke();
    };


    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const point = getCoordinates(e);
        socket.emit('draw', {
            points: [point],
            color, 
            width: brushSize 
        })
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const point = getCoordinates(e);
        socket.emit('draw', { 
            points: [point], 
            color, 
            width: brushSize 
        });
    };

    const endDrawing = () => {
        setIsDrawing(false);
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
        socket.emit('clear')
    }
    return(
        <div className='flex flex-col items-center w-full'>
            <div className='flex gap-4 mb-4'>
                <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="cursor-pointer"
                />
                <input 
                type="range" 
                min="1" 
                max="20" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32"
                />
                <button
                onClick={clearBoard}
                 className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Clear
                </button>
            </div>
            <canvas
             ref={canvasRef}
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={endDrawing}
             onMouseLeave={endDrawing}
             className="border-2 border-gray-300 bg-white rounded-lg shadow-lg cursor-crosshair"
            />
        </div>
    )
}