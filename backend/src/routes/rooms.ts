import express from 'express';
import Room from '../models/Room';
import { IRoomMemberData } from '../models/Room';
import { auth } from '../middleware/auth';
import { Types} from 'mongoose';


//creates a new router object
const router = express.Router();


//create a new room
router.post('/', auth, async(req: express.Request, res: express.Response) => {
    try{
        //generate unique room ID
        // simple way to generate a random 6-character string
        const roomId = Math.random().toString(36).substring(2,8).toUpperCase();

        //create a new instance of Room model
        //with generated roomId, owner's ID
        // and adds owner as first approved member using subdocument creation
        const ownerMember:IRoomMemberData = {
            user: req.user._id as Types.ObjectId,
            status: 'approved'
        };
        const room = new Room({
            roomId,
            owner: req.user._id as Types.ObjectId,
            members: [ownerMember]
        });

        //saves this new room object to db
        await room.save();

        //sends a response back to client 
        res.status(201).json({
            roomId,
            link: `${process.env.CLIENT_URL}/join/${roomId}`
        });
    }catch (err) {
        res.status(500).json({message: 'Server error'})
    }
});

//join room request
router.post('/:roomId/join', auth, async (req: express.Request, res: express.Response) => {
    try{
        //finds a single document in Room collection where roomId
        //matches the one from URL
        const room = await Room.findOne({roomId: req.params.roomId});
        if (!room) {
            return res.status(404).json({message: 'Room not found.'})
        }

        //check if already a member
        const existingMember = room.members.find(member =>
            member.user.toString() === req.user._id.toString()
        );

        if (existingMember) {
            return res.status(400).json({ message: 'Already in room' });
        }

        //add join request
        const newMember: IRoomMemberData = { user: req.user._id as Types.ObjectId, status: 'pending' };
        room.members.push(newMember);
        await room.save();
        res.json({ message: 'Join request sent' });
        } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//handle join request
router.put('/:roomId/requests/:userId', auth, async (req: express.Request, res: express.Response) => {
    try{
        const {action} = req.body;
        const room = await Room.findOne({
            roomId: req.params.roomId,
            owner: req.user._id as Types.ObjectId
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const memberIndex = room.members.findIndex(member => 
            member.user.toString() === req.params.userId && 
            member.status === 'pending'
        );

        if (memberIndex === -1) {
            return res.status(404).json({message: "Request not found."})
        }

        if (action === 'approve') {
            room.members[memberIndex].status = 'approved';
        }else if (action === 'reject') {
            room.members.splice(memberIndex,1) //remove the member
        }else {
            return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
        }
        
        await room.save();
        res.json(room)
    }catch(err) {
        res.status(500).json({message: 'Server error'})
    }
});

//get room deatils
router.get('/:roomId', auth, async(req: express.Request, res: express.Response) => {
    try{
        const room = await Room.findOne({roomId: req.params.roomId})
            .populate('owner', 'username')
            .populate('members.user', 'username');
        
            if (!room) {
                return res.status(404).json({message: "Room not found."})
            }

            res.json(room);
    }catch(err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;