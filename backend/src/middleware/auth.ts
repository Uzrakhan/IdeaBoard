import express from 'express'
//import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// --- This is the key change: MOVE THE DECLARATION MERGING HERE ---
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Add your custom properties here
    }
  }
}
// --- End of declaration merging block ---

// Middleware to protect routes
export const protect = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
    console.log('[Auth Middleware] Verifying token:', token);

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'your_jwt_secret');

      // Type narrowing (safe check that decoded is an object and has `id`)
      if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
        const userId = (decoded as { id: string }).id;

        const user = await User.findById(userId).select('-password');

        if (!user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        req.user = user;
        console.log('[Auth Middleware] Authenticated user:', (user._id as string).toString());
        next();
      } else {
        return res.status(401).json({ message: 'Invalid token payload' });
      }
    } catch (error: any) {
      console.error('[Auth Middleware] Token verification failed:', error.message);
      return res.status(401).json({
        message:
          error.name === 'TokenExpiredError'
            ? 'Not authorized, token expired'
            : 'Not authorized, token invalid',
      });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
