import express from 'express'
//import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Express Request to include authenticated user
export interface AuthRequest extends express.Request {
  params: { roomCode: any; };
  body: {
      memberId: any; status: any; 
};
  headers: any;
  user?: IUser;
}

// Middleware to protect routes
export const protect = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
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
