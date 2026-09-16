import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetAllUsersQuery } from '../redux/api/userApiSlice.js';
import { useToggleFollowMutation } from '../redux/api/followApiSlice.js';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const RightSidebar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;

  const { data: usersData, isLoading: loadingEngineers } = useGetAllUsersQuery();
  const [toggleFollow] = useToggleFollowMutation();

  const allUsers = Array.isArray(usersData?.data) ? usersData.data : [];
  const activeEngineers = allUsers.filter(
    (u) => u._id && String(u._id) !== String(currentUserId)
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    if (searchTerm.startsWith('@')) {
      navigate(`/profile/${searchTerm.slice(1).trim()}`);
    } else {
      navigate(`/projects?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleFollow = async (userId) => {
    if (!userInfo) {
      toast.error('Please sign in to follow creators');
      navigate('/login');
      return;
    }
    try {
      await toggleFollow(userId).unwrap();
      toast.success('Follow updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Action failed');
    }
  };

  const trendingTags = [
    { tag: 'react', label: '#react', count: '2.4k' },
    { tag: 'typescript', label: '#typescript', count: '1.8k' },
    { tag: 'nodejs', label: '#nodejs', count: '1.2k' },
    { tag: 'rust', label: '#rust', count: '890' },
    { tag: 'web3', label: '#web3', count: '640' },
  ];

  return (
    <aside className="w-80 fixed right-0 h-screen p-6 flex flex-col gap-7 border-l border-primary/10 bg-background-dark/50 backdrop-blur-md overflow-y-auto custom-scrollbar">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
          search
        </span>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-glass border border-slate-800 rounded-full py-2.5 pl-11 pr-4 text-xs text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
          placeholder="Search projects or @username..."
          type="text"
        />
      </form>

      {/* Trending Tech Tags */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">trending_up</span>
          Trending Tech
        </h2>
        <div className="flex flex-col gap-1">
          {trendingTags.map((item) => (
            <Link
              key={item.tag}
              to={`/projects?techStack=${item.tag}`}
              className="p-2.5 rounded-xl hover:bg-slate-800/50 flex items-center justify-between group transition"
            >
              <span className="text-slate-300 font-medium text-xs group-hover:text-primary transition">
                {item.label}
              </span>
              <span className="text-[10px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-md font-mono">
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recommended Developers / Active Engineers */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">group</span>
          Active Engineers
        </h2>

        <div className="flex flex-col gap-3">
          {loadingEngineers ? (
            <div className="text-xs text-slate-500 py-2">Loading engineers...</div>
          ) : activeEngineers.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              Explore the network to connect with fellow engineers!
            </div>
          ) : (
            activeEngineers.slice(0, 5).map((engineer) => (
              <div
                key={engineer._id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/30 transition group"
              >
                <Link
                  to={`/profile/${engineer.username}`}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <img
                    src={engineer.avatar || 'https://via.placeholder.com/36'}
                    alt={engineer.username}
                    className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0 group-hover:border-primary transition"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-primary transition truncate">
                      {engineer.fullname || engineer.username}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      @{engineer.username}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(engineer._id)}
                  className="text-primary hover:text-white p-1.5 rounded-lg hover:bg-primary/20 transition"
                  title="Connect"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </button>
              </div>
            ))
          )}
        </div>

        <Link
          to="/network"
          className="text-xs text-slate-500 font-semibold mt-1 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Explore all engineers</span>
          <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </Link>
      </div>

      {/* Mini Footer */}
      <div className="mt-auto pt-4 border-t border-slate-800/50 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
        <Link className="hover:text-primary" to="/projects">Projects</Link>
        <Link className="hover:text-primary" to="/network">Network</Link>
        <Link className="hover:text-primary" to="/settings">Settings</Link>
        <span>© {new Date().getFullYear()} DevConnect</span>
      </div>
    </aside>
  );
};

export default RightSidebar;
