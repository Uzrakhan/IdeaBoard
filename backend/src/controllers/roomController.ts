import Room from "../models/Room";
import User from "../models/User";


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