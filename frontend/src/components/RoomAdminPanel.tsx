import React from 'react';
import { updateRoomMemberStatus } from '../api';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Check, X, CircleUser,Users, UserMinus,  Clock, ShieldCheck } from 'lucide-react'

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
        <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-xl mx-auto'>

            {/** HEADER */}
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
                        Room Admin Panel
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage who can join and collaborate
                    </p>
                </div>

                <span className='px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'>
                    {room.roomCode}
                </span>
            </div>

            <div className='space-y-8'>

                {/** pending requests */}
                <section>
                    <div className='flex items-center gap-2 mb-3'>
                        <Clock className='w-5 h-5 text-yellow-500'/>
                        <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-100'>
                            Pending Requests
                            <span className="ml-2 text-sm text-yellow-600 dark:text-yellow-400">
                                ({pendingRequests.length})
                            </span>
                        </h3>
                    </div>

                    {pendingRequests.length ? (
                        <ul className='space-y-3'>
                            {pendingRequests.map(req => (
                                <li
                                    key={req.user._id}
                                    className='flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl hover:shadow-md transition'
                                >
                                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                        {req.user.username}
                                    </span>

                                    <div className=' flex gap-2 '>
                                        <button
                                            onClick={() => handleRequest(req.user._id, 'approved')}
                                            className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition"
                                            title='Approve'
                                        >
                                            <Check className='w-4 h-4'/>
                                        </button>

                                        <button
                                            onClick={() => handleRequest(req.user._id, 'rejected')}
                                            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition"
                                            title="Reject"
                                        >
                                            <X className='w-4 h-4'/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-5 text-gray-500 dark:text-gray-400 italic">
                            No one is waiting to join
                        </div>
                    )}
                </section>

                {/** approved members */}
                <section>
                    <div className='flex items-center gap-2 mb-3'>
                        <ShieldCheck className='w-5 h-5 text-green-500'/>
                        <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-100'>
                            Approved Members
                            <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                ({approvedMembers.length})
                            </span>
                        </h3>
                    </div>

                    {approvedMembers.length ? (
                        <ul className='space-y-3'>
                            {approvedMembers.map(mem => (
                                <li
                                    key={mem.user._id}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl"
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400"/>
                                        <span className="font-medium text-gray-800 dark:text-gray-100">
                                            {mem.user.username}
                                        </span>

                                        {mem.user._id === room.owner._id && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 font-semibold">
                                                Owner 
                                            </span>
                                        )}
                                    </div>

                                    {mem.user._id !== room.owner._id && (
                                        <button
                                            onClick={() => handleRequest(mem.user._id, 'rejected')}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition"
                                        >
                                            <UserMinus className="w-3 h-3" />
                                            Remove
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-5 text-gray-500 dark:text-gray-400 italic">
                            No approved members yet
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default RoomAdminPanel;