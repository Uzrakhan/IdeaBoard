// src/routes/rooms.ts
import express from 'express';
import {  protect } from '../middleware/auth'; // Assuming 'protect' middleware is defined here
import asyncHandler from 'express-async-handler';
// Import your controller functions - Ensure these functions themselves accept (req, res)
import { createRoom, getRoom, joinRoom, updateMemberStatus } from '../controllers/roomController';

const router = express.Router();

// @route   POST /api/rooms
// @desc    Create a new collaboration room
// @access  Private
// Correct way: Pass the controller function directly to asyncHandler
router.post('/', protect, asyncHandler(createRoom as express.RequestHandler)); // <-- CHANGE IS HERE

// @route   GET /api/rooms/:roomCode
// @desc    Get room details by code
// @access  Private (accessible by members or for join requests)
router.get('/:roomCode', protect, asyncHandler(getRoom as express.RequestHandler)); // <-- CHANGE IS HERE

// @route   POST /api/rooms/:roomCode/join
// @desc    Request to join a room
// @access  Private
router.post('/:roomCode/join', protect, asyncHandler(joinRoom as express.RequestHandler)); // <-- CHANGE IS HERE

// @route   PUT /api/rooms/:roomCode/members/:memberId/status
// @desc    Update a member's status (approve/reject)
// @access  Private (Owner only)
router.put('/:roomCode/members/:memberId/status', protect, asyncHandler(updateMemberStatus as express.RequestHandler)); // <-- CHANGE IS HERE

console.log('✅ rooms.ts router created');
export default router;