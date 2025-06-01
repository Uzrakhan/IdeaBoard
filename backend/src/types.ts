export type Point = { x: number; y: number };

export type DrawingLine = {
    points: Point[];
    color: string;
    width: number;
};

export type Data = {
    drawingLines: DrawingLine[];
};