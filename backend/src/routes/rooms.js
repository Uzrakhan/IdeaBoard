"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/rooms.ts
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth"); // Assuming 'protect' middleware is defined here
// Import your controller functions
const roomController_1 = require("../controllers/roomController");
const router = express_1.default.Router();
// @route   POST /api/rooms
// @desc    Create a new collaboration room
// @access  Private
router.post('/', auth_1.protect, roomController_1.createRoom);
// @route   GET /api/rooms/:roomCode
// @desc    Get room details by code
// @access  Private (accessible by members or for join requests)
router.get('/:roomCode', auth_1.protect, roomController_1.getRoom);
// @route   POST /api/rooms/:roomCode/join
// @desc    Request to join a room
// @access  Private
router.post('/:roomCode/join', auth_1.protect, roomController_1.joinRoom);
// @route   PUT /api/rooms/:roomCode/members/:memberId/status
// @desc    Update a member's status (approve/reject)
// @access  Private (Owner only)
router.put('/:roomCode/members/:memberId/status', auth_1.protect, roomController_1.updateMemberStatus);
exports.default = router;
//# sourceMappingURL=rooms.js.map