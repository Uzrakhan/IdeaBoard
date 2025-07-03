import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';

interface JoinRoomProps {
  room: Room;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ room }) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [error, setError] = useState('');
  const [showRequestSentMessage, setShowRequestSentMessage] = useState(false);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  useAuth();

  // Check if user already sent request
  const hasPendingRequest =
    room?.members?.some(
      (m) => m?.user?._id === userId && m.status === 'pending'
    ) ?? false;

  const handleJoinRequest = async () => {
    if (!roomCode) return;
    setError('');

    try {
      await joinRoom(roomCode);
      setShowRequestSentMessage(true);
    } catch (err: any) {
      console.error('Join room error:', err);
      setError(err.response?.data?.message || 'Failed to send request');
    }
  };

  const isOwner = room?.owner?._id === userId;

  const isApprovedMember =
    room?.members?.some(
      (m) => m?.user?._id === userId && m.status === 'approved'
    ) ?? false;

  useEffect(() => {
    if (isApprovedMember && !isOwner) {
      console.log('User is now an approved member, redirecting to whiteboard.');
      navigate(`/room/${room.roomCode}`);
    }
  }, [isApprovedMember, isOwner, navigate, room.roomCode]);

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

  if (!room) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 font-inter">
      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Join Collaboration Room
          </h1>
          <div className="text-indigo-600 font-mono text-lg bg-indigo-50 inline-block px-4 py-1 rounded-md">
            {room.name || `Room ${room.roomCode}`}
          </div>
        </div>

        <div className="flex items-center bg-gray-50 rounded-lg p-6 mb-8">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-gray-800 text-lg">
              {room?.owner?.username || 'Room Owner'}
            </h3>
            <p className="text-gray-600 text-sm">Room Owner</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-600 font-medium text-center mb-6">
            {error}
          </div>
        )}

        <p className="text-gray-600 text-center mb-6 text-base">
          {isOwner
            ? 'You are the owner of this room.'
            : 'Request access to start collaboration'}
        </p>

        <div className="flex items-center justify-center text-gray-600 text-base mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2h5m0 0a3 3 0 003 3h4a3 3 0 003-3m-7.5-2.5a3 3 0 11-6 0 3 3 0 016 0zm3.5 0a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>
            {room?.members?.filter((m) => m.status === 'approved')?.length || 0} members
          </span>
        </div>

        {isOwner ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You own this room. You can manage access requests and start collaborating.
            </p>
            <button
              onClick={() => navigate(`/room/${roomCode}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Go to Whiteboard
            </button>
          </div>
        ) : isApprovedMember ? (
          <div className="text-center">
            <div className="text-green-600 bg-green-50 p-4 rounded-lg mb-6">
              <svg className="w-6 h-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You're already a member of this room
            </div>
            <button
              onClick={() => navigate(`/room/${roomCode}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Join Whiteboard
            </button>
          </div>
        ) : (
          <div className="text-center">
            {hasPendingRequest || showRequestSentMessage ? (
              <div className="text-blue-600 bg-blue-50 p-4 rounded-lg mb-6 shadow-md">
                <svg className="w-6 h-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Join request sent to room owner. Awaiting approval.
              </div>
            ) : (
              <button
                onClick={handleJoinRequest}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-6 py-3 rounded-lg font-medium w-full max-w-xs transition-all duration-200 ease-out transform hover:-translate-y-0.5 shadow-lg"
              >
                Request to Join
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinRoom;
