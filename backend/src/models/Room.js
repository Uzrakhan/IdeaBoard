"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const RoomSchema = new mongoose_1.default.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: {
        type: [
            {
                user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
                status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            }
        ],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
});
// Pre-save hook to ensure owner is always a member
RoomSchema.pre('save', function (next) {
    // owner is Types.ObjectId before save
    const ownerId = this.owner;
    const isOwnerAMember = this.members.some(member => {
        // Safely determine the user ID from the member object
        let memberUserId;
        if (member.user instanceof mongoose_1.Types.ObjectId) {
            memberUserId = member.user;
        }
        else if (member.user?._id instanceof mongoose_1.Types.ObjectId) {
            // If it's a populated user (IUser & Document), get its _id
            memberUserId = member.user._id;
        }
        // Ensure memberUserId is an ObjectId before calling .equals
        return memberUserId ? memberUserId.equals(ownerId) : false;
    });
    if (!isOwnerAMember) {
        this.members.push({ user: ownerId, status: 'approved' });
    }
    next();
});
const Room = (0, mongoose_1.model)('Room', RoomSchema);
exports.default = Room;
//# sourceMappingURL=Room.js.map