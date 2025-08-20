import mongoose , { Document } from 'mongoose';

//defining the interface for a User document
export interface IUser extends Document {
    username: string;
    password?: string;
    googleId?: string;
    email: string;
    avatar?: string;
    createdAt?: Date;
};

const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true, sparse: true },
    username: { type: String, required: true, unique: true },
    password: { type: String },
    email: { type: String, required: true, unique: true },
    avatar: { type: String }
}, {
    timestamps: true // Mongoose will automatically add createdAt and updatedAt fields
});

export default mongoose.model<IUser>('User', userSchema);
