import express from 'express';
import mongoose, { Types, HydratedDocument } from 'mongoose';
import Room, { IRoom, IPopulatedRoomMember } from '../models/Room';
import User, { IUser } from '../models/User';
import { io, connectedUsers } from '../server';
import { AuthRequest } from '../middleware/auth';

const generateUniqueRoomCode = async (): Promise<string> => {
    let code: string;
    let roomExists: IRoom | null;
    const maxAttempts = 10;
    let attempts = 0;
    do {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        roomExists = await Room.findOne({ roomCode: code });
        attempts++;
        if (attempts > maxAttempts && roomExists) {
            throw new Error("Failed to generate a unique room code after multiple attempts.");
        }
    } while (roomExists);
    return code;
};

export const createRoom = async (req: AuthRequest, res: express.Response) => {
    const userId = (req.user as IUser)?._id?.toString();
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const roomCode = await generateUniqueRoomCode();
        const newRoom = new Room({ roomCode, owner: userId });
        const savedRoom = await newRoom.save();

        const populatedRoom = await Room.findById(savedRoom._id)
            .populate<{ owner: IUser }>('owner', 'username')
            .populate<{ members: IPopulatedRoomMember[] }>('members.user', 'username') as HydratedDocument<IRoom>;

        res.status(201).json({ message: 'Room created successfully', room: populatedRoom });
    } catch (error: any) {
        res.status(500).json({ message: "Room creation failed", details: error.message });
    }
};

export const getRoom = async (req: AuthRequest, res: express.Response) => {
    // --- NEW: VERY FIRST LOG IN GETROOM ---
    console.log(`[getRoom Controller - START] Request received for room: ${req.params.roomCode || 'N/A'}`);
    console.log(`[getRoom Controller - START] User ID from request: ${req.user?._id?.toString() || 'N/A'}`);
    // --- END NEW LOG ---

    const { roomCode } = req.params;
    const userId = (req.user as IUser)?._id?.toString();
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const room = await Room.findOne({ roomCode })
            .populate<{ owner: IUser }>('owner', 'username')
            .populate<{ members: IPopulatedRoomMember[] }>('members.user', 'username') as HydratedDocument<IRoom>;

        if (!room) return res.status(404).json({ message: "Room not found" });

        const roomOwner = room.owner as IUser;
        const isOwner = roomOwner?._id?.toString() === userId;
        const isApprovedMember = Array.isArray(room.members) && room.members.some(
            m => (m.user as IUser)?._id?.toString() === userId && m.status === 'approved'
        );

        if (!isApprovedMember && !isOwner) {
            return res.status(200).json({
                message: 'Room found, request to join.',
                room: {
                    _id: room._id?.toString(),
                    roomCode: room.roomCode,
                    owner: {
                        _id: roomOwner._id?.toString(),
                        username: roomOwner.username || 'Unknown Owner'
                    },
                    members: room.members.map(m => ({
                        user: {
                            _id: (m.user as IUser)._id?.toString(),
                            username: (m.user as IUser).username || 'Unknown'
                        },
                        status: m.status
                    }))
                }
            });
        }

        res.status(200).json(room);
    } catch (err: any) {
        res.status(500).json({ message: "Server error", details: err.message });
    }
};

export const joinRoom = async (req: AuthRequest, res: express.Response) => {
    const { roomCode } = req.params;
    const userId = (req.user as IUser)?._id?.toString();
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const room = await Room.findOne({ roomCode }) as HydratedDocument<IRoom>;
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const existingMember = room.members.find(m => (m.user as Types.ObjectId).toString() === userId);
        if (existingMember) {
            return res.status(200).json({
                message: existingMember.status === 'approved' ? 'Already a member.' : 'Join request pending.',
                room
            });
        }

        room.members.push({ user: new mongoose.Types.ObjectId(userId), status: 'pending' } as any);
        await room.save();

        const populatedRoom = await Room.findById(room._id)
            .populate<{ owner: IUser }>('owner', 'username')
            .populate<{ members: IPopulatedRoomMember[] }>('members.user', 'username') as HydratedDocument<IRoom>;

        const newPendingMember = populatedRoom.members.find(
            m => (m.user as IUser)?._id?.toString() === userId
        );
        const requesterUsername = (newPendingMember?.user as IUser)?.username || 'Unknown User';

        const owner = populatedRoom.owner as IUser;
        const ownerSocketId = connectedUsers.get(((owner as IUser)?._id as Types.ObjectId)?.toString());

        if (ownerSocketId) {
            io.to(ownerSocketId).emit('newJoinRequest', {
                roomCode: room.roomCode,
                requester: requesterUsername,
                requesterId: userId
            });
        }

        io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        res.status(200).json({ message: 'Join request sent', room: populatedRoom });
    } catch (err: any) {
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};

export const updateMemberStatus = async (req: AuthRequest, res: express.Response) => {
    const { roomCode } = req.params;
    const memberId = req.body.memberId;
    const memberStatus = req.body.status;
    const ownerId = (req.user as IUser)?._id?.toString();

    if (!ownerId) return res.status(401).json({ message: 'Not authenticated.' });
    if (!memberId) return res.status(400).json({ message: 'Member ID is required.' });
    if (!['approved', 'rejected'].includes(memberStatus)) return res.status(400).json({ message: 'Invalid status.' });

    try {
        const room = await Room.findOne({ roomCode }) as HydratedDocument<IRoom>;
        if (!room) return res.status(404).json({ message: 'Room not found' });

        if ((room.owner as Types.ObjectId).toString() !== ownerId) {
            return res.status(403).json({ message: 'You are not the owner of this room.' });
        }

        const memberIndex = room.members.findIndex(m => (m.user as Types.ObjectId).toString() === memberId);
        if (memberIndex === -1) return res.status(404).json({ message: 'Member not found.' });

        room.members[memberIndex].status = memberStatus;
        await room.save();

        const populatedRoom = await Room.findById(room._id)
            .populate<{ owner: IUser }>('owner', 'username')
            .populate<{ members: IPopulatedRoomMember[] }>('members.user', 'username') as HydratedDocument<IRoom>;

        const updatedMember = populatedRoom.members.find(
            m => (m.user as IUser)?._id?.toString() === memberId
        );
        const updatedUser = (updatedMember?.user as IUser)?.username || 'A user';

        const ownerSocketId = connectedUsers.get(((populatedRoom.owner as IUser)?._id as Types.ObjectId)?.toString());
        if (ownerSocketId) {
            io.to(ownerSocketId).emit('memberStatusUpdated', {
                roomCode: room.roomCode,
                memberId,
                status: memberStatus,
                message: `${updatedUser}'s status updated to ${memberStatus}.`
            });
        }

        const memberSocketId = connectedUsers.get(memberId);
        if (memberSocketId) {
            io.to(memberSocketId).emit('yourRoomStatusUpdated', {
                roomCode: room.roomCode,
                status: memberStatus
            });
        }

        io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        res.status(200).json({ message: `Member status updated to ${memberStatus}.`, room: populatedRoom });
    } catch (err: any) {
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
