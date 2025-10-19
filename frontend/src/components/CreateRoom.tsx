import React from 'react';
import { Plus, Copy, ArrowRight, CheckCircle, Sparkles, Users, Link as LinkIcon } from 'lucide-react';

interface CreateRoomProps {
    isLoading: boolean;
    error: string;
    roomCode: string | null;
    handleCreateRoom: () => void;
    goToWhiteboard: () => void;
    copyLinkToClipboard: () => void;
}

const CreateRoom: React.FC<CreateRoomProps> = ({   
    isLoading,
    error,
    roomCode,
    handleCreateRoom,
    goToWhiteboard,
    copyLinkToClipboard,
}) => {
    const roomLink = roomCode ? `${window.location.origin}/join/${roomCode}` : '';

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 px-4 py-12'>
            <div className='max-w-4xl mx-auto'>
                {/* Header Section */}
                <div className='text-center mb-12'>
                    <div className='inline-flex items-center gap-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-6'>
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span className="text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                            Real-Time Collaboration
                        </span>
                    </div>
                    <h1 className='text-4xl md:text-5xl font-bold mb-4'>
                        <span className='bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 bg-clip-text text-transparent'>
                            Create Your Room
                        </span>
                    </h1>
                    <p className='text-slate-600 text-lg max-w-2xl mx-auto'>
                        Start a new collaboration session and invite your team to brainstorm together
                    </p>
                </div>

                {/* Main Content Card */}
                <div className='bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden'>
                    {roomCode ? (
                        // Success State - Room Created
                        <div className='p-8 md:p-12'>
                            {/* Success Header */}
                            <div className='text-center mb-8'>
                                <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg'>
                                    <CheckCircle className='w-8 h-8 text-white' />
                                </div>
                                <h2 className='text-2xl font-bold text-slate-800 mb-2'>
                                    Room Created Successfully!
                                </h2>
                                <p className='text-slate-600'>
                                    Share this link with your team to start collaborating
                                </p>
                            </div>

                            {/* Room Code Display */}
                            <div className='bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200/50 rounded-xl p-6 mb-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <div className='p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg'>
                                        <LinkIcon className='w-5 h-5 text-white' />
                                    </div>
                                    <div>
                                        <p className='text-sm font-medium text-slate-600'>Room Code</p>
                                        <p className='text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent'>
                                            {roomCode}
                                        </p>
                                    </div>
                                </div>

                                {/* Link Input */}
                                <div className='flex gap-2'>
                                    <input
                                        type='text'
                                        value={roomLink}
                                        readOnly
                                        className='flex-1 px-4 py-3 bg-white border-2 border-violet-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'
                                    />
                                    <button
                                        onClick={copyLinkToClipboard}
                                        className='group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105'
                                    >
                                        <Copy className='w-5 h-5' />
                                        <span className='hidden sm:inline'>Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                                <button
                                    onClick={goToWhiteboard}
                                    className='group flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105'
                                >
                                    <span>Start Collaborating</span>
                                    <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                                </button>
                                <button
                                    onClick={handleCreateRoom}
                                    className='px-8 py-4 border-2 border-slate-300 text-slate-700 hover:border-violet-600 hover:text-violet-600 font-semibold rounded-xl transition-all duration-300 hover:shadow-md hover:scale-105 bg-white'
                                >
                                    Create Another Room
                                </button>
                            </div>

                            {/* Features Info */}
                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200'>
                                {[
                                    { icon: Users, text: 'Unlimited collaborators' },
                                    { icon: Sparkles, text: 'Real-time updates' },
                                    { icon: LinkIcon, text: 'Easy sharing' }
                                ].map((feature, idx) => (
                                    <div key={idx} className='flex items-center gap-3 text-slate-600'>
                                        <div className='p-2 bg-violet-100 rounded-lg'>
                                            <feature.icon className='w-4 h-4 text-violet-600' />
                                        </div>
                                        <span className='text-sm font-medium'>{feature.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Initial State - Create Room
                        <div className='p-8 md:p-12'>
                            <div className='text-center max-w-lg mx-auto'>
                                {/* Illustration Area */}
                                <div className='relative mb-8'>
                                    <div className='absolute inset-0 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 rounded-2xl blur-2xl' />
                                    <div className='relative bg-gradient-to-br from-slate-50 to-violet-50 border-2 border-dashed border-violet-300 rounded-2xl h-72 flex flex-col items-center justify-center'>
                                        <div className='relative'>
                                            <div className='absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full blur-xl opacity-30' />
                                            <div className='relative bg-gradient-to-br from-violet-600 to-fuchsia-600 w-24 h-24 rounded-full flex items-center justify-center shadow-xl'>
                                                <Plus className='w-12 h-12 text-white' />
                                            </div>
                                        </div>
                                        <p className='mt-6 text-slate-600 font-medium text-lg'>
                                            Ready to create your collaboration space?
                                        </p>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={isLoading}
                                    className='group relative w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                                >
                                    {isLoading ? (
                                        <span className='flex items-center justify-center gap-3'>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Creating Room...
                                        </span>
                                    ) : (
                                        <span className='flex items-center justify-center gap-2'>
                                            <Plus className='w-6 h-6 group-hover:rotate-90 transition-transform duration-300' />
                                            Create New Room
                                        </span>
                                    )}
                                </button>

                                {/* Error Message */}
                                {error && (
                                    <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
                                        <p className='text-red-600 font-medium flex items-center gap-2 justify-center'>
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            {error}
                                        </p>
                                    </div>
                                )}

                                {/* Info Cards */}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8'>
                                    <div className='p-4 bg-gradient-to-br from-violet-50 to-transparent rounded-xl border border-violet-200/50 text-left'>
                                        <div className='flex items-start gap-3'>
                                            <div className='p-2 bg-violet-100 rounded-lg'>
                                                <Users className='w-5 h-5 text-violet-600' />
                                            </div>
                                            <div>
                                                <h3 className='font-semibold text-slate-800 mb-1'>Invite Anyone</h3>
                                                <p className='text-sm text-slate-600'>Share the link with unlimited collaborators</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='p-4 bg-gradient-to-br from-fuchsia-50 to-transparent rounded-xl border border-fuchsia-200/50 text-left'>
                                        <div className='flex items-start gap-3'>
                                            <div className='p-2 bg-fuchsia-100 rounded-lg'>
                                                <Sparkles className='w-5 h-5 text-fuchsia-600' />
                                            </div>
                                            <div>
                                                <h3 className='font-semibold text-slate-800 mb-1'>Real-Time Sync</h3>
                                                <p className='text-sm text-slate-600'>See changes instantly as they happen</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateRoom;