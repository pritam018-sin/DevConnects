import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useDeleteMessageMutation,
} from '../redux/api/messageApiSlice.js';
import {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
} from '../redux/api/userApiSlice.js';
import { useSocket } from '../context/SocketContext.jsx';

const Messages = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;
  const { socket, onlineUsers } = useSocket();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialReceiverId = searchParams.get('userId') || null;

  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [liveMessages, setLiveMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch Conversations (Active Frequencies)
  const { data: convosData, isLoading: loadingConvos, refetch: refetchConvos } =
    useGetConversationsQuery(undefined, { skip: !userInfo, pollingInterval: 12000 });
  const conversations = convosData?.data || [];

  // Query specific user profile if initialReceiverId is passed and not in convos
  const { data: initialUserData } = useGetUserByIdQuery(initialReceiverId, {
    skip: !initialReceiverId || (selectedUser && selectedUser._id === initialReceiverId),
  });

  // Query all users for search & discovery
  const { data: searchUsersData, isLoading: isSearchingUsers } = useGetAllUsersQuery(
    searchQuery.trim(),
    { skip: !searchQuery.trim() }
  );
  const searchedNetworkUsers = searchUsersData?.data || [];

  // Fetch Messages for active transmission frequency
  const receiverId = selectedUser?._id || initialReceiverId;
  const { data: messagesData, isLoading: loadingMessages, refetch: refetchMessages } =
    useGetMessagesQuery(receiverId, {
      skip: !receiverId,
    });

  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation();
  const [deleteMessageMutation] = useDeleteMessageMutation();

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const emitTypingTimerRef = useRef(null);

  // Keep liveMessages in sync with query
  useEffect(() => {
    if (messagesData) {
      setLiveMessages(Array.isArray(messagesData) ? messagesData : []);
    }
  }, [messagesData]);

  // Set initial selected user
  useEffect(() => {
    if (initialReceiverId) {
      const foundInConvos = conversations.find((c) => c._id === initialReceiverId);
      if (foundInConvos) {
        setSelectedUser({ _id: foundInConvos._id, ...foundInConvos.userDetails });
      } else if (initialUserData?.data) {
        setSelectedUser(initialUserData.data);
      }
    } else if (!selectedUser && conversations.length > 0) {
      const first = conversations[0];
      setSelectedUser({ _id: first._id, ...first.userDetails });
      setSearchParams({ userId: first._id });
    }
  }, [conversations, initialReceiverId, initialUserData, selectedUser]);

  // Reset typing indicator when changing selected user
  useEffect(() => {
    setIsOtherUserTyping(false);
  }, [selectedUser?._id]);

  // Socket real-time listeners for instant chat and typing
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      if (
        selectedUser &&
        (newMsg.sender === selectedUser._id || newMsg.receiver === selectedUser._id)
      ) {
        setLiveMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }
      refetchConvos();
    };

    const handleMessageSent = (sentMsg) => {
      if (
        selectedUser &&
        (sentMsg.sender === currentUserId || sentMsg.receiver === selectedUser._id)
      ) {
        setLiveMessages((prev) => {
          if (prev.some((m) => m._id === sentMsg._id)) return prev;
          return [...prev, sentMsg];
        });
      }
      refetchConvos();
    };

    const handleUserTyping = ({ senderId }) => {
      if (selectedUser && String(senderId) === String(selectedUser._id)) {
        setIsOtherUserTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          setIsOtherUserTyping(false);
        }, 3500);
      }
    };

    const handleUserStoppedTyping = ({ senderId }) => {
      if (selectedUser && String(senderId) === String(selectedUser._id)) {
        setIsOtherUserTyping(false);
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSent', handleMessageSent);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('messagesRead', (data) => {
      const readerId = data?.readerId;
      if (selectedUser && String(selectedUser._id) === String(readerId)) {
        setLiveMessages((prev) =>
          prev.map((m) =>
            String(m.receiver) === String(readerId) || String(m.receiver?._id) === String(readerId)
              ? { ...m, read: true }
              : m
          )
        );
      }
    });

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('messagesRead');
    };
  }, [socket, selectedUser, currentUserId, refetchConvos]);

  const renderReceipt = (msg) => {
    if (msg.read) {
      return (
        <span title="Read" className="flex items-center text-red-400 font-bold">
          <span className="material-symbols-outlined text-[13px]">done_all</span>
        </span>
      );
    }

    const isDelivered = Boolean(msg._id);
    if (isDelivered) {
      return (
        <span title="Received" className="flex items-center text-purple-200/80">
          <span className="material-symbols-outlined text-[13px]">done_all</span>
        </span>
      );
    }

    return (
      <span title="Sent" className="flex items-center text-purple-300/60">
        <span className="material-symbols-outlined text-[13px]">check</span>
      </span>
    );
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedUser?._id) return;

    const content = messageText.trim();
    // Clear typing indicator
    if (socket && selectedUser?._id) {
      socket.emit('stopTyping', { receiverId: selectedUser._id });
    }

    // Try socket first if connected, also trigger REST for persistence and backup
    if (socket && socket.connected) {
      socket.emit('sendMessage', {
        receiverId: selectedUser._id,
        content,
      });
    } else {
      try {
        await sendMessageMutation({
          receiverId: selectedUser._id,
          content,
        }).unwrap();
      } catch (err) {
        toast.error(err?.data?.message || 'Transmission failed to dispatch');
      }
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (socket && selectedUser?._id) {
      socket.emit('typing', { receiverId: selectedUser._id });

      if (emitTypingTimerRef.current) clearTimeout(emitTypingTimerRef.current);
      emitTypingTimerRef.current = setTimeout(() => {
        socket.emit('stopTyping', { receiverId: selectedUser._id });
      }, 1800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await deleteMessageMutation({
        messageId: msgId,
        receiverId: selectedUser?._id,
      }).unwrap();
      setLiveMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.success('Transmission purged from channel');
    } catch (err) {
      toast.error('Failed to purge transmission');
    }
  };

  const insertSnippet = () => {
    setMessageText((prev) => prev + (prev ? '\n' : '') + '```javascript\n// Write code here\n```\n');
    textareaRef.current?.focus();
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const u = c.userDetails || {};
    const q = searchQuery.toLowerCase();
    return (
      (u.fullname && u.fullname.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q))
    );
  });

  // Discovered users not already in active channels
  const activeUserIds = new Set(conversations.map((c) => c._id));
  const discoveredEngineers = searchedNetworkUsers.filter(
    (u) => u._id !== currentUserId && !activeUserIds.has(u._id)
  );

  if (!userInfo) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center max-w-md mx-auto mt-16 border border-primary/30 shadow-[0_0_50px_rgba(106,91,205,0.2)]">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 text-primary">
          <span className="material-symbols-outlined text-3xl">podcasts</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Initialize Quantum Comms</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Sign in to dispatch direct encrypted transmissions and calibrate frequencies with engineers across the network.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-[0_0_20px_rgba(106,91,205,0.4)]"
        >
          <span className="material-symbols-outlined text-sm">login</span>
          <span>Access Network Terminal</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-primary/30 h-[84vh] flex overflow-hidden shadow-[0_0_60px_rgba(106,91,205,0.18)] bg-slate-950/60 backdrop-blur-xl">
      {/* Left Pane: Channels & Search Scanner */}
      <div className="w-72 sm:w-80 border-r border-slate-800 flex flex-col bg-background-dark/70 shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(106,91,205,0.3)]">
                <span className="material-symbols-outlined text-xl">podcasts</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight leading-none">
                  Transmissions
                </h2>
                <span className="text-[10px] text-primary font-mono uppercase tracking-wider">
                  Quantum Relay
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online</span>
            </div>
          </div>

          {/* User Search & Frequency Scanner */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search engineers or channels..."
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Channels / Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* Section: Discovered Engineers (when searching) */}
          {searchQuery.trim() && (
            <div className="space-y-1 pb-2 border-b border-slate-800/80">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-secondary font-bold">
                <span>Discover Frequencies</span>
                {isSearchingUsers && (
                  <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                )}
              </div>

              {discoveredEngineers.length === 0 && !isSearchingUsers ? (
                <p className="text-[11px] text-slate-500 px-2 py-1 italic">
                  No new network engineers matching "{searchQuery}"
                </p>
              ) : (
                discoveredEngineers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchParams({ userId: user._id });
                    }}
                    className="p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between bg-primary/10 hover:bg-primary/20 border border-primary/30 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={
                            user.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={user.username}
                          className="w-9 h-9 rounded-xl object-cover border border-primary/40"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background-dark ${
                            onlineUsers?.has?.(String(user._id))
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">
                          {user.fullname || user.username}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white transition flex items-center gap-1 shrink-0 shadow-[0_0_10px_rgba(106,91,205,0.4)]"
                    >
                      <span className="material-symbols-outlined text-xs">send</span>
                      <span>Link</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section: Active Channels */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>Active Channels ({filteredConversations.length})</span>
            </div>

            {loadingConvos ? (
              <div className="text-center py-10 text-xs text-slate-500">
                <span className="material-symbols-outlined animate-spin align-middle mr-2 text-primary">sync</span>
                Syncing channels...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <span className="material-symbols-outlined text-3xl text-slate-600 block">podcasts</span>
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? 'No active channels match your search.'
                    : 'No transmission channels yet. Search an engineer above to establish a link!'}
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const u = convo.userDetails || {};
                const isSelected = selectedUser?._id === convo._id;
                const lastMsg = convo.lastMessage?.content || 'Transmission initiated';
                const isChannelOnline = onlineUsers?.has?.(String(convo._id));

                return (
                  <div
                    key={convo._id}
                    onClick={() => {
                      setSelectedUser({ _id: convo._id, ...u });
                      setSearchParams({ userId: convo._id });
                    }}
                    className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-primary/25 to-purple-900/30 border-primary/50 shadow-[0_0_20px_rgba(106,91,205,0.15)]'
                        : 'hover:bg-slate-900/60 border-slate-800/40 hover:border-slate-700/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          u.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                        }
                        alt={u.username}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-700"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background-dark ${
                          isChannelOnline
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'bg-slate-600'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-xs text-white truncate group-hover:text-primary transition">
                          {u.fullname || u.username}
                        </p>
                        {convo.lastMessage?.createdAt && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(convo.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {lastMsg}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Pane: Transmission Hub */}
      <div className="flex-1 flex flex-col bg-slate-950/40 min-w-0">
        {selectedUser ? (
          <>
            {/* Transmission Top Header */}
            <div className="p-4 px-6 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-background-dark/80 via-slate-900/60 to-primary/5">
              <Link
                to={`/profile/${selectedUser.username}`}
                className="flex items-center gap-3.5 group hover:opacity-95 transition min-w-0"
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      selectedUser.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={selectedUser.username}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-700 group-hover:border-primary transition"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background-dark ${
                      onlineUsers?.has?.(String(selectedUser._id))
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white group-hover:text-primary transition truncate">
                      {selectedUser.fullname || selectedUser.username}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      @{selectedUser.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`flex items-center gap-1 text-[10px] font-mono ${
                        onlineUsers?.has?.(String(selectedUser._id))
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          onlineUsers?.has?.(String(selectedUser._id))
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      />
                      {onlineUsers?.has?.(String(selectedUser._id))
                        ? 'Frequency Active • Online'
                        : 'Frequency Inactive • Offline'}
                    </span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-[10px] text-primary/80 font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">lock</span>
                      256-Bit Quantum Synapse
                    </span>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/profile/${selectedUser.username}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 border border-slate-700/60 font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  <span>View Identity</span>
                </Link>
              </div>
            </div>

            {/* Transmission Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 custom-scrollbar">
              {loadingMessages ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  <span className="material-symbols-outlined animate-spin align-middle mr-2 text-primary">sync</span>
                  Decrypting transmission feed...
                </div>
              ) : liveMessages.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto text-primary">
                    <span className="material-symbols-outlined text-xl">podcasts</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Direct Channel Established</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Say hello to <span className="text-primary font-semibold">@{selectedUser.username}</span> to start this conversation!
                  </p>
                </div>
              ) : (
                liveMessages.map((msg) => {
                  const isMine =
                    msg.sender === currentUserId ||
                    msg.sender?._id === currentUserId ||
                    (typeof msg.sender === 'object' && String(msg.sender?._id) === String(currentUserId));

                  return (
                    <div
                      key={msg._id || `${msg.createdAt}-${Math.random()}`}
                      className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                        {isMine && (
                          <button
                            onClick={() => handleDelete(msg._id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition p-1 text-xs"
                            title="Purge transmission"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        )}

                        <div
                          className={`px-3.5 py-1.5 rounded-2xl transition-all shadow-sm ${
                            isMine
                              ? 'bg-gradient-to-r from-primary/95 via-purple-600/95 to-indigo-700/95 text-white rounded-br-xs border border-primary/40 shadow-[0_4px_16px_rgba(106,91,205,0.25)]'
                              : 'bg-slate-900/95 text-slate-200 rounded-bl-xs border border-slate-800/90 shadow-sm'
                          }`}
                        >
                          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5">
                            <span className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-snug break-words flex-1 min-w-[20px]">
                              {msg.content}
                            </span>

                            <div
                              className={`shrink-0 flex items-center gap-1 select-none text-[9px] font-mono self-end pb-0.5 ml-auto ${
                                isMine ? 'text-purple-200/75' : 'text-slate-400/80'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMine && renderReceipt(msg)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isOtherUserTyping && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-primary/10 border border-primary/25 w-fit text-xs text-primary shadow-[0_0_15px_rgba(106,91,205,0.15)] select-none animate-pulse">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    <span className="text-primary font-bold">@{selectedUser.username}</span> is transmitting...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Transmission Input Bar */}
            <div className="p-3 sm:p-3.5 border-t border-slate-800/80 bg-background-dark/90 backdrop-blur-md space-y-2 shrink-0">
              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400 font-mono">
                <button
                  type="button"
                  onClick={insertSnippet}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-white px-2 py-0.5 rounded-lg hover:bg-primary/20 transition font-medium"
                  title="Insert Code Snippet"
                >
                  <span className="material-symbols-outlined text-xs">code</span>
                  <span>Code Snippet</span>
                </button>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  Enter to transmit • Shift+Enter for newline
                </span>
              </div>

              <form onSubmit={handleSend} className="flex items-end gap-2.5">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Transmit to @${selectedUser.username}...`}
                  rows={1}
                  className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition resize-none font-sans max-h-28 min-h-[42px]"
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(106,91,205,0.4)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 h-[42px] self-end"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span className="hidden sm:inline">Transmit</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(106,91,205,0.15)]">
              <span className="material-symbols-outlined text-3xl">podcasts</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Frequency Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose an active channel from the sidebar or search any engineer by name/handle to establish a direct transmission relay.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
