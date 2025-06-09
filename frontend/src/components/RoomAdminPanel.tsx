import React from 'react';
import { handleRoomRequest } from '../api';
import type { Room } from '../types';

interface RoomAdminPanelProps {
    room: Room;
    setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}

const RoomAdminPanel: React.FC<RoomAdminPanelProps> = ({ room, setRoom }) => {
    const pendingRequests = room.members.filter(m => m.status === 'pending');

    const handleRequest = async (userId: string, action: 'approve' | 'reject') => {
        try {
            await handleRoomRequest(room.roomId, userId, action);
            setRoom(prev => {
                if (!prev) return null;

                let updatedMembers = prev.members;
                if (action === 'approve') {
                    updatedMembers = prev.members.map(member =>
                        member.user._id === userId ? { ...member, status: 'approved' } : member
                    );
                } else if (action === 'reject') {
                    updatedMembers = prev.members.filter(member => member.user._id !== userId);
                }

                return { ...prev, members: updatedMembers };
            });
        } catch (error) {
            console.error('Failed to handle request', error);
        }
    };

    return (
        <div className='admin-panel'>
            <h3>Room Administration</h3>

            {pendingRequests.length > 0 ? (
                <div className='requests'>
                    <h4>Pending Join Requests</h4>
                    <ul>
                        {pendingRequests.map((request) => (
                            <li key={request.user._id} className="request-item">
                                <span>{request.user.username}</span>
                                <div className="actions">
                                    <button 
                                        onClick={() => handleRequest(request.user._id, 'approve')}
                                        className="approve-btn"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleRequest(request.user._id, 'reject')}
                                        className="reject-btn"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ): (
                <p>No pending requests</p>
            )}

            <div className='members'>
                <h4>Approved Members:</h4>
                <ul>
                    {room.members
                        .filter(member => member.status === 'approved')
                        .map(member => (
                            <li key={member.user._id}>{member.user.username}</li>
                        ))
                    }
                </ul>
            </div>
        </div>
    )
};

export default RoomAdminPanel;