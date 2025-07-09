"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberStatus = exports.joinRoom = exports.getRoom = exports.createRoom = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Room_1 = __importDefault(require("../models/Room"));
const User_1 = __importDefault(require("../models/User"));
const server_1 = require("../server");
const generateUniqueRoomCode = async () => {
    let code;
    let roomExists;
    const maxAttempts = 10;
    let attempts = 0;
    do {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        roomExists = await Room_1.default.findOne({ roomCode: code });
        attempts++;
        if (attempts > maxAttempts && roomExists) {
            throw new Error("Failed to generate a unique room code after multiple attempts.");
        }
    } while (roomExists);
    return code;
};
const createRoom = async (req, res) => {
    const userId = req.user?._id?.toString();
    if (!userId)
        return res.status(401).json({ message: 'Not authenticated' });
    try {
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const roomCode = await generateUniqueRoomCode();
        const newRoom = new Room_1.default({ roomCode, owner: userId });
        const savedRoom = await newRoom.save();
        const populatedRoom = await Room_1.default.findById(savedRoom._id)
            .populate('owner', 'username')
            .populate('members.user', 'username');
        res.status(201).json({ message: 'Room created successfully', room: populatedRoom });
    }
    catch (error) {
        res.status(500).json({ message: "Room creation failed", details: error.message });
    }
};
exports.createRoom = createRoom;
const getRoom = async (req, res) => {
    // --- NEW: VERY FIRST LOG IN GETROOM ---
    console.log(`[getRoom Controller - START] Request received for room: ${req.params.roomCode || 'N/A'}`);
    console.log(`[getRoom Controller - START] User ID from request: ${req.user?._id?.toString() || 'N/A'}`);
    // --- END NEW LOG ---
    const { roomCode } = req.params;
    const userId = req.user?._id?.toString();
    if (!userId)
        return res.status(401).json({ message: 'Not authenticated' });
    try {
        const room = await Room_1.default.findOne({ roomCode })
            .populate('owner', 'username')
            .populate('members.user', 'username');
        if (!room)
            return res.status(404).json({ message: "Room not found" });
        const roomOwner = room.owner;
        const isOwner = roomOwner?._id?.toString() === userId;
        const isApprovedMember = Array.isArray(room.members) && room.members.some(m => m.user?._id?.toString() === userId && m.status === 'approved');
        if (!isApprovedMember && !isOwner) {
            return res.status(200).json({
                message: 'Room found, request to join.',
                room: {
                    _id: room._id?.toString(),
                    roomCode: room.roomCode,
                    name: room.name,
                    owner: {
                        _id: roomOwner._id?.toString(),
                        username: roomOwner.username || 'Unknown Owner'
                    },
                    members: room.members.map(m => ({
                        user: {
                            _id: m.user._id?.toString(),
                            username: m.user.username || 'Unknown'
                        },
                        status: m.status
                    }))
                }
            });
        }
        res.status(200).json({
            ...room.toObject(),
            members: Array.isArray(room.members) ? room.members : []
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error", details: err.message });
    }
};
exports.getRoom = getRoom;
const joinRoom = async (req, res) => {
    const { roomCode } = req.params;
    const userId = req.user?._id?.toString();
    if (!userId)
        return res.status(401).json({ message: 'Not authenticated' });
    try {
        const room = await Room_1.default.findOne({ roomCode });
        if (!room)
            return res.status(404).json({ message: 'Room not found' });
        const existingMember = room.members.find(m => m.user.toString() === userId);
        if (existingMember) {
            return res.status(200).json({
                message: existingMember.status === 'approved' ? 'Already a member.' : 'Join request pending.',
                room
            });
        }
        room.members.push({ user: new mongoose_1.default.Types.ObjectId(userId), status: 'pending' });
        await room.save();
        const populatedRoom = await Room_1.default.findById(room._id)
            .populate('owner', 'username')
            .populate('members.user', 'username');
        const newPendingMember = populatedRoom.members.find(m => m.user?._id?.toString() === userId);
        const requesterUsername = newPendingMember?.user?.username || 'Unknown User';
        const owner = populatedRoom.owner;
        const ownerSocketId = server_1.connectedUsers.get(owner?._id?.toString());
        if (ownerSocketId) {
            server_1.io.to(ownerSocketId).emit('newJoinRequest', {
                roomCode: room.roomCode,
                requester: requesterUsername,
                requesterId: userId
            });
        }
        server_1.io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        res.status(200).json({ message: 'Join request sent', room: populatedRoom });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
exports.joinRoom = joinRoom;
const updateMemberStatus = async (req, res) => {
    const { roomCode } = req.params;
    const memberId = req.body.memberId;
    const memberStatus = req.body.status;
    const ownerId = req.user?._id?.toString();
    if (!ownerId)
        return res.status(401).json({ message: 'Not authenticated.' });
    if (!memberId)
        return res.status(400).json({ message: 'Member ID is required.' });
    if (!['approved', 'rejected'].includes(memberStatus))
        return res.status(400).json({ message: 'Invalid status.' });
    try {
        const room = await Room_1.default.findOne({ roomCode });
        if (!room)
            return res.status(404).json({ message: 'Room not found' });
        if (room.owner.toString() !== ownerId) {
            return res.status(403).json({ message: 'You are not the owner of this room.' });
        }
        const memberIndex = room.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1)
            return res.status(404).json({ message: 'Member not found.' });
        room.members[memberIndex].status = memberStatus;
        await room.save();
        const populatedRoom = await Room_1.default.findById(room._id)
            .populate('owner', 'username')
            .populate('members.user', 'username');
        const updatedMember = populatedRoom.members.find(m => m.user?._id?.toString() === memberId);
        const updatedUser = updatedMember?.user?.username || 'A user';
        const ownerSocketId = server_1.connectedUsers.get(populatedRoom.owner?._id?.toString());
        if (ownerSocketId) {
            server_1.io.to(ownerSocketId).emit('memberStatusUpdated', {
                roomCode: room.roomCode,
                memberId,
                status: memberStatus,
                message: `${updatedUser}'s status updated to ${memberStatus}.`
            });
        }
        const memberSocketId = server_1.connectedUsers.get(memberId);
        if (memberSocketId) {
            server_1.io.to(memberSocketId).emit('yourRoomStatusUpdated', {
                roomCode: room.roomCode,
                status: memberStatus
            });
        }
        server_1.io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        res.status(200).json({ message: `Member status updated to ${memberStatus}.`, room: populatedRoom });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
exports.updateMemberStatus = updateMemberStatus;
//# sourceMappingURL=roomController.js.map