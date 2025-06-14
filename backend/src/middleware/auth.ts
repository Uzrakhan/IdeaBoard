import jwt from 'jsonwebtoken';
import User from "../models/User";
import { Request, Response, NextFunction } from 'express-serve-static-core';


interface AuthRequest extends Request {
    user?: any;
}


export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        // IMPORTANT: Log your JWT_SECRET (temporarily for debugging, remove in production)
        console.log('[Auth Middleware] JWT_SECRET used:', process.env.JWT_SECRET);
        console.log('[Auth Middleware] Attempting to verify token:', token); // Log the token being verified


        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {id: string};
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