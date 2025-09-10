import React from 'react';
import { updateRoomMemberStatus } from '../api';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Check, X, CircleUser } from 'lucide-react'

interface RoomAdminPanelProps {
    room: Room;
    setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>; // Keep if needed elsewhere, though not used in handleRequest
}

const RoomAdminPanel: React.FC<RoomAdminPanelProps> = ({ room }) => {
    const { currentUser } = useAuth();
    const isOwner = currentUser && room?.owner?._id === currentUser._id;

    // Filter pending requests
    const pendingRequests = room.members.filter(m => m.status === 'pending');
    // Filter approved members
    const approvedMembers = room.members.filter(m => m.status === 'approved');

    const handleRequest = async (userId: string, status: 'approved' | 'rejected') => {
        if(!isOwner) {
            toast.error("You don't have permission to perform this action.");
            return;
        }

        try {
            await updateRoomMemberStatus(room.roomCode, userId, status);
            // The backend should emit a 'roomUpdated' socket event, which Whiteboard.tsx will handle.
            // No direct state update needed here.
            toast.success(`Request ${status} successfully.`);
        } catch (error) {
            console.error('Failed to handle request', error);
            // Optionally, you might want to show a toast or alert to the user here
            toast.error('Failed to handle request. Please try again.');
        }
    };

    return (
        <div className='bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-xl shadow-md font-inter max-w-md w-full mx-auto'>
            <h3 className='text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-50'>
                Room Administration
            </h3>
            <div className='space-y-8'>
                {/* Pending Requests Section */}
                <div>
                    <h4 className='flex items-center text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400'>
                        Pending Requests ({pendingRequests.length})
                    </h4>
                    {pendingRequests.length > 0 ? (
                        <ul className='space-y-4'>
                            {pendingRequests.map((request) => (
                                <li
                                    key={request.user._id}
                                    className='flex items-center justify-between bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.02]'
                                >
                                    <span
                                        className='text-lg font-medium text-gray-700 dark:text-gray-200 flex-grow mr-4 truncate'
                                    >
                                        {request.user.username}
                                    </span>
                                    <div className='flex space-x-2'>
                                        <button
                                            onClick={() => handleRequest(request.user._id, 'approved')}
                                            className='bg-green-500 hover:bg-green-600 text-white font-semibold p-2 rounded-full transition-colors duration-200'
                                            title='Approve'
                                        >
                                            <Check className='w-4 h-4'/>
                                        </button>
                                        <button
                                            onClick={() => handleRequest(request.user._id, 'rejected')}
                                            className='bg-red-500 hover:bg-red-600 text-white font-semibold p-2 rounded-full transition-colors duration-200'
                                            title='Reject'
                                        >
                                            <X className='w-4 h-4'/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className='text-gray-500 dark:text-gray-400 italic text-center py-4'>
                            No new join requests at the moment.
                        </p>
                    )}
                </div>

                {/* Approved Members Section */}
                <div className='pt-6 border-t border-gray-200 dark:border-gray-700'>
                    <h4 className='flex items-center text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400'>
                        <CircleUser className="mr-2 w-5 h-5" />
                        Approved Members ({approvedMembers.length})
                    </h4>
                    {approvedMembers.length > 0 ? (
                        <ul className='space-y-3'>
                            {approvedMembers.map(member => (
                                <li
                                    key={member.user._id}
                                    className='flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg text-gray-700 dark:text-gray-200 shadow-sm'
                                >
                                    <span className="flex items-center">
                                        {member.user.username}
                                        {member.user._id === room.owner?._id && (
                                            <span className="ml-2 text-xs font-bold px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full">
                                                Owner
                                            </span>
                                        )}
                                    </span>
                                    {member.user._id !== room.owner?._id && (
                                        <button
                                            onClick={() => handleRequest(member.user._id, 'rejected')}
                                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold p-2 rounded-full transition-colors duration-200"
                                            title="Remove Member"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className='text-gray-500 dark:text-gray-400 italic text-center py-4'>
                            No members have joined yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoomAdminPanel;