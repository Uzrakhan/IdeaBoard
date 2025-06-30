import Room from "../models/Room";
import User, { IUser } from "../models/User";
import { io } from '../server'
import connectedUsers from '../server'
import { AuthRequest } from '../middleware/auth'
import { Response } from 'express';


const generateRoomCode = () => {
    return Math.random().toString(36).substring(2,8).toUpperCase();
};



// controllers/roomController.js
export const createRoom = async (req:any, res:any) => {
  try {
    console.log('[CreateRoom]Starting room creation for user:', req.user ? req.user.id : 'User ID not available');
    console.log('[CreateRoom] Request body:', req.body);
    //user verification
    const user = await User.findById(req.user.id);
    console.log('[CreateRoom] User fetched:', user ? user.username : 'User not found');
    if (!user) {
      console.error('[CreateRoom] User not found:', req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    
    let uniqueRoomCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique room code
    while (!isUnique && attempts < maxAttempts) {
      uniqueRoomCode = generateRoomCode();
      console.log(`[CreateRoom]Generated room code: ${uniqueRoomCode}, attempt ${attempts + 1}`);
      
      const existingRoom = await Room.findOne({ roomCode: uniqueRoomCode });
      if (!existingRoom) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      console.error('[CreateRoom] Unique code generation failed after', maxAttempts, 'attempts');
      return res.status(500).json({ error: "Room code generation failed" });
    }

    // Create new room
    const newRoom = new Room({
      roomCode: uniqueRoomCode,
      owner: req.user.id, 
      creator: req.user.id
    });

    // Validate before saving
    const validationError = newRoom.validateSync();
    if (validationError) {
      console.error('[CreateRoom] Validation error:', validationError);
      return res.status(400).json({ error: "Validation failed", details: validationError.errors });
    }


    const savedRoom = await newRoom.save();
    console.log('[CreateRoom] Room created successfully:', savedRoom);
    
    res.status(201).json({ message: 'Room created successfully', room: savedRoom });
  } catch (error:any) {
    console.error('----- [CreateRoom] CAUGHT EXCEPTION -----');
    console.error('[CreateRoom] Critical error message:', error.message);
    console.error('[CreateRoom] Full stack trace:\n', error.stack); 
    console.error('-----------------------------------------');

    // Detailed error response
    res.status(500).json({ 
      error: "Room creation failed",
      reason: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// controllers/roomController.js
export const getRoom = async (req:any, res:any) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode })
                           .populate('owner');
    
    if (!room) {
      console.warn(`[getRoom Controller] Room with roomCode ${req.params.roomCode} NOT FOUND in DB.`); // New log!
      return res.status(404).json({ error: "Room not found" });
    }
    
    console.log(`[getRoom Controller] Room ${room.roomCode} found successfully.`); // New log!
    res.json(room);
  } catch (err:any) {
    console.error('----- [getRoom Controller] CAUGHT EXCEPTION -----'); // New log!
    console.error('[getRoom Controller] Critical error message:', err.message);
    console.error('[getRoom Controller] Full stack trace:\n', err.stack); 
    console.error('-----------------------------------------');

    res.status(500).json({ 
      error: "Server error", 
      reason: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const updateMemberStatus = async (req: AuthRequest, res: Response) => {
  const { roomCode, memberId } = req.params;
  const { status } = req.body;
  const ownerId = req.user?.id;

  if(!ownerId) {
    return res.status(401).json({ message: 'Not authenticated.' })
  }

  if(!['approved', 'rejected'].includes(status)){
    return res.status(400).json({ message: 'invalid status provided.' });
  }

  try{
    const room  = await Room.findOne({  roomCode: roomCode});

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    //cehck if requestion user is the room owner
    if (room.owner.toString() !== ownerId) {
      return res.status(403).json({ message: 'You are not the owner of this room.' })
    }

    //find member to update
    const memberIndex = room.members.findIndex(
      m => m.user._id.toString() === memberId
    );

    if(memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this room.' })
    }

    //member to update
    const memberToUpdate = room.members[memberIndex];
    if(memberToUpdate.status === status) {
      return res.status(200).json({ message: `Member already ${status}.`,room })
    }

    memberToUpdate.status = status;
    await room.save();

    //populate the user who was updated for notification
    const populatedRoom = await Room.findById(room._id)
      .populate<{ owner: IUser }>('owner','username')
      .populate<{ members: { user: IUser }[] }>('members.user', 'username')

    if(!populatedRoom) {
      return res.status(500).json({ message: 'Room not found after member status update' })
    }
    // --- Socket.IO: Notify the room owner and the updated member about the status change ---
    const members = populatedRoom.members as { user: IUser; status: string }[];
    const foundMember = members.find(m => m.user && (m.user as IUser)._id.toString() === memberId) as { user: IUser } | undefined;
    const updatedUser = foundMember?.user.username || 'A user';

    // Notify owner's active socket
    const ownerSocketId = connectedUsers.connectedUsers.get(ownerId); // Get owner's socket ID from map
      if (ownerSocketId) {
        io.to(ownerSocketId).emit('memberStatusUpdated', {
          roomCode: room.roomCode,
          memberId: memberId,
          status: status,
          message: `${updatedUser}'s status updated to ${status}.`
          });
      }

    // Also emit directly to the updated user's socket if they are connected
    const memberSocketId = connectedUsers.connectedUsers.get(memberId); // Get member's socket ID from map
    if (memberSocketId) {
        io.to(memberSocketId).emit('yourRoomStatusUpdated', {
            roomCode: room.roomCode,
            status: status,
            message: `Your status in room ${room.roomCode} is now ${status}.`
        });
    }

    // Emit to the specific Socket.IO room for general updates (e.g., member list changes)
    io.to(roomCode).emit('roomUpdated', { room: populatedRoom }); // Let all room members know the room object updated

    console.log(`[UpdateMemberStatus] User ${memberId} status updated to ${status} in room ${room.roomCode}`);
    res.status(200).json({ message: `Member status updated to ${status}.`, room: populatedRoom });
  }catch(err: any){
    console.error('Error updating member status:', err.message);
    res.status(500).json({ message: 'Server error' });
  }

}