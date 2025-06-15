import { useState } from 'react';
import { createRoom, getRoom } from '../api';
import type { Room } from '../types';
import { useNavigate } from 'react-router-dom';

interface CreateRoomProps {
  onRoomCreated: (room: Room) => void;
    setCurrentRoom: (room: import('../types').Room) => void;
}

const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated }) => {
    const [roomLink, setRoomLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [roomId, setRoomId] = useState(''); 
    const navigate = useNavigate();
    

    const handleCreateRoom = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Create room
            const response = await createRoom();
            const newRoomId = response.data.roomId;
            const newRoomLink = `${window.location.origin}/join/${newRoomId}`;
            
            // Store room ID and link
            setRoomId(newRoomId);
            setRoomLink(newRoomLink);
            
            // Fetch room details (optional, but good to have)
            try {
                const roomResponse = await getRoom(newRoomId);
                onRoomCreated(roomResponse.data);
            } catch (err) {
                console.error('Failed to fetch room details, but room was created', err);
            }
        } catch(err: any) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setIsLoading(false);
        }
    }

    const goToWhiteboard = () => {
        if (roomId) {
            navigate(`/room/${roomId}`);
        }
    }

    return (
        <div className='max-w-4xl mx-auto px-4 py-8'>
            <div className='bg-white rounded-xl shadow-md p-6 md:p-8'>
                <div className='text-center mb-8'>
                    <h1 className='text-2xl font-bold text-gray-800 mb-2'>
                        Create Collaboration Room
                    </h1>
                    <p className='text-gray-600'>
                        Start a new session and invite others to join
                    </p>
                </div>

                <div className='flex flex-col items-center'>
                    {roomLink ? (
                        <div className='w-full max-w-lg'>
                            <div className='bg-indigo-50 p-4 rounded-lg mb-6'>
                                <p className='text-indigo-800 text-center mb-2'>
                                    Room created successfully! Share this link:
                                </p>

                                <div className='flex'>
                                    <input 
                                        type='text'
                                        value={roomLink}
                                        readOnly
                                        className='flex-grow px-3 py-2 border border-indigo-300 rounded-l-md focus:outline-none'
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(roomLink);
                                            alert('Link copied to clipboard!');
                                        }}
                                        className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md transition-colors'
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className='flex justify-center space-x-4 mb-6'>
                                <a
                                    href={`https://twitter.com/intent/tweet?text=Join%20my%20collaboration%20room%20on%20IdeaBoard!&url=${encodeURIComponent(roomLink)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center'
                                >
                                    <i className='fab fa-twitter mr-2'></i>
                                    Twitter
                                </a>
                                <a
                                    href={`https://api.whatsapp.com/send?text=Join%20my%20collaboration%20room%20on%20IdeaBoard:%20${encodeURIComponent(roomLink)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center'
                                >
                                    <i className='fab fa-whatsapp mr-2'></i>
                                    WhatsApp
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(roomLink)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center"
                                >
                                    <i className="fab fa-facebook mr-2"></i>
                                    Facebook
                                </a>
                            </div>

                            <div className='text-center'>
                                <p className='text-gray-600 mb-4'>
                                    You're now the room owner. You'll be able to approve join requests.
                                </p>
                                <button 
                                    onClick={goToWhiteboard}
                                    className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors'
                                >
                                    Go to Whiteboard
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className='text-center'>
                            <div className='bg-gray-200 border-2 border-dashed rounded-xl w-64 h-64 mx-auto mb-8'></div>
                            
                            <button
                                onClick={handleCreateRoom}
                                disabled={isLoading}
                                className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 flex items-center mx-auto'
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Room...
                                    </>
                                ) : (
                                    'Create Room'
                                )}
                            </button>

                            {error && (
                                <div className='mt-4 text-red-600'>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CreateRoom;