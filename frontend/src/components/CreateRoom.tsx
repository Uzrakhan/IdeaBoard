import { useState } from 'react';
import { createRoom, getRoom } from '../api';
import ShareButtons from './ShareButtons';
import type { Room } from '../types';

interface CreateRoomProps {
    onRoomCreated: (room: Room) => void;
}



const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated }) => {
    const [roomLink,setRoomLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateRoom = async () => {
        setLoading(true);
        setError('');

        try{
            const response = await createRoom();
            const roomLink = `${window.location.origin}/join/${response.data.roomId}`
            setRoomLink(roomLink);
            //fetch full room details and pass to parent
            const roomResponse = await getRoom(response.data.roomId);
            onRoomCreated(roomResponse.data)
        } catch(err: any) {
            setError(err.response?.data?.message || 'Failed to create room')
        } finally {
            setLoading(false);
        }
    }

  return (
    <div className='create-room'>
        <h2>Create Collaboration Room</h2>
        {error && <div className='error'>{error}</div>}

        {!roomLink ? (
            <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="create-btn"
            >
                {loading ? 'Creating..' : 'Create Room'}
            </button>
        ) : (
            <div className='room-link'>
                <p>Share this link with others</p>
                <div className='link-container'>
                    <input 
                        type="text" 
                        value={roomLink} 
                        readOnly 
                        className="link-input"
                    />
                    <button 
                        onClick={() => navigator.clipboard.writeText(roomLink)}
                        className="copy-btn"
                    >
                        Copy
                    </button>
                </div>
                <ShareButtons url={roomLink}/>
            </div>
        )}
    </div>
  )
}

export default CreateRoom