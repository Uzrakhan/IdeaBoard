import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoom, joinRoom } from '../api';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';

interface JoinRoomProps {
    setCurrentRoom?: (room: Room) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ setCurrentRoom }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const [room, setRoom] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    useAuth();

    useEffect(() => {
        const fetchRoom = async () => {
            if (!roomId) {
                setError('Room ID is missing');
                setIsLoading(false);
                return;
            }

            try {
                const response = await getRoom(roomId);
                setRoom(response.data);
                setError('');
            } catch (err: any) {
                console.error('Room fetch error:', err);
                setError(err.response?.data?.message || 'Failed to load room');
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoom();
    }, [roomId, navigate]);

    const handleJoinRequest = async () => {
        if (!roomId) return;
        setError('');

        try {
            await joinRoom(roomId);
            setStatus('Join request sent to room owner.');

            // Refetch room data after successful join request
            const updatedResponse = await getRoom(roomId);
            setRoom(updatedResponse.data);
            
            if (setCurrentRoom) {
                setCurrentRoom(updatedResponse.data);
            }
        } catch (err: any) {
            console.error('Join room error:', err);
            setError(err.response?.data?.message || 'Failed to send request');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p>Loading room details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto px-4 py-12">
                <div className="bg-white rounded-xl shadow-md p-6 text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Room Not Found</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!room) {
        return null;
    }

    // Fixed: Use room.owner._id for comparison
    const isOwner = room.owner._id === userId;
    
    // Fixed: Check member status correctly
    const isMember = room.members.some(
        m => m.user._id === userId && m.status === 'approved'
    );

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className='bg-white rounded-xl shadow-md p-6 md:p-8'>
                <div className='text-center mb-8'>
                    <h1 className='text-2xl font-bold text-gray-800 mb-2'>
                        Join Collaboration Room
                    </h1>
                    <div className='text-indigo-600 font-mono text-lg bg-indigo-50 inline-block px-4 py-1 rounded-md'>
                        {room.name || `Room ${room._id.substring(0, 8)}`}
                    </div>
                </div>

                <div className="flex items-center bg-gray-50 rounded-lg p-6 mb-8">
                    <div className='bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16' />
                    <div className="ml-4">
                        <h3 className='font-medium text-gray-800'>
                            {room.owner.username}
                        </h3>
                        <p className='text-gray-600'>
                            Room Owner
                        </p>
                    </div>
                </div>

                <p className='text-gray-600 text-center mb-6'>
                    {isOwner 
                        ? "You are the owner of this room." 
                        : "Request access to start collaboration"}
                </p>

                <div className='flex items-center justify-center text-gray-600 mb-6'>
                    <i className='fas fa-users mr-2'></i>
                    <span>{room.members.filter(m => m.status === "approved").length} members</span>
                </div>
            </div>

            {isOwner ? (
                <div className='text-center'>
                    <p className='text-gray-600 mb-4'>
                        You own this room. You can manage access requests and start collaborating.
                    </p>
                    <button
                        onClick={() => navigate(`/room/${roomId}`)}
                        className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium'
                    >
                        Go to Whiteboard
                    </button>
                </div>
            ) : isMember ? (
                <div className='text-center'>
                    <div className="text-green-600 bg-green-50 p-4 rounded-lg mb-6">
                        <i className='fas fa-check-circle mr-2'></i>
                        You're already a member of this room
                    </div>
                    <button
                        onClick={() => navigate(`/room/${roomId}`)}
                        className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium'
                    >
                        Join Whiteboard
                    </button>
                </div>
            ) : status ? (
                <div className='text-center'>
                    <div className='text-blue-600 bg-blue-50 p-4 rounded-lg mb-6'>
                        <i className='fas fa-clock mr-2'></i>
                        {status}
                    </div>
                    <p className='text-gray-600'>
                        The room owner will be notified of your request. You'll be able to join once approved.
                    </p>
                </div>
            ) : (
                <div className='text-center'>
                    <button
                        onClick={handleJoinRequest}
                        className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium w-full max-w-xs'
                    >
                        Request to Join
                    </button>
                </div>
            )}
        </div>
    );
};

export default JoinRoom;