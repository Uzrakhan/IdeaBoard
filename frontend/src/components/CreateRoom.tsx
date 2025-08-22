
interface CreateRoomProps {
    isLoading: boolean;
    error: string;
    roomCode: string | null;
    handleCreateRoom: () => void;
    goToWhiteboard: () => void;
    copyLinkToClipboard: () => void;
    //onRoomCreated: (room: Room) => void;
 //setCurrentRoom: (room : Room | null) => void;
}

const CreateRoom: React.FC<CreateRoomProps> = ({   
    isLoading,
    error,
    roomCode,
    handleCreateRoom,
    goToWhiteboard,
    copyLinkToClipboard,}) => {
        const roomLink = roomCode ? `${window.location.origin}/join/${roomCode}` : '';
    //const navigate = useNavigate();
    //const [currentRoomCode, setCurrentRoomCode] = useState('');
    //const [showLinkSection,setShowLinkSection] = useState(false);

    

    /*
    const goToWhiteboard = () => {
        if (currentRoomCode) {
            navigate(`/room/${currentRoomCode}`);
        }
    };
    */

    //function to copy link to clipboard
    /*
    const copyLinkToClipboard = () => {
        if (roomLink) {
            navigator.clipboard.writeText(roomLink);
            alert('Link copied to clipboard!');
        }
    }
    */

    //function to generate the mailto Link
    /*
    const generateMailtoLink = () => {
        const subject = encodeURIComponent('Join my collaboratiion room on IdeaBoard!');
        const body = encodeURIComponent(
            `Hey!%0A%0A` + //two lines after Hey
            `Come join my collaboration room on IdeaBoard. Click the link to get started:%0A` + // Newline after "started:"
            `${roomLink}`
        );
        return `mailto:?subject=${subject}&body=${body}`;
    }
    */
    return (
        <div className='max-w-4xl mx-auto px-4 py-8 font-inter'>
            <div className='bg-white rounded-xl shadow-lg p-6 md:p-8'>
                <div className='text-center mb-8'>
                    <h1 className='text-3xl font-bold text-gray-800 mb-2'>
                        Create Collaboration Room
                    </h1>
                    <p className='text-gray-600 text-lg'>
                        Start a new session and invite others to join!
                    </p>
                </div>

                <div className='flex flex-col items-center'>
                    {roomCode ? ( // Conditionally render the link sharing section
                        <div className='w-full max-w-lg'>
                            <div className='bg-indigo-50 p-6 rounded-xl mb-6 shadow-inner'>
                                <p className='text-indigo-800 text-center text-lg font-medium mb-3'>
                                    Room created successfully! Share this link:
                                </p>
                                <div className='flex mb-4'>
                                    <input
                                        type='text'
                                        value={roomLink}
                                        readOnly
                                        className='flex-grow px-4 py-3 border border-indigo-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700'
                                    />
                                    <button
                                        onClick={copyLinkToClipboard}
                                        className='bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-3 rounded-r-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md'
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                            <div className='text-center'>
                                <button
                                    onClick={goToWhiteboard}
                                    className='bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3 px-8 rounded-lg text-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-lg'
                                >
                                    Go to Whiteboard
                                </button>
                            </div>
                        </div>
                    ) : (
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
                                {isLoading ? 'Creating Room...' : 'Create Room'}
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