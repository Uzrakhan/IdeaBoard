import mongoose, { Document, Types, Schema, model } from "mongoose";
import { IUser } from "./User";

//A plan for what data a signle 'room member' object should contain
//before it becomes a full Mongoose document
export interface IRoomMemberData {
    user: Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
}

//Says IroomMember is also a MOngoose document in addition 
//to having fields from IRoomMemberData
export interface IRoomMember extends IRoomMemberData, Document {}

//Main interface for Room document
export interface IRoom extends Document {
    roomCode: string; // The single unique identifier
    name?: string;
    owner: Types.ObjectId | IUser;
    members: Types.DocumentArray<IRoomMember>; //members field will be an array of IRoomMember objects
    createdAt: Date;
}


const RoomSchema = new mongoose.Schema({
    roomCode: { // This is your primary unique identifier
        type: String,
        required: true,
        unique: true, // KEEP THIS TRUE
        index: true //creates a databse index on this field
    },
    name: {
        type: String,
        required: false
    },
    owner: {
        type: Schema.Types.ObjectId, //Stores a MOngoDB ObjectId
        ref: 'User', //Tells Mongoose that this ObjectId refers to a doc in User collection
        required: true
    },
    members: [{
        user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        status: {type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'}
    }],
    createdAt: {type: Date, default: Date.now}
});

//Before a Room document is actually saved to databse, this func will run
RoomSchema.pre('save', function (this: IRoom, next: (err?: mongoose.CallbackError) => void) {
    const ownerId = this.owner as Types.ObjectId; //gets ID of the room owner

    //checks if room owner's ID (ownerId) already exists in members array
    const isOwnerAMember = this.members.some((member: IRoomMember) => member.user.equals(ownerId));

    //if owner is not a member, then automatically add them to members list
    // with status apporved
    if (!isOwnerAMember) {
        this.members.push({ user: ownerId, status: 'approved' } as IRoomMember);
    }
    next(); //crucial , tells Mongoose to continue with the save operation afetr this hook
});

const Room = model<IRoom>('Room', RoomSchema);
export default Room;