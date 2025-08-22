import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import JoinRoom from './JoinRoom';
import type { Room } from '../types';


const JoinRoomWrapper: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomCode) return;

      if (currentRoom && currentRoom.roomCode === roomCode) {
        const isApproved = currentRoom.members?.some(
          (m: any) => m?.user?._id?.toString() === userId && m.status === 'approved'
        );
        if (isApproved) {
          navigate(`/room/${roomCode}`);
          return;
        }
      }

      try {
        const responseData = await getRoom(roomCode);
        // Add a safety check for the 'room' property itself
        if(!responseData) throw new Error('Room data not found in response');
        setCurrentRoom(responseData);
        const isApproved = responseData.members?.some(
          (m: any) => m?.user?._id?.toString() === userId && m.status === 'approved'
        );
        if (isApproved) navigate(`/room/${roomCode}`);
      } catch (err: any) {        
        console.error("DEBUG: Error fetching room in JoinRoomWrapper:", err);
        setError(err.response?.data?.message || 'Failed to load room');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomCode, userId, navigate]);

  if (isLoading) return <div>Loading room...</div>;
  if (error) return <div className="error">{error}</div>;
  return currentRoom ? <JoinRoom room={currentRoom} /> : null;
};

export default JoinRoomWrapper