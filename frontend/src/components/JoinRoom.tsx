import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api';
import type { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import {  
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  Shield,
  Send
} from 'lucide-react';

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

  // Safety check
  if (!room || !room.owner || !room.members || !room.roomCode) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4'>
        <div className='max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8 text-center'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full mb-4'>
            <AlertCircle className='w-8 h-8 text-white' />
          </div>
          <h2 className='text-2xl font-bold text-slate-800 mb-2'>Room Error</h2>
          <p className='text-slate-600'>Room details are incomplete or failed to load.</p>
        </div>
      </div>
    );
  }

  const isOwner = room?.owner?._id === userId;
  const isApprovedMember = room?.members?.some(
    (m) => m?.user?._id === userId && m.status === 'approved'
  ) ?? false;
  const hasPendingRequest = room?.members?.some(
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

  useEffect(() => {
    if (isApprovedMember && !isOwner) {
      console.log('User is now an approved member, redirecting to whiteboard.');
      navigate(`/room/${room.roomCode}`);
    }
  }, [isApprovedMember, isOwner, navigate, room.roomCode]);

  useEffect(() => {

    socket.on("yourRoomStatusUpdated", (data) => {

      if (data.status === "approved") {
        // Optional toast
        // toast.success("You are approved!");

        navigate(`/room/${data.roomCode}`);
      }

      if (data.status === "rejected") {
        // Optional toast
        // toast.error("Your request was rejected");
      }

    });

    return () => {
      socket.off("yourRoomStatusUpdated");
    };

  }, [navigate]);


  const memberCount = room.members.filter(
    (m) => m.status === 'approved' && m.user._id !== room.owner._id
  ).length;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8 text-center">
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full mb-6'>
            <AlertCircle className='w-8 h-8 text-white' />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Room Not Found</h2>
          <p className="text-slate-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center gap-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-6'>
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Collaboration Space
            </span>
          </div>
          <h1 className='text-4xl md:text-5xl font-bold mb-4'>
            <span className='bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 bg-clip-text text-transparent'>
              Join Room
            </span>
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          {/* Room Code Banner */}
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-6 text-center">
            <p className="text-violet-100 text-sm font-medium mb-2">Room Code</p>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/30">
              <p className="text-white font-bold text-2xl tracking-wider">
                {room.roomCode}
              </p>
            </div>
          </div>

          <div className="p-8 md:p-10">
            {/* Room Owner Info */}
            <div className="flex items-center bg-gradient-to-br from-slate-50 to-violet-50 rounded-xl p-6 mb-8 border border-slate-200/50">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full blur-md opacity-30" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">
                    {room?.owner?.username?.charAt(0).toUpperCase() || 'O'}
                  </span>
                </div>
              </div>
              <div className="ml-5 flex-1">
                <h3 className="font-bold text-slate-800 text-xl mb-1">
                  {room?.owner?.username || 'Room Owner'}
                </h3>
                <div className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-medium">Room Owner</span>
                </div>
              </div>
            </div>

            {/* Member Count */}
            <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-slate-50 rounded-xl">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{memberCount}</p>
                <p className="text-sm text-slate-600">Active Members</p>
              </div>
            </div>

            {/* Status/Action Area */}
            {isOwner ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl mb-6">
                  <Shield className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-semibold">
                    You own this room
                  </p>
                </div>
                <p className="text-slate-600 mb-6">
                  Manage access requests and start collaborating with your team
                </p>
                <button
                  onClick={() => navigate(`/room/${roomCode}`)}
                  className="group flex items-center justify-center gap-2 w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
                >
                  <span>Go to Whiteboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : isApprovedMember ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl mb-6 shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <p className="text-green-800 font-semibold">
                    You're already a member of this room
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/room/${roomCode}`)}
                  className="group flex items-center justify-center gap-2 w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
                >
                  <span>Join Whiteboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                {hasPendingRequest || showRequestSentMessage ? (
                  <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl shadow-sm animate-pulse">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <p className="text-blue-800 font-semibold">Request Pending</p>
                      <p className="text-blue-600 text-sm">Awaiting owner approval</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-600 mb-6">
                      Request access from the room owner to start collaborating
                    </p>
                    <button
                      onClick={handleJoinRequest}
                      className="group flex items-center justify-center gap-2 w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
                    >
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      <span>Request to Join</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Features Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200">
              {[
                { icon: Users, text: 'Real-time collaboration', color: 'from-violet-500 to-purple-500' },
                { icon: Sparkles, text: 'Instant updates', color: 'from-cyan-500 to-blue-500' },
                { icon: Shield, text: 'Secure access', color: 'from-fuchsia-500 to-pink-500' }
              ].map((feature, idx) => (
                <div key={idx} className='text-center'>
                  <div className={`inline-flex p-3 bg-gradient-to-br ${feature.color} rounded-xl mb-2`}>
                    <feature.icon className='w-5 h-5 text-white' />
                  </div>
                  <p className='text-sm text-slate-600 font-medium'>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;