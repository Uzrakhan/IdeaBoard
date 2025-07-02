// src/routes/rooms.ts
import express from 'express';
import { protect } from '../middleware/auth'; // Assuming 'protect' middleware is defined here
// Import your controller functions
import { createRoom, getRoom, joinRoom, updateMemberStatus } from '../controllers/roomController';

const router = express.Router();

// @route   POST /api/rooms
// @desc    Create a new collaboration room
// @access  Private
router.post('/', protect, createRoom);

// @route   GET /api/rooms/:roomCode
// @desc    Get room details by code
// @access  Private (accessible by members or for join requests)
router.get('/:roomCode', protect, getRoom);

// @route   POST /api/rooms/:roomCode/join
// @desc    Request to join a room
// @access  Private
router.post('/:roomCode/join', protect, joinRoom);

// @route   PUT /api/rooms/:roomCode/members/:memberId/status
// @desc    Update a member's status (approve/reject)
// @access  Private (Owner only)
router.put('/:roomCode/members/:memberId/status', protect, updateMemberStatus);

export default router;
