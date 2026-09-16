import React from "react";
import { Link } from "react-router-dom";
import { useGetFollowersQuery, useGetFollowingQuery } from "../../redux/api/followApiSlice.js";

const FollowListModal = ({ userId, type = "followers", onClose }) => {
  const isFollowers = type === "followers";
  const { data, isLoading } = isFollowers
    ? useGetFollowersQuery(userId)
    : useGetFollowingQuery(userId);

  const rawList = data?.data ?? data?.message ?? data;
  const list = Array.isArray(rawList) ? rawList : [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark/95 border border-primary/20 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(106,91,205,0.2)] overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">
            {isFollowers ? "Inbound Connections" : "Connected Engineers"} ({list.length})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading connections...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No connections found.
            </div>
          ) : (
            list.map((item) => {
              const user = isFollowers ? item.follower : item.following;
              if (!user) return null;

              return (
                <Link
                  key={item._id}
                  to={`/profile/${user.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group"
                >
                  <img
                    src={user.avatar || "https://via.placeholder.com/40"}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-200 group-hover:text-primary transition truncate">
                      {user.username}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 group-hover:text-primary text-sm transition">
                    chevron_right
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
