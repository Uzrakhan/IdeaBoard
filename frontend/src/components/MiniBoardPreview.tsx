
import { useEffect, useRef } from "react";

const MiniBoardPreview = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 320;
    canvas.height = 180;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#7c3aed";

    // pen line
    ctx.beginPath();
    ctx.moveTo(30, 40);
    ctx.lineTo(120, 90);
    ctx.stroke();

    // rectangle
    ctx.strokeStyle = "#0ea5e9";
    ctx.strokeRect(150, 30, 100, 60);

    // arrow
    ctx.strokeStyle = "#a855f7";
    ctx.beginPath();
    ctx.moveTo(50, 140);
    ctx.lineTo(180, 140);
    ctx.stroke();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl bg-white shadow-inner"
    />
  );
};

export default MiniBoardPreview;
