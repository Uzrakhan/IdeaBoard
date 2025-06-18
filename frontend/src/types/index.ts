export interface User{
    _id: string;
    username: string
}

export interface RoomMember {
    user: User;
    status: 'pending' | 'approved'
}

export interface Room{
    name: string;
    _id: string;
    roomCode: string;
    owner: User;
    members: RoomMember[];
    createdAt: string;
}