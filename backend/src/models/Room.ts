import mongoose, { Document, Types, Schema, model, PopulatedDoc } from "mongoose";
import { IUser } from "./User"; // Ensure IUser is imported

// 1. Interface for a single Room Member's data (before it's a Mongoose Document)
export interface IRoomMemberData {
    user: Types.ObjectId; // User ID reference
    status: 'pending' | 'approved' | 'rejected';
}

// 2. Interface for a single Room Member as a Mongoose Subdocument
// This is what Mongoose creates when you push to the 'members' array
export interface IRoomMember extends IRoomMemberData, Document {}

// 3. Interface for a Populated Room Member
// This is what 'm' will look like in room.members.find(m => ...) AFTER populate
// PopulatedDoc<IUser & Document, Types.ObjectId> means it's an IUser document, but its original type was ObjectId
export interface IPopulatedRoomMember extends Document {
    user: PopulatedDoc<IUser & Document, Types.ObjectId>; // User is now populated as IUser & Document
    status: 'pending' | 'approved' | 'rejected';
}

// 4. Main Interface for Room document
export interface IRoom extends Document {
    roomCode: string;
    name?: string;
    // PopulatedDoc for owner: it's either IUser or ObjectId
    owner: PopulatedDoc<IUser & Document, Types.ObjectId>;
    // Members array can contain either the raw IRoomMember documents (before populate)
    // or the IPopulatedRoomMember objects (after populate)
    members: (IRoomMember | IPopulatedRoomMember)[]; // This union type is key
    createdAt: Date;
}

const RoomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: false
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: {
        type: [
            {
            user: { type: Schema.Types.ObjectId, ref: 'User' },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            }
    ],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to ensure owner is always a member
RoomSchema.pre('save', function (this: IRoom, next: (err?: mongoose.CallbackError) => void) {
    // owner is Types.ObjectId before save
    const ownerId = this.owner as Types.ObjectId;

    const isOwnerAMember = this.members.some(member => {
        // Safely determine the user ID from the member object
        let memberUserId: Types.ObjectId | undefined;
        if (member.user instanceof Types.ObjectId) {
            memberUserId = member.user;
        } else if ((member.user as IUser)?._id instanceof Types.ObjectId) {
            // If it's a populated user (IUser & Document), get its _id
            memberUserId = (member.user as IUser)._id as Types.ObjectId;
        }

        // Ensure memberUserId is an ObjectId before calling .equals
        return memberUserId ? memberUserId.equals(ownerId) : false;
    });

    if (!isOwnerAMember) {
        this.members.push({ user: ownerId, status: 'approved' } as IRoomMember);
    }
    next();
});

const Room = model<IRoom>('Room', RoomSchema);
export default Room;
