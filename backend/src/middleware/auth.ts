import jwt from 'jsonwebtoken';
import User, { IUser } from "../models/User";
import { Document } from 'mongoose'; // Needed if User is a Mongoose document
import express, { Request, Response } from 'express';
import type { NextFunction } from 'express';

// Define an interface to extend the Request object,
// so TypeScript knows about the `user` property that our middleware adds.
// This helps prevent TS errors when accessing `req.user` in controllers.
export interface AuthRequest extends Request{
    body: { status: any; };
    params: { roomCode: any; memberId: any; };
    get(arg0: string): string | undefined;
    user? : {
        id: string;
        username?: string;
    }
}

// Define a more specific type for the user payload coming from the JWT
interface JwtPayload {
    id: string
}

// Extend the Express Request type to include the 'user' property
// This is the standard way to augment Express's types.
// The 'Request' type from 'express' already includes 'headers'.
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Use your actual User type here, not 'any'
    }
  }
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.get('Authorization');
    console.log('Authorization Header:', authHeader);

    if (!authHeader) {
        console.warn('[Auth Middleware] Authorization header required');
        return res.status(401).json({ message: 'Authorization header required' });
    }

    // Expected format: "Bearer TOKEN_STRING"
    const tokenParts = authHeader.split(' ');
    if(tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        console.warn('[Auth Middleware] Invalid token format. Expected "Bearer <token>".');
        return res.status(401).json({ message: 'Invalid token format.' });
    }
    const token = tokenParts[1];

    try{
        // IMPORTANT: Ensure process.env.JWT_SECRET is actually defined in your Render environment variables.
        // If it's undefined, jwt.verify will throw an error.
        const jwtSecret = process.env.JWT_SECRET;

        if(!jwtSecret) {
            console.error('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing.' });
        }

        console.log('[Auth Middleware] Attempting to verify token:', token); // Log the token being verified

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload; // Cast to your JwtPayload interface
        //attach user to request object
        req.user = { id: decoded.id }
        console.log(`[Auth Middleware] User ${decoded.id} authenticated successfully.`);
        console.log(`[Auth Middleware] User ${decoded.id} authenticated successfully.`);

        next();
    }catch(err: any) {
        console.error('[Auth Middleware] Token verification failed or other error:', err); // Log the full error object

        if (err.name === "TokenExpiredError") {
            console.log('[Auth Middleware] Token expired.');
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }else if (err.name === 'JsonWebTokenError') {
            console.log('[Auth Middleware] Invalid JWT signature or malformed token.');
            return res.status(401).json({ message: 'Invalid token. Please log in again.' });
        }else {
            console.log('[Auth Middleware] Unexpected authentication error.');
            return res.status(401).json({ message: 'Authentication failed due to an unexpected error.' });
        }
    }
}   

