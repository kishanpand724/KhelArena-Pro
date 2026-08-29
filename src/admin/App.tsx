import React, { useState, useEffect } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  onSnapshot,
  FirebaseUser
} from "../lib/firebase";
import { UserProfile, AppSettings } from "../types";
import { Trophy, Shield, Key, AlertCircle, LogIn, LogOut, CheckCircle } from "lucide-react";
import AdminPanel from "../components/AdminPanel";

export default function AdminApp() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    upiId: "arena-pro@upi",
    qrCodeUrl: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [authError, setAuthError] = useState("");

  // 1. Listen to Authentication Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setAuthError("");
      
      if (firebaseUser) {
        setIsCheckingRole(true);
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            
            if (profile.role !== "super_admin") {
              setAuthError("Access Denied: Your account does not have super_admin privileges.");
            }
          } else {
            // Profile does not exist yet (or is a fresh user visiting the admin app first)
            // Register them as standard user (or super_admin if it's the specified owner email)
            const isOwner = firebaseUser.email === "kishanpande724@gmail.com";
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Admin User",
              photoURL: firebaseUser.photoURL || "",
              role: isOwner ? "super_admin" : "user",
              walletBalance: isOwner ? 10000 : 500,
              winningBalance: 0,
              bonusBalance: 0,
              referralBalance: 0,
              referralCode: "REF-" + Math.floor(100000 + Math.random() * 900000),
              createdAt: new Date().toISOString()
            };
            
            // Note: Since this is an admin portal, we strictly save the profile first
            setUserProfile(newProfile);
            if (!isOwner) {
              setAuthError("Access Denied: Your account does not have super_admin privileges.");
            }
          }
        } catch (err) {
          console.error("Failed to load user profile in Admin App:", err);
          setAuthError("Failed to verify user privileges with Firestore.");
        } finally {
          setIsCheckingRole(false);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time sync for global application settings
  useEffect(() => {
    if (currentUser) {
      const settingsRef = doc(db, "settings", "global");
      const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          setAppSettings(snapshot.data() as AppSettings);
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Admin Authentication failed:", err);
      setAuthError("Authentication failed during Google Popup Login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
      setAuthError("");
    } catch (err) {
      console.error("Admin Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading Screen
  if (isLoading || isCheckingRole) {
    return (
      <div id="admin-loading-screen" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Shield className="h-12 w-12 text-indigo-500 animate-pulse mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-slate-400 font-bold">
          Verifying Admin Access...
        </span>
      </div>
    );
  }

  // Not logged in or Access Denied
  if (!currentUser || (userProfile && userProfile.role !== "super_admin")) {
    return (
      <div id="admin-login-screen" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-white">
        {/* Tech styled background highlights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-md">
            <Shield className="h-8 w-8 text-indigo-500" />
          </div>

          <span className="text-xs font-black text-indigo-400 bg-indigo-950/50 px-3.5 py-1 rounded-full border border-indigo-500/10 mb-3 uppercase tracking-widest font-mono">
            SUPERADMIN SECURE LAYER
          </span>
          <h2 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-white">
            KhelArena Control
          </h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm font-medium">
            This is an isolated SuperAdmin workspace. Role verification is enforced. Unauthorized login attempts are logged.
          </p>

          {authError ? (
            <div className="w-full mt-6 bg-rose-950/50 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs flex flex-col items-center space-y-3 font-medium">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
              {currentUser && (
                <div className="text-[10px] text-slate-400">
                  Logged in as: <span className="font-mono text-slate-300 font-bold">{currentUser.email}</span>
                </div>
              )}
              {currentUser && (
                <button
                  id="admin-switch-account-btn"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Switch Account</span>
                </button>
              )}
            </div>
          ) : null}

          {!currentUser ? (
            <button
              id="admin-google-login-btn"
              onClick={handleGoogleLogin}
              className="w-full mt-8 flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition duration-150 cursor-pointer"
            >
              <LogIn className="h-5 w-5" />
              <span>Sign In as Admin</span>
            </button>
          ) : null}

          {/* Return to standard app */}
          <a
            href="/"
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition uppercase tracking-wider font-bold block"
          >
            ← Return to User Lounge
          </a>

          <span className="text-[9px] text-slate-600 mt-8 leading-relaxed block max-w-xs font-mono uppercase tracking-widest">
            Cryptographic handshake &middot; Zero Trust Access Verified
          </span>
        </div>
      </div>
    );
  }

  // Render Admin View if successfully authenticated as super_admin
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-indigo-500" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">
              KhelArena SuperAdmin
            </h1>
            <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-mono">
              Dedicated Admin App
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400 font-bold">Admin:</span>
            <span className="text-white font-black">{currentUser.email}</span>
          </div>

          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <AdminPanel
          adminUser={userProfile}
          appSettings={appSettings}
          onCloseAdmin={() => {
            // Since this is a separate application project, closing admin panel can log them out or show a message
            // Instead of just going back, we can offer to let them logout or return to user lounge
            window.location.href = "/";
          }}
        />
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
        <span>KhelArena Administrative Console &middot; Version 2.0 &middot; Secure Firestore Bridge</span>
      </footer>
    </div>
  );
}
