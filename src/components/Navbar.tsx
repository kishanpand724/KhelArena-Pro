import React, { useState, useEffect } from "react";
import { Trophy, Wallet, Bell, Shield, LogOut, Menu, X, User, Settings } from "lucide-react";
import { auth, signOut } from "../lib/firebase";
import { UserProfile, UserNotification } from "../types";

interface NavbarProps {
  user: UserProfile | null;
  notifications: UserNotification[];
  currentView: string;
  setView: (view: string) => void;
  onSecretTrigger: () => void;
}

export default function Navbar({ 
  user, 
  notifications, 
  currentView, 
  setView, 
  onSecretTrigger 
}: NavbarProps) {
  const [logoClicks, setLogoClicks] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogoClick = () => {
    const now = Date.now();
    // Reset clicks if user waits too long between clicks (e.g. more than 3 seconds)
    if (now - lastClickTime > 3000) {
      setLogoClicks(1);
    } else {
      const nextCount = logoClicks + 1;
      if (nextCount >= 3) {
        onSecretTrigger();
        setLogoClicks(0);
      } else {
        setLogoClicks(nextCount);
      }
    }
    setLastClickTime(now);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav id="app-navbar" className="bg-slate-950/80 backdrop-blur-md border-b border-slate-900 sticky top-0 z-40 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo with triple-tap Hidden Gesture */}
          <div className="flex items-center">
            <button
              id="navbar-logo-btn"
              onClick={handleLogoClick}
              className="flex items-center space-x-2.5 focus:outline-none select-none cursor-pointer transition-transform duration-100 active:scale-95"
              title="KhelArena Esports Manager"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
                <Trophy className="h-5 w-5 text-yellow-300 drop-shadow animate-pulse" />
              </div>
              <span className="font-sans font-black tracking-tight text-xl text-white">
                Khel<span className="text-indigo-400">Arena</span>
              </span>
            </button>
          </div>

          {/* User Stats and Notifications */}
          <div className="flex items-center space-x-3">
            {user && (
              <>
                {/* Wallet Balance Indicator */}
                <button
                  id="nav-wallet-btn"
                  onClick={() => setView("wallet")}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-full border bg-slate-950 hover:bg-slate-900 transition shadow-sm ${
                    currentView === "wallet" ? "border-indigo-500/40 text-indigo-400" : "border-slate-800 text-slate-300"
                  }`}
                >
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="font-serif text-sm font-bold italic text-white">
                    ₹{user.walletBalance.toLocaleString("en-IN")}
                  </span>
                </button>

                <button
                  id="mobile-menu-toggle-btn"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-colors"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Mobile Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button
              id="mobile-nav-tournaments"
              onClick={() => {
                setView("tournaments");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "tournaments" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Tournaments
            </button>
            <button
              id="mobile-nav-registrations"
              onClick={() => {
                setView("my-registrations");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "my-registrations" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              My Registrations
            </button>
            <button
              id="mobile-nav-leaderboard"
              onClick={() => {
                setView("leaderboard");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "leaderboard" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Leaderboard
            </button>
            <button
              id="mobile-nav-wallet"
              onClick={() => {
                setView("wallet");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "wallet" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Wallet (₹{user.walletBalance})
            </button>
            <button
              id="mobile-nav-settings"
              onClick={() => {
                setView("settings");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "settings" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Settings
            </button>
            <button
              id="mobile-nav-notifications"
              onClick={() => {
                setView("notifications");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "notifications" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-sans">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              id="mobile-nav-referral"
              onClick={() => {
                setView("referral");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "referral" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Referral Program
            </button>
            <button
              id="mobile-nav-support"
              onClick={() => {
                setView("support");
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                currentView === "support" ? "bg-indigo-500/10 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Help & Support
            </button>
            <button
              id="mobile-logout-btn"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/20"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
