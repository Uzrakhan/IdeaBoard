import React from 'react';
import { updateRoomMemberStatus } from '../api';
import type { Room } from '../types';

interface RoomAdminPanelProps {
    room: Room;
    setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>; // Keep if needed elsewhere, though not used in handleRequest
}

const RoomAdminPanel: React.FC<RoomAdminPanelProps> = ({ room }) => {
    // Filter pending requests
    const pendingRequests = room.members.filter(m => m.status === 'pending');
    // Filter approved members
    const approvedMembers = room.members.filter(m => m.status === 'approved');

    const handleRequest = async (userId: string, status: 'approved' | 'rejected') => {
        try {
            await updateRoomMemberStatus(room.roomCode, userId, status);
            // The backend should emit a 'roomUpdated' socket event, which Whiteboard.tsx will handle.
            // No direct state update needed here.
        } catch (error) {
            console.error('Failed to handle request', error);
            // Optionally, you might want to show a toast or alert to the user here
        }
    };

    return (
        <div className='bg-gray-800 text-gray-100 p-6 rounded-lg shadow-xl font-inter max-w-md mx-auto'>
            <h3 className='text-2xl font-bold mb-6 text-center text-indigo-300'>
                Room Administration
            </h3>

            {/* Pending Requests Section */}
            <div className='mb-8'>
                <h4 className='text-xl font-semibold mb-4 text-indigo-200'>
                    Pending Join Requests ({pendingRequests.length})
                </h4>
                {pendingRequests.length > 0 ? (
                    <ul className='space-y-4'>
                        {pendingRequests.map((request) => (
                            <li 
                                key={request.user._id} 
                                className="flex items-center justify-between bg-gray-700 p-4 rounded-md shadow-md"
                            >
                                <span className='text-lg font-medium text-gray-50 flex-grow mr-4'>
                                    {request.user.username}
                                </span>
                                <div className="flex space-x-3"> {/* Use flexbox for button alignment */}
                                    <button 
                                        onClick={() => handleRequest(request.user._id, 'approved')}
                                        className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleRequest(request.user._id, 'rejected')}
                                        className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className='text-gray-400 italic text-center'>
                        No new join requests at the moment.
                    </p>
                )}
            </div>

            {/* Approved Members Section */}
            <div className='mt-8 pt-6 border-t border-gray-700'>
                <h4 className='text-xl font-semibold mb-4 text-indigo-200'>
                    Approved Members ({approvedMembers.length})
                </h4>
                {approvedMembers.length > 0 ? (
                    <ul className='space-y-2'>
                        {approvedMembers.map(member => (
                            <li key={member.user._id} className='bg-gray-700 p-3 rounded-md text-gray-50 shadow-sm'>
                                {member.user.username}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className='text-gray-400 italic text-center'>
                        No members have joined yet.
                    </p>
                )}
            </div>
        </div>
    );
};

export default RoomAdminPanel;