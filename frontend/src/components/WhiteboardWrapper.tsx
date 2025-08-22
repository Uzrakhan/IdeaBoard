import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom } from '../api';
import Whiteboard from './Whiteboard';
import type { Room } from '../types';



const WhiteboardWrapper: React.FC= () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomCode) return;
      try {
        const responseData = await getRoom(roomCode);
        // Add a safety check for the 'room' property itself
        if(!responseData) throw new Error('Room data not found in response.');
        setRoom(responseData);
      } catch (err: any) {
        console.error("DEBUG: Error fetching room in WhiteboardWrapper:", err);
        setError(err.response?.data?.message || 'Failed to load room');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchRoomDetails();
  }, [roomCode, navigate]);

  if (loading) return <div>Loading whiteboard...</div>;
  if (error) return <div className="text-center text-red-600">Error: {error}</div>;
  if (!room) return <div className="text-center">Room not found !!!!!!</div>;

  return <Whiteboard />;
};

export default WhiteboardWrapper;