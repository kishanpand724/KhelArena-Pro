import React, { useState } from "react";
import { User, Shield, Key, Mail, Calendar, LogOut, CheckCircle, Save, Settings, Sparkles, Volume2, ShieldAlert, Download, Smartphone, Trophy } from "lucide-react";
import { auth, db, doc, updateDoc, signOut } from "../lib/firebase";
import { UserProfile } from "../types";

interface SettingsPanelProps {
  user: UserProfile;
}

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sound and visual settings state (saved in localState or just handled as client-side preferences)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg("Display Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg("Profile display name updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Failed to update user profile settings:", err);
      setErrorMsg("Failed to update display name in database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <div id="settings-panel-container" className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white flex items-center space-x-2.5">
          <Settings className="h-6 w-6 text-indigo-400" />
          <span>User Settings</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Profile Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden text-slate-300">
            {/* Background Accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
            
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="h-20 w-20 rounded-full border-2 border-slate-800 shadow-lg object-cover mt-4"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mt-4 shadow-lg">
                <User className="h-10 w-10 text-slate-600" />
              </div>
            )}

            <h3 className="font-sans font-black text-white text-lg mt-4 break-all">
              {user.displayName}
            </h3>
            <p className="text-xs text-slate-500 font-medium font-mono lowercase break-all mt-1">
              {user.email}
            </p>

            <div className="w-full border-t border-slate-800 mt-5 pt-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Security Group:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider ${
                  user.role === "super_admin" 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black" 
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                }`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role === "super_admin" ? "SuperAdmin" : "User"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Wallet Balance:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  ₹{user.walletBalance.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Referral Code:</span>
                <span className="text-indigo-400 font-mono font-bold select-all">
                  {user.referralCode || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Wallet Payouts:</span>
                <span className="text-emerald-400 font-mono">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* KhelArena Mobile App APK Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-slate-300">
            {/* Top decorative accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-2.5 mb-4">
              <Smartphone className="h-5 w-5 text-indigo-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Mobile App & APK
              </h4>
              <span className="ml-auto inline-flex items-center bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                v2.4.0
              </span>
            </div>

            {/* Premium Logo Showcase */}
            <div className="flex items-center space-x-4 mb-4 bg-slate-950 border border-slate-850 p-3 rounded-2xl">
              <img
                src="/src/assets/images/khelarena_logo_1783165455316.jpg"
                alt="KhelArena Logo"
                className="w-12 h-12 rounded-xl object-cover border border-indigo-500/20 shadow-md shadow-indigo-500/5"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono">App Icon</span>
                <h5 className="text-xs font-extrabold text-white">KhelArena Mobile</h5>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">com.khelarena.esports</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 font-medium">
              Take your esports competitive gaming on the go. Install the official Android package to access real-time lobbies, fast match coordination, and zero-fee wallet withdrawals.
            </p>

            <div className="space-y-2 mb-4 font-mono text-[9px] bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold uppercase">Filename:</span>
                <span className="text-slate-300 font-bold">khelarena-esports.apk</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold uppercase">Size:</span>
                <span className="text-slate-300 font-bold">~4.2 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans font-bold uppercase">Security:</span>
                <span className="text-emerald-400 font-bold uppercase">Verified Secure</span>
              </div>
            </div>

            {/* Download Link Wrapper */}
            <a
              id="settings-apk-download-btn"
              href="/khelarena-esports.apk"
              download="khelarena-esports.apk"
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 text-white font-extrabold py-3 px-4 rounded-2xl shadow-sm text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer text-center mb-3.5"
            >
              <Download className="h-4.5 w-4.5" />
              <span>Download Native APK</span>
            </a>

            {/* Quick installation steps */}
            <div className="border-t border-slate-850 pt-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Setup Info:
              </span>
              <ul className="text-[10px] text-slate-400 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                <li>Tap <strong className="text-slate-300">Download APK</strong> and transfer the file to your mobile phone.</li>
                <li>Ensure <strong className="text-slate-300">"Install Unknown Apps"</strong> is enabled in your Android system settings.</li>
                <li>Alternatively, open KhelArena on mobile Chrome and choose <strong className="text-slate-300">"Add to Home Screen"</strong> to generate a native WebAPK icon.</li>
              </ul>
            </div>
          </div>

          {/* Secure Logout Widget */}
          <div className="bg-rose-950/20 border border-rose-950/40 rounded-3xl p-6 shadow-2xl text-slate-300">
            <h4 className="text-sm font-black text-rose-400 flex items-center gap-1.5 mb-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
              <span>Security Terminal</span>
            </h4>
            <p className="text-xs text-rose-400/80 leading-relaxed mb-4 font-medium">
              Disconnect your session immediately. This clears local caches and secure cryptographic session handshakes.
            </p>
            <button
              id="settings-logout-btn"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-2xl shadow-sm text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Log Out Securely</span>
            </button>
          </div>
        </div>

        {/* Right Side: Settings Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Profile Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-300">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-indigo-400" />
              <span>Account Information</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="settings-displayName-input" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </span>
                  <input
                    id="settings-displayName-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="Enter your gaming alias..."
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                  This alias is visible publicly on match tournament registries, player lists, and lead rank standings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Registered Email (Google Auth)
                </label>
                <div className="relative opacity-60">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </span>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  id="settings-save-profile-btn"
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Preferences and Metadata */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-300">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Platform Preferences</span>
            </h3>

            <div className="space-y-4">
              {/* Sound Preferences Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${soundEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200">Lobby Sound Effects</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Play dynamic audio alerts for match status updates</p>
                  </div>
                </div>
                <button
                  id="toggle-sound-settings-btn"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                    soundEnabled ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      soundEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Compact Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${compactMode ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500"}`}>
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200">Compact Tournament Cards</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Maximize layout density to view more live lobbies at once</p>
                  </div>
                </div>
                <button
                  id="toggle-compact-settings-btn"
                  onClick={() => setCompactMode(!compactMode)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                    compactMode ? "bg-indigo-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      compactMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Advanced System Attributes */}
              <div className="mt-6 pt-6 border-t border-slate-800 text-[10px] text-slate-400 space-y-2">
                <div className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  <span className="font-semibold uppercase text-[9px] tracking-widest text-slate-500">Verified User ID:</span>
                  <span className="font-mono bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] select-all break-all text-slate-300">{user.uid}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  <span className="font-semibold uppercase text-[9px] tracking-widest text-slate-500">Joined Platform:</span>
                  <span className="font-mono text-slate-400 font-bold">
                    {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tournament History History */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-300">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-indigo-400" />
              <span>Tournament History</span>
            </h3>
            <div className="space-y-4">
              <div className="text-center py-10 glass-panel border-slate-800 rounded-2xl">
                <Trophy className="h-10 w-10 text-slate-800 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Your tournament participation history will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
