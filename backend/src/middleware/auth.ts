import jwt from 'jsonwebtoken';
import User, { IUser } from "../models/User";
import { Document } from 'mongoose'; // Needed if User is a Mongoose document
import express from 'express';

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

export const auth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    console.log('Authorization Header:', authHeader);

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header required' });
    }

    
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined;
    console.log('Extracted Token:', token);
    
    if (!token) {
        console.log('No token found. Sending 401.');
        return res.status(401).json({ message: 'Authentication required' })
    }

    try{
        // IMPORTANT: Ensure process.env.JWT_SECRET is actually defined in your Render environment variables.
        // If it's undefined, jwt.verify will throw an error.
        if(!process.env.JWT_SECRET) {
            console.error('[Auth Middleware] JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing.' });
        }

        console.log('[Auth Middleware] Attempting to verify token:', token); // Log the token being verified


        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload; // Cast to your JwtPayload interface
        console.log('[Auth Middleware] Token decoded successfully:', decoded);

        const user = await User.findById(decoded.id);

        if (!user) {
            console.log(`[Auth Middleware] User not found for ID: ${decoded.id}`);
            // If user is not found after successful token verification, it's still an auth failure.
            throw new Error();
        }

        req.user = user;
        console.log(`[Auth Middleware] User ${user.username} authenticated successfully.`);
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