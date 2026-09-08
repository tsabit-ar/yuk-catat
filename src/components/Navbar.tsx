import React from 'react';
import { Wallet, Bell, Cloud, CheckCircle2, CloudUpload, AlertCircle, LogIn, LogOut, User } from 'lucide-react';
import { SaveStatus, UserSession } from '../types';

interface NavbarProps {
  saveStatus: SaveStatus;
  user: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  saveStatus,
  user,
  onOpenAuth,
  onLogout,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
              YukCatat
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              PWA Ledger
            </span>
          </div>
        </div>

        {/* Center / Save Status Pill */}
        <div className="flex items-center">
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 border ${
              saveStatus === 'saving'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 animate-pulse'
                : saveStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : saveStatus === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
            }`}
          >
            {saveStatus === 'saving' && (
              <>
                <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Error Saving</span>
              </>
            )}
            {saveStatus === 'idle' && (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span>Idle</span>
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notification / Reminder Button */}
          <button
            onClick={onOpenNotifications}
            title="Pengaturan Pengingat Harian"
            className="p-2 text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* User Auth Shell */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden md:inline-block max-w-[120px] truncate">{user.name}</span>
              </div>
              <button
                onClick={onLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
