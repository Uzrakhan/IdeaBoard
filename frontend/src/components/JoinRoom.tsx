import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRoom, joinRoom } from '../api';
import type { Room } from '../types';
import RoomAdminPanel from './RoomAdminPanel';

interface JoinRoomProps {
    room: Room;
    setCurrentRoom?: (room: Room) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({  setCurrentRoom }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const [room,setRoom] = useState<Room | null>(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchRoom = async () => {
            if (!roomId) return;

            try {
                const response = await getRoom(roomId);
                setRoom(response.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load room');
            }
        };
        fetchRoom();
    }, [roomId]);


    const handleJoinRequest = async () => {
        if (!roomId) return;

        try {
            await joinRoom(roomId);
            setStatus('Join request sent to room owner.')

            // Update room data after request
            if (room) {
                const updatedRoom = await getRoom(room.roomId);
                if (setCurrentRoom) setCurrentRoom(updatedRoom.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send request');
        }
    };

    if (error) return <div className='error'>{error}</div>
    if (!room) return <div>Loading room ...</div>


    const isOwner = room.owner._id === userId;
    const isMember = room.members.some(
        m => m.user._id === userId && m.status === 'approved'
    );

    return (
        <div className='join-room'>
            <h2>Room: {roomId}</h2>
            <p>Created by: {room.owner.username}</p>

            {isOwner ? (
                <RoomAdminPanel room={room} setRoom={() => {}} />
            ): isMember ? (
                <div className='success'>You're a member of this room</div>
            ): status ? (
                <div className="info">{status}</div>
            ): (
                <button
                onClick={handleJoinRequest} className='join-btn'
                >
                    Reuqest To Join
                </button>
            )}
        </div>
    )
};

export default JoinRoom;