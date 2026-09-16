import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetFollowersQuery,
  useGetFollowingQuery,
  useToggleFollowMutation,
} from '../redux/api/followApiSlice.js';
import { useGetAllUsersQuery } from '../redux/api/userApiSlice.js';

const Network = () => {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'connected' | 'inbound'
  const [searchQuery, setSearchQuery] = useState('');

  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;

  const [toggleFollow] = useToggleFollowMutation();

  // Inbound & Outbound Connections
  const { data: followersData, isLoading: loadingFollowers, refetch: refetchFollowers } =
    useGetFollowersQuery(currentUserId, { skip: !currentUserId });
  const { data: followingData, isLoading: loadingFollowing, refetch: refetchFollowing } =
    useGetFollowingQuery(currentUserId, { skip: !currentUserId });

  const rawFollowers = followersData?.data ?? followersData?.message ?? followersData;
  const followers = Array.isArray(rawFollowers) ? rawFollowers : [];

  const rawFollowing = followingData?.data ?? followingData?.message ?? followingData;
  const following = Array.isArray(rawFollowing) ? rawFollowing : [];

  // All registered builders on the platform
  const { data: usersData, isLoading: loadingDiscover, refetch: refetchUsers } =
    useGetAllUsersQuery(searchQuery);

  const rawUsers = usersData?.data ?? usersData?.message ?? usersData;
  const discoveredCreators = Array.isArray(rawUsers)
    ? rawUsers.filter((u) => String(u._id) !== String(currentUserId))
    : [];

  // Local optimistic state for fast UI feedback
  const [localConnections, setLocalConnections] = useState({});

  const followingSet = new Set(
    following.map((f) => String(f.following?._id || f.following))
  );

  const isUserConnected = (userId) => {
    const id = String(userId);
    if (localConnections[id] !== undefined) {
      return localConnections[id];
    }
    return followingSet.has(id);
  };

  const handleToggleConnection = async (targetId) => {
    if (!userInfo) {
      toast.error('Please sign in to connect with engineers');
      return;
    }
    const id = String(targetId);
    const currentlyConnected = isUserConnected(id);
    const nextState = !currentlyConnected;

    // Optimistic toggle
    setLocalConnections((prev) => ({ ...prev, [id]: nextState }));

    try {
      await toggleFollow(targetId).unwrap();
      toast.success(nextState ? 'Connected!' : 'Disconnected');
      refetchFollowing();
      refetchFollowers();
    } catch (err) {
      // Revert on error
      setLocalConnections((prev) => ({ ...prev, [id]: currentlyConnected }));
      toast.error(err?.data?.message || 'Could not update connection');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest font-bold">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span>Engineer Mesh</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Developer Network
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Build your professional web of collaborators, discover open-source contributors, and stay synced with fellow builders.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search developers..."
            className="w-full bg-slate-900 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'discover'
              ? 'bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">explore</span>
          <span>Discover Builders</span>
        </button>

        {userInfo && (
          <>
            <button
              onClick={() => setActiveTab('connected')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'connected'
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person_check</span>
              <span>Connected ({following.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'inbound'
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              <span>Inbound Network ({followers.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Content Rendering */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'discover' && (
          loadingDiscover ? (
            <div className="col-span-full text-center py-16 text-slate-500 text-sm">
              Discovering builders...
            </div>
          ) : discoveredCreators.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 text-center text-slate-500 text-sm">
              No developers discovered yet. Invite peers to expand your network!
            </div>
          ) : (
            discoveredCreators
              .filter((u) =>
                !searchQuery ||
                u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.fullname?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((creator) => {
                const isConnected = isUserConnected(creator._id);

                return (
                  <div
                    key={creator._id}
                    className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-primary/40 transition flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <Link to={`/profile/${creator.username}`}>
                        <img
                          src={creator.avatar || 'https://via.placeholder.com/60'}
                          alt={creator.username}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-700 hover:border-primary transition"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${creator.username}`}
                          className="font-bold text-white text-sm hover:text-primary transition block truncate"
                        >
                          {creator.fullname || creator.username}
                        </Link>
                        <p className="text-xs text-secondary font-medium truncate">
                          @{creator.username}
                        </p>
                        {creator.bio && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {creator.bio}
                          </p>
                        )}
                        {Array.isArray(creator.skills) && creator.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {creator.skills.slice(0, 3).map((sk) => (
                              <span
                                key={sk}
                                className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono px-1.5 py-0.5 rounded"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <Link
                        to={`/profile/${creator.username}`}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleToggleConnection(creator._id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                          isConnected
                            ? 'bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                );
              })
          )
        )}

        {activeTab === 'connected' && (
          loadingFollowing ? (
            <div className="col-span-full text-center py-16 text-slate-500 text-sm">
              Loading connections...
            </div>
          ) : following.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 text-center text-slate-500 text-sm">
              You have not connected with any builders yet.
            </div>
          ) : (
            following.map((item) => {
              const u = item.following;
              if (!u) return null;
              return (
                <div
                  key={item._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <Link to={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar || 'https://via.placeholder.com/48'}
                      alt={u.username}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{u.username}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleToggleConnection(u._id)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              );
            })
          )
        )}

        {activeTab === 'inbound' && (
          loadingFollowers ? (
            <div className="col-span-full text-center py-16 text-slate-500 text-sm">
              Loading inbound network...
            </div>
          ) : followers.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 text-center text-slate-500 text-sm">
              No inbound connections yet. Keep broadcasting pulses!
            </div>
          ) : (
            followers.map((item) => {
              const u = item.follower;
              if (!u) return null;
              const isConnected = isUserConnected(u._id);

              return (
                <div
                  key={item._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <Link to={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar || 'https://via.placeholder.com/48'}
                      alt={u.username}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{u.username}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleToggleConnection(u._id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      isConnected
                        ? 'bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
                    }`}
                  >
                    {isConnected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default Network;
