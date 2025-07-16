import React from 'react';
import {  updateRoomMemberStatus } from '../api';
import type { Room } from '../types';

interface RoomAdminPanelProps {
    room: Room;
    setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}

const RoomAdminPanel: React.FC<RoomAdminPanelProps> = ({ room }) => {
    const pendingRequests = room.members.filter(m => m.status === 'pending');

    const handleRequest = async (userId: string, status: 'approved' | 'rejected') => {
        try {
            // This API call updates the backend.
            // The backend should then emit a 'roomUpdated' socket event.
            await updateRoomMemberStatus(room.roomCode, userId, status);
            // No need to setCurrentRoom here. The socket.on('roomUpdated') in Whiteboard.tsx
            // will handle the state update when the backend emits it.
            //Hence deleted it.
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
                                        onClick={() => handleRequest(request.user._id, 'approved')}
                                        className="approve-btn"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleRequest(request.user._id, 'rejected')}
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