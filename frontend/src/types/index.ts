export interface User{
    _id: string;
    username: string
}

export interface RoomMember {
    user: User;
    status: 'pending' | 'approved'
}

export interface Room{
    _id: string;
    roomId: string;
    owner: User;
    members: RoomMember[];
    createdAt: string;
}