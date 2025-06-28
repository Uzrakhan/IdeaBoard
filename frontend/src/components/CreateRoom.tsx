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
    const navigate = useNavigate();
    const [currentRoomCode, setCurrentRoomCode] = useState('');
    const [showLinkSection,setShowLinkSection] = useState(false);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        setError('');
        setRoomLink('');
        setShowLinkSection(false);

        try {
            // Create room
            const response = await createRoom();
            const roomCode= response.data.room.roomCode;
            const newRoomLink = `${window.location.origin}/join/${roomCode}`;
            
            // Store room ID and link
            setCurrentRoomCode(roomCode);
            setRoomLink(newRoomLink);
            
            // Fetch room details (optional, but good to have)
            try {
                const roomResponse = await getRoom(roomCode);
                onRoomCreated(roomResponse.data); // Passes the created room data to a parent component
            } catch (err) {
                console.error('Failed to fetch room details, but room was created', err);
                // You might want to pass a partial room object if fetching fails
                onRoomCreated({ roomCode, owner: '', members: [], _id: '' } as unknown as Room); // Cast as Room for type compatibility
            }
            //Show the link section (instead of navigating immediately)
            setShowLinkSection(true);
        } catch(err: any) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setIsLoading(false);
        }
    }

    const goToWhiteboard = () => {
        if (currentRoomCode) {
            navigate(`/room/${currentRoomCode}`);
        }
    };

    //function to copy link to clipboard
    const copyLinkToClipboard = () => {
        if (roomLink) {
            navigator.clipboard.writeText(roomLink);
            alert('Link copied to clipboard!');
        }
    }

    return (
        <div className='max-w-4xl mx-auto px-4 py-8 font-inter'> {/* Added font-inter */}
                <div className='bg-white rounded-xl shadow-lg p-6 md:p-8'> {/* Changed shadow-md to shadow-lg */}
                    <div className='text-center mb-8'>
                        <h1 className='text-3xl font-bold text-gray-800 mb-2'> {/* Larger text */}
                            Create Collaboration Room
                        </h1>
                        <p className='text-gray-600 text-lg'> {/* Larger text */}
                            Start a new session and invite others to join!
                        </p>
                    </div>

                    <div className='flex flex-col items-center'>
                        {showLinkSection ? ( // Conditionally render the link sharing section
                            <div className='w-full max-w-lg'>
                                <div className='bg-indigo-50 p-6 rounded-xl mb-6 shadow-inner'> {/* Adjusted padding, shadow */}
                                    <p className='text-indigo-800 text-center text-lg font-medium mb-3'>
                                        Room created successfully! Share this link:
                                    </p>

                                    <div className='flex mb-4'> {/* Added margin-bottom */}
                                        <input
                                            type='text'
                                            value={roomLink}
                                            readOnly
                                            className='flex-grow px-4 py-3 border border-indigo-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700' // Better focus, larger padding
                                        />
                                        <button
                                            onClick={copyLinkToClipboard} // Call the specific copy function
                                            className='bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-3 rounded-r-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md' // Enhanced button styles
                                        >
                                            Copy Link
                                        </button>
                                    </div>

                                    {/* Social Share Buttons */}
                                    <div className='flex justify-center space-x-3 mb-6'> {/* Adjusted spacing */}
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=Join%20my%20collaboration%20room%20on%20IdeaBoard!&url=${encodeURIComponent(roomLink)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className='bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors duration-200'
                                        >
                                            <i className='fab fa-twitter mr-2'></i> Twitter
                                        </a>
                                        <a
                                            href={`https://api.whatsapp.com/send?text=Join%20my%20collaboration%20room%20on%20IdeaBoard:%20${encodeURIComponent(roomLink)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors duration-200'
                                        >
                                            <i className='fab fa-whatsapp mr-2'></i> WhatsApp
                                        </a>
                                        <a
                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(roomLink)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors duration-200"
                                        >
                                            <i className="fab fa-facebook mr-2"></i> Facebook
                                        </a>
                                    </div>
                                </div>

                                <div className='text-center'>
                                    <p className='text-gray-600 text-base mb-4'>
                                        You're now the room owner. You'll be able to approve join requests.
                                    </p>
                                    <button
                                        onClick={goToWhiteboard}
                                        className='bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3 px-8 rounded-lg text-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-lg' // Enhanced button styles
                                    >
                                        Go to Whiteboard
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Render the initial "Create Room" button
                            <div className='text-center'>
                                <div className='bg-gray-200 border-2 border-dashed rounded-xl w-64 h-64 mx-auto mb-8 flex items-center justify-center text-gray-500 text-lg'>
                                    <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>

                                <button
                                    onClick={handleCreateRoom}
                                    disabled={isLoading}
                                    className='bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3 px-8 rounded-lg text-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-lg flex items-center mx-auto'
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
                                    <div className='mt-4 text-red-600 font-medium'>
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