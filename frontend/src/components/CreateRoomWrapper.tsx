import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoom from './CreateRoom';
import { createRoom } from '../api';
import type { Room } from '../types';


const CreateRoomWrapper: React.FC = () => {
    //const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateRoom = async () => {
        setIsLoading(true);
        setError('');
        setRoom(null);

        try{
            const response = await createRoom();
            console.log("Room data from API:", response.data);
            setRoom(response.data.room);
            console.log("Room state after setRoom:", response.data.room);
        }catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setIsLoading(false);
        }
    }

    const goToWhiteboard = () => {
        if (room?.roomCode) {
            navigate(`/room/${room.roomCode}`)
        }
    }

    const copyLinkToClipboard = () => {
        if (room?.roomCode) {
            const roomLink = `${window.location.origin}/join/${room.roomCode}`;
            navigator.clipboard.writeText(roomLink);
            alert('Link copied to clipboard!');
        }
    };


    /*
    const onRoomCreated = (room: Room) => {
        if (room?.roomCode) {
            navigate(`/room/${room.roomCode}`)
        }else {
            console.error('Room object is missing or invalid.');
        }
    };
    */
   
    return (
        <CreateRoom 
            isLoading={isLoading}
            error={error}
            roomCode={room?.roomCode || null}
            handleCreateRoom={handleCreateRoom}
            goToWhiteboard={goToWhiteboard}
            copyLinkToClipboard={copyLinkToClipboard}
        />
    )

};

export default CreateRoomWrapper;