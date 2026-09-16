import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/feature/auth/authSlice.js';
import { useLogoutMutation } from '../redux/api/userApiSlice.js';
import { useGetUserNotificationsQuery } from '../redux/api/notificationApiSlice.js';
import NotificationsPopover from './notifications/NotificationsPopover.jsx';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutApiCall] = useLogoutMutation();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifData } = useGetUserNotificationsQuery(
    { limit: 1 },
    { skip: !userInfo, pollingInterval: 30000 }
  );
  const unreadCount = notifData?.data?.unreadCount || 0;

  const handleLogout = async () => {
    try {
      await logoutApiCall().unwrap();
      dispatch(logout());
      toast.success('Logged out successfully');
      navigate('/');
    } catch (err) {
      console.error("Logout failed", err);
      dispatch(logout());
      navigate('/');
    }
  };

  const NavItem = ({ to, icon, label, isActive, badge }) => (
    <Link
      to={to}
      className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all overflow-hidden relative ${
        isActive
          ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      }`}
      title={label}
    >
      <div className="relative flex items-center justify-center min-w-[24px]">
        <span className="material-symbols-outlined text-center">{icon}</span>
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full ring-2 ring-background-dark"></span>
        )}
      </div>
      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {label}
      </span>
    </Link>
  );

  return (
    <aside className="fixed h-screen py-6 px-4 flex flex-col justify-between border-r border-primary/10 transition-all duration-300 w-20 hover:w-64 group z-50 bg-background-dark/95 backdrop-blur-md overflow-visible">
      <div className="flex flex-col gap-7">
        <Link to="/" className="flex items-center gap-4 px-1" title="DevConnect">
          <div className="w-10 h-10 min-w-[40px] rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(106,91,205,0.4)]">
            <span className="material-symbols-outlined text-white">terminal</span>
          </div>
          <div className="whitespace-nowrap flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">DevConnect</h1>
            <p className="text-[10px] text-primary font-medium uppercase tracking-widest leading-tight">The Pulse</p>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 relative">
          <NavItem to="/" icon="explore" label="Feed" isActive={location.pathname === '/'} />
          <NavItem to="/network" icon="group" label="Network" isActive={location.pathname === '/network'} />
          <NavItem to="/projects" icon="layers" label="Projects" isActive={location.pathname === '/projects'} />
          <NavItem to="/messages" icon="podcasts" label="Transmissions" isActive={location.pathname === '/messages'} />
          <NavItem to="/settings" icon="settings" label="Settings" isActive={location.pathname === '/settings'} />
          {userInfo && (
            <NavItem
              to={userInfo.username ? `/profile/${userInfo.username}` : '/profile'}
              icon="account_circle"
              label="My Profile"
              isActive={
                location.pathname === '/profile' ||
                location.pathname === `/profile/${userInfo.username}`
              }
            />
          )}

          {/* Notifications Trigger */}
          {userInfo && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all overflow-hidden text-left ${
                  showNotifications
                    ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                title="Subspace Beacons"
              >
                <div className="relative flex items-center justify-center min-w-[24px]">
                  <span className="material-symbols-outlined text-center">radar</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold px-0.5 shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Beacons
                </span>
              </button>

              {showNotifications && (
                <NotificationsPopover onClose={() => setShowNotifications(false)} />
              )}
            </div>
          )}

          {!userInfo && (
            <Link
              to="/login"
              className="flex items-center gap-4 px-3 py-3 rounded-xl bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30 transition-all mt-4 overflow-hidden"
              title="Login"
            >
              <span className="material-symbols-outlined min-w-[24px] text-center">login</span>
              <span className="font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Login</span>
            </Link>
          )}
        </nav>
      </div>

      {userInfo && (
        <div className="flex flex-col gap-2">
          <div
            className="glass-card rounded-2xl p-2 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            onClick={() => {
              const u = userInfo?.username || userInfo?.user?.username;
              navigate(u ? `/profile/${u}` : '/profile');
            }}
            title="Profile"
          >
            <img
              src={userInfo.avatar || 'https://via.placeholder.com/40'}
              alt={userInfo.username}
              className="w-10 h-10 min-w-[40px] rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="flex flex-col whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pr-2 min-w-0">
              <span className="text-sm font-bold text-white block max-w-[110px] truncate">
                {userInfo.fullname || userInfo.username}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[110px]">
                @{userInfo.username}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all overflow-hidden"
            title="Logout"
          >
            <span className="material-symbols-outlined min-w-[24px] text-center text-sm">logout</span>
            <span className="text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Sign Out
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Navbar;