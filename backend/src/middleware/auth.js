"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
//import { Request, Response, NextFunction } from 'express';
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1];
        console.log('[Auth Middleware] Verifying token:', token);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            // Type narrowing (safe check that decoded is an object and has `id`)
            if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
                const userId = decoded.id;
                const user = await User_1.default.findById(userId).select('-password');
                if (!user) {
                    return res.status(401).json({ message: 'Not authorized, user not found' });
                }
                req.user = user;
                console.log('[Auth Middleware] Authenticated user:', user._id.toString());
                next();
            }
            else {
                return res.status(401).json({ message: 'Invalid token payload' });
            }
        }
        catch (error) {
            console.error('[Auth Middleware] Token verification failed:', error.message);
            return res.status(401).json({
                message: error.name === 'TokenExpiredError'
                    ? 'Not authorized, token expired'
                    : 'Not authorized, token invalid',
            });
        }
    }
    else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
exports.protect = protect;
//# sourceMappingURL=auth.js.map