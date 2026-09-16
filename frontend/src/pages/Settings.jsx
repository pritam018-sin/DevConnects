import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useChangePasswordMutation } from '../redux/api/userApiSlice.js';

const Settings = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword) {
      toast.error('Please provide both current and new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      await changePassword({ oldPassword, newPassword }).unwrap();
      toast.success('Security cipher key updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to change password');
    }
  };

  if (!userInfo) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto mt-12">
        <span className="material-symbols-outlined text-4xl text-primary mb-2">lock</span>
        <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
        <p className="text-xs text-slate-400">Please authenticate to manage account settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          System Preferences
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your account credentials, security preferences, and session controls.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider font-mono">
          <span className="material-symbols-outlined text-sm">badge</span>
          <span>Account Parameters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
              Username
            </span>
            <span className="font-mono text-slate-200 mt-0.5 block font-medium">
              @{userInfo.username}
            </span>
          </div>
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
              Registered Email
            </span>
            <span className="font-mono text-slate-200 mt-0.5 block font-medium">
              {userInfo.email}
            </span>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-6">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider font-mono">
          <span className="material-symbols-outlined text-sm">key</span>
          <span>Update Cipher Key</span>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-bold text-slate-400 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-primary transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-primary transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-primary transition"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-[0_0_20px_rgba(106,91,205,0.4)] flex items-center gap-1.5"
            >
              <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
              <span className="material-symbols-outlined text-sm">lock_reset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
