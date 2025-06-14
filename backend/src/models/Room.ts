import mongoose, { Document, Types,Schema, model } from "mongoose";
import { IUser } from "./User";
import { ref } from "process";

export interface IRoomMemberData {
    user: Types.ObjectId;
    status: 'pending' | 'approved' | 'rehected';
}

export interface IRoomMember extends IRoomMemberData, Document {}

export interface IRoom extends Document {
    roomId: string;
    owner: Types.ObjectId | IUser;
    members: Types.DocumentArray<IRoomMember>;
    // Types.DocumentArray is a special Mongoose type for subdocument arrays.
    // It understands that plain objects (IRoomMemberData) can be pushed and will be converted.
    createdAt: Date;
}

const RoomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        status: {type: String, enum: ['pending', 'approved'], default: 'pending'}
    }],
    createdAt: {type: Date, default: Date.now}
});

const Room = model<IRoom>('Room', RoomSchema)
export default Room;