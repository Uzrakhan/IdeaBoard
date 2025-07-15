import express from 'express';
import mongoose, { Types, HydratedDocument } from 'mongoose';
import Room, { IRoom, IPopulatedRoomMember } from '../models/Room';
import User, { IUser } from '../models/User';
import { io, connectedUsers } from '../server';

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

export const createRoom = async (req: express.Request, res: express.Response) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

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

export const getRoom = async (req: express.Request, res: express.Response) => {
    const { roomCode } = req.params;
    const userId = req.user?._id?.toString();

    // --- NEW/ENHANCED LOGGING (keep these in for debugging on Render) ---
    console.log(`[getRoom Controller - L0] --- START getRoom Request ---`);
    console.log(`[getRoom Controller - L0.1] Request received for room: ${roomCode || 'N/A'}`);
    console.log(`[getRoom Controller - L0.2] User ID from request: ${userId || 'N/A'}`);
    // --- END NEW LOG ---

    if (!userId) {
        console.warn(`[getRoom Controller - L1] Unauthorized access attempt for room ${roomCode}: No user ID.`);
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        console.log(`[getRoom Controller - L2] Attempting to find room with roomCode: ${roomCode} for user ${userId}.`);
        const room = await Room.findOne({ roomCode })
            .populate<{ owner: IUser }>('owner', 'username')
            .populate<{ members: IPopulatedRoomMember[] }>({
                path: 'members.user',
                select: 'username'
            }) as HydratedDocument<IRoom>;

        // --- NEW LOG ---
        console.log(`[getRoom Controller - L3] DB query for ${roomCode} completed.`);
        // --- END NEW LOG ---


        if (!room) {
            // --- NEW LOG ---
            console.error(`[getRoom Controller - L4] Room ${roomCode} NOT found in database.`);
            // --- END NEW LOG ---
            return res.status(404).json({ message: "Room not found" });
        }

        // --- NEW LOG ---
        console.log(`[getRoom Controller - L5] Room ${roomCode} found.`);
        // --- END NEW LOG ---


        const roomOwner = room.owner as IUser;
        const isOwner = roomOwner?._id?.toString() === userId;
        const isApprovedMember = Array.isArray(room.members) && room.members.some(
            m => (m.user as IUser)?._id?.toString() === userId && m.status === 'approved'
        );

        if (!isApprovedMember && !isOwner) {
            // --- NEW LOG ---
            console.log(`[getRoom Controller - L6] User ${userId} is not owner or approved member of ${roomCode}. Returning partial room info.`);
            // --- END NEW LOG ---
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
                            _id: (m.user as IUser)._id?.toString(),
                            username: (m.user as IUser).username || 'Unknown'
                        },
                        status: m.status
                    }))
                }
            });
        }

        // --- NEW LOG ---
        console.log(`[getRoom Controller - L7] Sending full room data for ${roomCode} to user ${userId}.`);
        // --- END NEW LOG ---
        res.status(200).json({
            ...room.toObject(),
            members: Array.isArray(room.members) ? room.members : []
        });
    } catch (err: any) {
        // --- NEW/ENHANCED LOGGING IN CATCH BLOCK ---
        console.error(`[getRoom Controller - L8] CATCH BLOCK: ERROR fetching room ${roomCode}. Error message:`, err.message);
        if (err.name === 'MongooseServerSelectionError') {
             console.error('[getRoom Controller - L9] MongoDB Server Selection Error: This usually means the server cannot connect to the MongoDB cluster. Check Atlas IP whitelist/URI.');
        } else if (err.name === 'MongoNetworkError') {
             console.error('[getRoom Controller - L10] MongoDB Network Error: Connection dropped or refused during query.');
        } else {
             console.error('[getRoom Controller - L11] General Mongoose/DB Error (full object):', err); // Log the full error object for more detail
        }
        // --- END NEW LOG ---
        res.status(500).json({ message: "Server error", details: err.message });
    }
};

export const joinRoom = async (req: express.Request, res: express.Response) => {
    const { roomCode } = req.params;
    const userId = req.user?._id?.toString();
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const room = await Room.findOne({ roomCode }) as HydratedDocument<IRoom>;
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const existingMember = room.members.find(m => (m.user as Types.ObjectId).toString() === userId);
        if (existingMember) {
            return res.status(200).json({
                message: existingMember.status === 'approved' ? 'Already a member.' : 'Join request pending.',
                room // return the existing 
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
        const requesterId = (newPendingMember?.user as IUser)?.id?.toString();

        const owner = populatedRoom.owner as IUser;
        const ownerSocketId = connectedUsers.get(((owner as IUser)?._id as Types.ObjectId)?.toString());

                // 🚀 Emit 'room:joinRequest' to the owner

        if (ownerSocketId) {
            io.to(ownerSocketId).emit('room:joinRequest', {
                roomCode: room.roomCode,
                requester: requesterUsername,
                requesterId: requesterId
            });
            console.log(`[Socket.IO] Emitted 'room:joinRequest' to owner ${owner._id} for room ${roomCode}`);
        }else {
            console.warn(`[Socket.IO] Owner ${owner._id} not connected, could not send 'room:joinRequest' for room ${roomCode}.`);
        }

        // 🚀 Emit 'roomUpdated' to everyone in the room (including the requester if connected)
        io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        console.log(`[Socket.IO] Emitted 'roomUpdated' to room ${roomCode} after join request.`);
        res.status(200).json({ message: 'Join request sent', room: populatedRoom });
    } catch (err: any) {
        console.error(`[joinRoom Controller] Error: ${err.message}`);
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};

export const updateMemberStatus = async (req: express.Request, res: express.Response) => {
    const { roomCode } = req.params;
    const { memberId, status: memberStatus } = req.body;
    const ownerId = req.user?._id?.toString();

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
        const updatedUserUsername = (updatedMember?.user as IUser)?.username || 'A user';
        const updatedUserId = (updatedMember?.user as IUser)?._id?.toString();

        // 🚀 Emit a private notification to the affected member (if they are connected)
        const memberSocketId = connectedUsers.get(memberId); // Get the socket ID of the affected member
        if (memberSocketId) {
            io.to(memberSocketId).emit('yourRoomStatusUpdated', {
                roomCode: room.roomCode,
                status: memberStatus,
                message: `Your status in room ${room.roomCode} has been ${memberStatus}.`
            });
            console.log(`[Socket.IO] Emitted 'yourRoomStatusUpdated' to member ${memberId} for room ${roomCode}. Status: ${memberStatus}`);
        }

        // 🚀 BROADCAST: Emit 'room:memberUpdate' to everyone in the room (including other admins and the owner)
        // This is what the RoomAdminPanel on the client should primarily react to for member list updates.
        io.to(roomCode).emit('room:memberUpdate', { 
            roomCode: room.roomCode,
            memberId: updatedUserId,
            status: memberStatus,
            username: updatedUserUsername,
            message: `${updatedUserUsername}'s status updated to ${memberStatus}. `
        });
        console.log(`[Socket.IO] Emitted 'room:memberUpdate' to room ${roomCode} for member ${updatedUserId} status change to ${memberStatus}.`);

        // 🚀 BROADCAST: Emit 'roomUpdated' to everyone in the room with the full room object
        // This is a general update that can be used by any part of the client needing the latest room data.
        io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
        console.log(`[Socket.IO] Emitted 'roomUpdated' to room ${roomCode} with full room data.`);

        res.status(200).json({ message: `Member status updated to ${memberStatus}.`, room: populatedRoom });
    } catch (err: any) {
        console.error(`[updateMemberStatus Controller] Error: ${err.message}`);
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
