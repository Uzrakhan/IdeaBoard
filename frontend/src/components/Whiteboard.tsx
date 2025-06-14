import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room } from '../types';

interface WhiteboardProps {
  room: Room;
}

type Point = { x: number; y: number };
type DrawingLine = {
  points: Point[];
  color: string;
  width: number;
};

const Whiteboard: React.FC<WhiteboardProps> = () => {
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

  // Keep refs updated with current state
  useEffect(() => {
    colorRef.current = color;
    brushSizeRef.current = brushSize;
  }, [color, brushSize]);

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

  // Draw a line on the canvas
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
    socket.emit('draw', newLine);
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
      
      socket.emit('draw', updatedLine);
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
    socket.emit('clear');
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
      <div 
        ref={containerRef}
        className="w-full max-w-4xl border-2 border-gray-300 bg-white rounded-lg shadow-lg overflow-hidden"
        style={{ height: '400px' }} // Fixed height for rectangular shape
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
          className="cursor-crosshair"
          width={canvasDimensions.width}
          height={canvasDimensions.height}
        />
      </div>
    </div>
  );
};

export default Whiteboard;