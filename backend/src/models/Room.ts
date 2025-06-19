import mongoose, { Document, Types, Schema, model } from "mongoose";
import { IUser } from "./User";

export interface IRoomMemberData {
    user: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
}

export interface IRoomMember extends IRoomMemberData, Document {}

export interface IRoom extends Document {
    roomCode: string; // The single unique identifier
    name?: string;
    owner: Types.ObjectId | IUser;
    members: Types.DocumentArray<IRoomMember>;
    createdAt: Date;
}

const RoomSchema = new mongoose.Schema({
    roomCode: { // This is your primary unique identifier
        type: String,
        required: true,
        unique: true, // KEEP THIS TRUE
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
    members: [{
        user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        status: {type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'}
    }],
    createdAt: {type: Date, default: Date.now}
});

RoomSchema.pre('save', function (next) {
    const ownerId = this.owner as Types.ObjectId;
    const isOwnerAMember = this.members.some(member => member.user.equals(ownerId));

    if (!isOwnerAMember) {
        this.members.push({ user: ownerId, status: 'approved' } as IRoomMember);
    }
    next();
});

const Room = model<IRoom>('Room', RoomSchema);
export default Room;