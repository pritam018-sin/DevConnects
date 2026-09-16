import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetUserNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useDeleteNotificationMutation,
} from "../../redux/api/notificationApiSlice.js";

const getNotificationMeta = (type) => {
  switch (type) {
    case "like":
      return {
        label: "Signal Boost",
        icon: "bolt",
        badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        iconColor: "text-pink-400",
      };
    case "project_like":
      return {
        label: "Architecture Signal",
        icon: "rocket_launch",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        iconColor: "text-cyan-400",
      };
    case "comment":
      return {
        label: "Discussion Echo",
        icon: "forum",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        iconColor: "text-blue-400",
      };
    case "reply":
      return {
        label: "Thread Reply",
        icon: "reply",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        iconColor: "text-indigo-400",
      };
    case "follow":
      return {
        label: "Synaptic Link",
        icon: "link",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        iconColor: "text-emerald-400",
      };
    case "repulse":
      return {
        label: "Pulse Amplified",
        icon: "repeat",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        iconColor: "text-amber-400",
      };
    case "message":
      return {
        label: "Direct Transmission",
        icon: "podcasts",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        iconColor: "text-purple-400",
      };
    default:
      return {
        label: "Network Beacon",
        icon: "sensors",
        badgeColor: "bg-primary/20 text-primary border-primary/30",
        iconColor: "text-primary",
      };
  }
};

const NotificationsPopover = ({ onClose }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // "all" | "unread"

  const { data, isLoading, refetch } = useGetUserNotificationsQuery(
    { limit: 20 },
    { pollingInterval: 15000 }
  );
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const rawNotifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const filteredNotifications = rawNotifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif._id);
    }
    if (onClose) onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleAcknowledgeAll = async () => {
    const unreadList = rawNotifications.filter((n) => !n.read);
    await Promise.all(unreadList.map((n) => markAsRead(n._id)));
    if (refetch) refetch();
  };

  return (
    <>
      {/* Backdrop to dismiss when clicking outside */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="fixed left-24 md:left-68 bottom-6 sm:bottom-12 w-88 sm:w-96 max-w-[calc(100vw-110px)] bg-slate-950/95 border border-primary/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-[999] overflow-hidden flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-background-dark/90 to-primary/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-lg">radar</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white tracking-tight">Subspace Beacons</h4>
              {unreadCount > 0 && (
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                  {unreadCount} Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Real-time network telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="text-[11px] text-primary hover:text-white px-2 py-1 rounded-lg hover:bg-primary/20 transition font-medium"
              title="Acknowledge all signals"
            >
              Acknowledge All
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 text-xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg font-semibold transition ${
            filter === "all"
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All Signals ({rawNotifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
            filter === "unread"
              ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-center py-10 text-xs text-slate-500">
            <span className="material-symbols-outlined animate-spin align-middle mr-2 text-primary">sync</span>
            Scanning subspace frequency...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-600 block">sensors_off</span>
            <p className="text-xs">
              {filter === "unread" ? "All signals acknowledged." : "No signals received yet across the grid."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const meta = getNotificationMeta(notif.type);
            const senderAvatar =
              notif.sender?.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-2xl transition-all duration-200 flex items-start gap-3 cursor-pointer group border ${
                  notif.read
                    ? "bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/60 text-slate-300"
                    : "bg-gradient-to-r from-primary/15 to-purple-900/20 hover:from-primary/25 hover:to-purple-900/30 border-primary/40 text-white shadow-[0_0_15px_rgba(106,91,205,0.1)]"
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={senderAvatar}
                    alt={notif.sender?.username || "Sender"}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-md flex items-center justify-center border border-background-dark text-[10px] ${meta.badgeColor}`}
                  >
                    <span className="material-symbols-outlined text-[11px]">{meta.icon}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.badgeColor}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs leading-snug font-medium line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif._id);
                  }}
                  className="text-slate-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100"
                  title="Purge beacon"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            );
          })
        )}
      </div>
      </div>
    </>
  );
};

export default NotificationsPopover;
