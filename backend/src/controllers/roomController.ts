// This file contains API controller functions related to Room management
//(creating,getting,updating,joining room) 
//acts as bridge between frontend requests & backend data
//It interacts with database and usese io

import express from 'express';
import mongoose from 'mongoose';
//import { Request, Response } from "express";
import { HydratedDocument } from "mongoose";
import Room from "../models/Room";
import { IRoom } from "../models/Room";
import { IRoomMember } from "../models/Room";
import User, { IUser } from "../models/User";
import { io, connectedUsers } from '../server'
import { AuthRequest } from '../middleware/auth'


//simple utility function
//create small 6 digit roomCode & unique
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2,8).toUpperCase();
};

//this controler expects an authenticated user (req.user.id) to be making te request
export const createRoom = async (req:any, res:any) => {
  try {
    console.log('[CreateRoom]Starting room creation for user:', req.user ? req.user.id : 'User ID not available');
    console.log('[CreateRoom] Request body:', req.body);
    //user verification , find user by id
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
    //enters a loop (up to maxAttempts) to generate a roomCode using generateCode()
    while (!isUnique && attempts < maxAttempts) {
      uniqueRoomCode = generateRoomCode();
      console.log(`[CreateRoom]Generated room code: ${uniqueRoomCode}, attempt ${attempts + 1}`);
      
      //checks for each generated room code to ensure its not already presnt in Room
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
    //once unique code is found, it creates a new Room instance 
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

    // save the room to databse
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

//this controller expects roomCode to be a part of URL parameters, also expects authenticated user (AuthRequest)
export const getRoom = async (req:AuthRequest, res:express.Response) => {
  try {
    //search for a room that matches the code form URL
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



// @route   POST /api/rooms/:roomCode/join
// @desc    Request to join a room (NEWLY ADDED OR CORRECTED)
// @access  Private
export const joinRoom = async (req: AuthRequest, res: express.Response) => {
  const { roomCode } = req.params;
  const userId = req.user?.id;

  console.log(`[JoinRoom Controller START] Request to join room: ${roomCode} by userId: ${userId}`);

  if (!userId) {
      console.log('[JoinRoom Controller] Not authenticated: userId is missing.');
      return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
      // --- NEW ULTRA-PRECISE LOG ---
      console.log(`[JoinRoom Controller] ABOUT TO CALL Room.findOne for roomCode: ${roomCode}`);
      // --- END NEW ULTRA-PRECISE LOG ---
      const room = await Room.findOne({ code: roomCode });

      if (!room) {
          console.log(`[JoinRoom Controller] Step 1.1: Room ${roomCode} not found.`);
          return res.status(404).json({ message: 'Room not found' });
      }
      console.log(`[JoinRoom Controller] Step 1.2: Room found: ${room._id}. Owner: ${room.owner.toString()}`);

      // --all other logic ocmmented out for isolation
      console.log(`[JoinRoom Controller END - MINIMAL] Returning success for room ${roomCode}.`);
      
      console.log(`[JoinRoom Controller] Step 2: Checking if user ${userId} is an existing member.`);
      const existingMember = room.members.find(m => m.user?._id?.toString() === userId);

      if (existingMember) {
          if (existingMember.status === 'approved') {
              console.log(`[JoinRoom Controller] Step 2.1: User ${userId} is already an approved member.`);
              return res.status(200).json({ message: 'You are already an approved member of this room.', room });
          } else if (existingMember.status === 'pending') {
              console.log(`[JoinRoom Controller] Step 2.2: User ${userId}'s request is already pending.`);
              return res.status(200).json({ message: 'Your join request for this room is already pending approval.', room });
          }
      }

      console.log(`[JoinRoom Controller] Step 3: Adding user ${userId} as a pending member.`);
      try {
          const userObjectId = new mongoose.Types.ObjectId(userId);
          room.members.push({ user: userObjectId, status: 'pending' });
          console.log('[JoinRoom Controller] Step 3.1: User added to members array.');
      } catch (innerErr: any) {
          console.error('[JoinRoom Controller] CRITICAL ERROR IN STEP 3 (Adding member):', innerErr.message, innerErr.stack);
          throw innerErr; // Re-throw to be caught by outer catch
      }

      console.log('[JoinRoom Controller] Step 4: Attempting to save room with new pending member.');
      try {
          await room.save();
          console.log('[JoinRoom Controller] Step 4.1: Room saved successfully.');
      } catch (innerErr: any) {
          console.error('[JoinRoom Controller] CRITICAL ERROR IN STEP 4 (Saving room):', innerErr.message, innerErr.stack);
          throw innerErr; // Re-throw
      }

      console.log('[JoinRoom Controller] Step 5: Attempting to populate room for response and notifications.');
      let populatedRoom;
      try {
          populatedRoom = await Room.findById(room._id)
              .populate<{ owner: IUser }>('owner', 'username')
              .populate<{ members: { user: IUser; status: 'pending' | 'approved' | 'rejected' }[] }>('members.user', 'username');
          console.log('[JoinRoom Controller] Step 5.1: Room populated successfully.');
      } catch (innerErr: any) {
          console.error('[JoinRoom Controller] CRITICAL ERROR IN STEP 5 (Populating room):', innerErr.message, innerErr.stack);
          throw innerErr; // Re-throw
      }

      if (!populatedRoom) {
          console.error('[JoinRoom Controller] Step 5.2: Populated room is null after save. This is unexpected.');
          return res.status(500).json({ message: 'Room not found after member update' });
      }

      console.log('[JoinRoom Controller] Step 6: Finding new pending member for notification.');
      const newPendingMember = populatedRoom.members.find(m => m.user?._id?.toString() === userId);
      console.log('[JoinRoom Controller] Step 6.1: New pending member details:', newPendingMember?.user?.username || 'N/A');

      console.log('[JoinRoom Controller] Step 7: Attempting Socket.IO notification to owner.');
      const ownerSocketId = connectedUsers.get(populatedRoom.owner?._id?.toString() || '');
      if (ownerSocketId) {
          io.to(ownerSocketId).emit('newJoinRequest', {
              roomCode: room.roomCode,
              requester: newPendingMember?.user?.username || 'Unknown User',
              requesterId: userId,
              message: `${newPendingMember?.user?.username || 'Someone'} wants to join room ${room.roomCode}.`
          });
          console.log(`[JoinRoom Controller] Step 7.1: Socket.IO: newJoinRequest emitted to owner's socket ${ownerSocketId}.`);
      } else {
          console.log(`[JoinRoom Controller] Step 7.2: Socket.IO: Owner of room ${room.roomCode} not connected (socketId not found).`);
      }

      console.log('[JoinRoom Controller] Step 8: Emitting roomUpdated to room.');
      io.to(roomCode).emit('roomUpdated', { room: populatedRoom });
      console.log('[JoinRoom Controller] Step 8.1: roomUpdated emitted.');

      console.log(`[JoinRoom Controller END] User ${userId} successfully sent join request for room ${roomCode}.`);
      res.status(200).json({ message: 'Minimal join request processed (no actual join logic executed).', room: room });
  } catch (err: any) {
    console.error('----- [JoinRoom Controller] CAUGHT EXCEPTION (Outer - MINIMAL) -----');
    console.error(`[JoinRoom Controller] Critical error for room ${roomCode}, user ${userId}:`);
    console.error('[JoinRoom Controller] Error object (Outer Catch):', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('[JoinRoom Controller] Error message (Outer Catch):', err.message);
    console.error('[JoinRoom Controller] Error stack (Outer Catch):', err.stack);
    console.error('-----------------------------------------');
    res.status(500).json({ message: 'Server error (minimal joinRoom)', details: err.message });
  }
};



//
export const updateMemberStatus = async (req: AuthRequest, res: express.Response) => {
  const { roomCode, memberId } = req.params; //get roomCode & memberId from URL
  const { status: memberStatus } = req.body; // get new status from request body
  const ownerId = req.user?.id; //get ID of authenticated user

  if(!ownerId) {
    return res.status(401).json({ message: 'Not authenticated.' })
  }

  //if new status is neither of the three options
  if(!['approved', 'rejected'].includes(memberStatus)){
    return res.status(400).json({ message: 'invalid status provided.' });
  }

  try{
    //find the room
    const room  = await Room.findOne({  roomCode: roomCode});

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    //cehck if requestion user is the room owner
    if (room.owner.toString() !== ownerId) {
      return res.status(403).json({ message: 'You are not the owner of this room.' })
    }

    //find member to update within the room's membrs array
    //iterates through members array to find the specific member to update using findIndex
    const memberIndex = room.members.findIndex(
      m => m.user?._id?.toString() === memberId //compare member's user ID iwth memberId
    );

    if(memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this room.' })
    }

    //member to update
    const memberToUpdate = room.members[memberIndex];
    if(memberToUpdate.status === memberStatus) {
      return res.status(200).json({ message: `Member already ${memberStatus}.`,room })
    }

    memberToUpdate.status = memberStatus; //update the status
    await room.save(); //save the room to update the embedded member status

    //populate for notifications
    const populatedRoom = await Room.findById(room._id)
      .populate<{ owner: IUser }>('owner','username') // Populate owner for username
      .populate<{ members: { user: IUser }[] }>('members.user', 'username') //Populate members' user fileds for username

    if(!populatedRoom) {
      return res.status(500).json({ message: 'Room not found after member status update' })
    }
    // --- Socket.IO: Notify the room owner and the updated member about the status change ---
    //Find username of the updated user
    const members = populatedRoom.members as { user: IUser; status: string }[];
    const updatedUser = populatedRoom.members.find(m => m.user?._id?.toString() === memberId)?.user?.username || 'A user';

    // Notify owner's active socket (if connected)
    const ownerSocketId = connectedUsers.get(ownerId); // Get owner's socket ID from map
    if (ownerSocketId) {
      io.to(ownerSocketId).emit('memberStatusUpdated', {
        roomCode: room.roomCode,
        memberId: memberId,
        status: memberStatus,
        message: `${updatedUser}'s status updated to ${memberStatus}.`
      });
    }

    // Also emit directly to the updated user's socket if they are connected
    // Notify the updated user's active socket (if connected)
    const memberSocketId = connectedUsers.get(memberId); // Get member's socket ID from map
    if (memberSocketId) {
        io.to(memberSocketId).emit('yourRoomStatusUpdated', {
            roomCode: room.roomCode,
            status: memberStatus,
            message: `Your status in room ${room.roomCode} is now ${memberStatus}.`
        });
    }

    // Emit to the specific Socket.IO room (all conncetd users) for general updates (e.g., member list changes)
    io.to(roomCode).emit('roomUpdated', { room: populatedRoom }); // Let all room members know the room object updated
    console.log(`[UpdateMemberStatus] User ${memberId} status updated to ${memberStatus} in room ${room.roomCode}`);
    res.status(200).json({ message: `Member status updated to ${memberStatus}.`, room: populatedRoom });
  }catch(err: any){
    console.error('Error updating member status:', err.message);
    res.status(500).json({ message: 'Server error' });
  }

}

