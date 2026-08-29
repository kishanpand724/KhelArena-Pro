/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from "./lib/firebase";
import { UserProfile, UserNotification, AppSettings } from "./types";
import { Trophy, Gamepad2, Key, ShieldCheck, AlertCircle, LogIn, Sparkles, Shield, LogOut } from "lucide-react";

// Import modular components
import Navbar from "./components/Navbar";
import UserPanel from "./components/UserPanel";
import WalletHub from "./components/WalletHub";
import NotificationCenter from "./components/NotificationCenter";
import AdminPanel from "./components/AdminPanel";
import SettingsPanel from "./components/SettingsPanel";
import ReferralHub from "./components/ReferralHub";
import SupportCenter from "./components/SupportCenter";
import BottomNav from "./components/BottomNav";

// Legal and Business Pages
import { AboutUs, ContactUs } from "./components/legal/BusinessPages";
import { PrivacyPolicy, TermsAndConditions, RefundPolicy } from "./components/legal/LegalPolicies";

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    upiId: "arena-pro@upi",
    qrCodeUrl: "",
    razorpayId: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setView] = useState<string>("tournaments"); // tournaments, my-registrations, leaderboard, wallet, notifications
  const [isAdminView, setIsAdminView] = useState(false);

  // Dedicated Admin Login Screen states
  const [showDedicatedAdminLogin, setShowDedicatedAdminLogin] = useState(false);
  const [loginLogoClicks, setLoginLogoClicks] = useState(0);
  const [lastLoginLogoClick, setLastLoginLogoClick] = useState(0);

  // Secret Admin Portal Dialog states
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isValidatingAdmin, setIsValidatingAdmin] = useState(false);

  // 1. Listen to Authentication Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or register user profile inside Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            let needsUpdate = false;
            const updates: any = {};

            if (!data.referralCode) {
              const referralCode = "ARENA" + Math.floor(100000 + Math.random() * 900000);
              updates.referralCode = referralCode;
              data.referralCode = referralCode;
              needsUpdate = true;
            }
            if (data.winningBalance === undefined) {
              updates.winningBalance = 0;
              data.winningBalance = 0;
              needsUpdate = true;
            }
            if (data.bonusBalance === undefined) {
              updates.bonusBalance = 100;
              data.bonusBalance = 100;
              needsUpdate = true;
            }
            if (data.referralBalance === undefined) {
              updates.referralBalance = 0;
              data.referralBalance = 0;
              needsUpdate = true;
            }
            if (!data.statistics) {
              updates.statistics = {
                matchesPlayed: 0,
                wins: 0,
                kills: 0,
                winRate: 0,
                totalEarnings: 0
              };
              data.statistics = updates.statistics;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await updateDoc(userRef, updates);
            }
            setUserProfile(data as UserProfile);
          } else {
            // New Registration - Bootstrap 'kishanpande724@gmail.com' as super_admin
            const isSuperAdmin = firebaseUser.email === "kishanpande724@gmail.com";
            
            // Give new signups a ₹500 starting bonus to test transactions out of the box!
            const referralCode = "ARENA" + Math.floor(100000 + Math.random() * 900000);
            const initialWallet = isSuperAdmin ? 10000 : 500;
            const initialBonus = isSuperAdmin ? 2000 : 100;
            const initialWinning = 0;

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Gamer Player",
              photoURL: firebaseUser.photoURL || "",
              role: isSuperAdmin ? "super_admin" : "user",
              walletBalance: initialWallet,
              winningBalance: initialWinning,
              bonusBalance: initialBonus,
              referralBalance: 0,
              referralCode,
              statistics: {
                matchesPlayed: 0,
                wins: 0,
                kills: 0,
                winRate: 0,
                totalEarnings: 0
              },
              createdAt: new Date().toISOString()
            };

            await setDoc(userRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setUserProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "users/" + firebaseUser.uid);
          console.error("Failed to load user profile:", err);
        }
      } else {
        setUserProfile(null);
        setNotifications([]);
        setIsAdminView(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time sync for current user's document (wallet balances, roles, etc.)
  useEffect(() => {
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfile);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "users/" + currentUser.uid);
      });

      // Synchronize Notifications
      const notifPath = `users/${currentUser.uid}/notifications`;
      const q = query(collection(db, notifPath), orderBy("createdAt", "desc"));
      const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        const list: UserNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as UserNotification);
        });
        setNotifications(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, notifPath);
      });

      return () => {
        unsubscribeProfile();
        unsubscribeNotifs();
      };
    }
  }, [currentUser]);

  // 3. Real-time sync for global application settings
  useEffect(() => {
    if (currentUser) {
      const settingsRef = doc(db, "settings", "global");
      const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          setAppSettings(snapshot.data() as AppSettings);
        } else {
          // Setup initial settings if missing
          setDoc(settingsRef, {
            upiId: "arena-pro@upi",
            qrCodeUrl: "",
            razorpayId: ""
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, "settings/global"));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/global");
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  // Handle standard user Google login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Authentication failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform secure, server-side admin role check
  const handleVerifyAdminAccess = async () => {
    if (!currentUser || !userProfile) {
      setAdminAuthError("You must be signed in to access the Admin console.");
      return;
    }

    setAdminAuthError("");
    setIsValidatingAdmin(true);

    try {
      // Direct Firestore get request on the user's document for verified server status checks
      const userDocRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        
        // Strict super_admin validation check as requested
        if (profile.role === "super_admin") {
          setIsAdminView(true);
          setShowSecretModal(false);
        } else {
          setAdminAuthError("Access Denied: Logged-in account is not authorized as super_admin.");
        }
      } else {
        setAdminAuthError("Profile document not found in database.");
      }
    } catch (err) {
      console.error("Admin validation error:", err);
      setAdminAuthError("Access Denied: Firebase rules blocked role verification.");
    } finally {
      setIsValidatingAdmin(false);
    }
  };

  // Render loading screen
  if (isLoading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-slate-100">
        <Trophy className="h-12 w-12 text-indigo-500 animate-bounce mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold animate-pulse">
          Loading KhelArena Battleground...
        </span>
      </div>
    );
  }

  // Render Dedicated Admin Login Screen if triggered
  if (showDedicatedAdminLogin) {
    return (
      <div id="dedicated-admin-login-screen" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-white">
        {/* Ambient tech-styled background highlights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-md">
            <Shield className="h-8 w-8 text-indigo-500 animate-pulse" />
          </div>

          <span className="text-xs font-black text-indigo-400 bg-indigo-950/50 px-3.5 py-1 rounded-full border border-indigo-500/10 mb-3 uppercase tracking-widest font-mono">
            SECURE ADMIN GATEWAY
          </span>
          <h2 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-white">
            Admin Portal
          </h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm font-medium">
            Perform administrative tasks, manage tournaments, oversee user balances, and inspect platform metrics. Role check for 'super_admin' is enforced.
          </p>

          {adminAuthError && (
            <div className="w-full mt-6 bg-rose-950/50 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs flex flex-col items-center space-y-2 font-medium">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{adminAuthError}</span>
              </div>
              {currentUser && (
                <div className="text-[10px] text-slate-400">
                  Current Account: <span className="font-mono text-slate-300 font-bold">{currentUser.email}</span>
                </div>
              )}
            </div>
          )}

          {!currentUser ? (
            <button
              id="admin-auth-login-btn"
              onClick={async () => {
                setAdminAuthError("");
                setIsLoading(true);
                try {
                  const result = await signInWithPopup(auth, googleProvider);
                  if (result.user) {
                    const userRef = doc(db, "users", result.user.uid);
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                      const profile = docSnap.data() as UserProfile;
                      if (profile.role === "super_admin") {
                        setIsAdminView(true);
                        setShowDedicatedAdminLogin(false);
                      } else {
                        setAdminAuthError("Access Denied: Logged-in account is not a super_admin.");
                      }
                    } else {
                      const isOwner = result.user.email === "kishanpande724@gmail.com";
                      if (isOwner) {
                        setIsAdminView(true);
                        setShowDedicatedAdminLogin(false);
                      } else {
                        setAdminAuthError("Access Denied: Logged-in account is not a super_admin.");
                      }
                    }
                  }
                } catch (err) {
                  console.error("Popup admin login error:", err);
                  setAdminAuthError("Popup authentication failed or was closed.");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full mt-8 flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition duration-150 cursor-pointer"
            >
              <LogIn className="h-5 w-5" />
              <span>Authenticate with Google</span>
            </button>
          ) : (
            <div className="w-full space-y-3 mt-6">
              <button
                id="admin-auth-verify-btn"
                onClick={async () => {
                  setAdminAuthError("");
                  setIsValidatingAdmin(true);
                  try {
                    const userRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                      const profile = docSnap.data() as UserProfile;
                      if (profile.role === "super_admin") {
                        setIsAdminView(true);
                        setShowDedicatedAdminLogin(false);
                      } else {
                        setAdminAuthError("Access Denied: Logged-in account is not a super_admin.");
                      }
                    } else {
                      setAdminAuthError("Profile not found in database.");
                    }
                  } catch (err) {
                    setAdminAuthError("Failed to check super_admin role status.");
                  } finally {
                    setIsValidatingAdmin(false);
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition duration-150 cursor-pointer"
              >
                <Shield className="h-5 w-5" />
                <span>{isValidatingAdmin ? "Verifying Role..." : "Verify & Enter Admin Console"}</span>
              </button>

              <button
                id="admin-auth-logout-btn"
                onClick={async () => {
                  await signOut(auth);
                  setUserProfile(null);
                  setAdminAuthError("");
                }}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold py-3 px-4 rounded-xl transition duration-150 cursor-pointer text-xs"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of {currentUser.email}</span>
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-8 pt-6 border-t border-slate-800/60 gap-4">
            <button
              id="admin-login-exit-btn"
              onClick={() => {
                setShowDedicatedAdminLogin(false);
                setAdminAuthError("");
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition uppercase tracking-wider font-bold cursor-pointer animate-pulse"
            >
              ← Cancel & Exit
            </button>

            <a
              href="/admin.html"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition uppercase tracking-wider font-bold flex items-center gap-1.5"
            >
              <span>Launch Separate Admin App</span>
              <span className="text-[10px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/20">NEW</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render Login interface if user is not signed in
  if (!currentUser) {
    return (
      <div id="login-screen" className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden text-white">
        {/* Ambient background highlights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center mx-4">
          <button
            id="login-logo-btn"
            onClick={() => {
              const now = Date.now();
              if (now - lastLoginLogoClick > 3000) {
                setLoginLogoClicks(1);
              } else {
                const nextCount = loginLogoClicks + 1;
                if (nextCount >= 3) {
                  setShowDedicatedAdminLogin(true);
                  setLoginLogoClicks(0);
                } else {
                  setLoginLogoClicks(nextCount);
                }
              }
              setLastLoginLogoClick(now);
            }}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-slate-950 hover:bg-slate-900/50 flex items-center justify-center border border-slate-800 mb-6 shadow-sm active:scale-95 transition-all duration-100 cursor-pointer"
            title="Double Secret Admin Door"
          >
            <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-500" />
          </button>

          <span className="text-[10px] sm:text-xs font-bold text-indigo-400 bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-500/10 mb-3 uppercase tracking-wider font-mono">
            Esports Tournaments
          </span>
          <h2 className="text-xl sm:text-3xl font-sans font-black tracking-tight text-white uppercase italic">
            KhelArena Portal
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed max-w-xs font-medium">
            Welcome to the ultimate competitive tournament lounge. Sign in to join live game lobbies, secure payouts, and check standings.
          </p>

          <button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            className="w-full mt-8 flex items-center justify-center space-x-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition duration-150 cursor-pointer"
          >
            <LogIn className="h-5 w-5 text-indigo-400" />
            <span className="text-sm sm:text-base">Sign In with Google</span>
          </button>

          <div className="mt-8 space-y-4 w-full">
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>100% Safe</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed block max-w-xs mx-auto font-medium">
              Secure Payment by <strong className="text-slate-400">Razorpay</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Admin View if user has admin view toggled
  if (isAdminView && userProfile) {
    return (
      <AdminPanel
        adminUser={userProfile}
        appSettings={appSettings}
        onCloseAdmin={() => setIsAdminView(false)}
      />
    );
  }

  // Render default User application
  return (
    <div id="user-app-layout" className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      <div className="w-full">
        <Navbar
          user={userProfile}
          notifications={notifications}
          currentView={currentView}
          setView={setView}
          onSecretTrigger={() => {
            setAdminAuthError("");
            setShowDedicatedAdminLogin(true);
          }}
        />

        {/* User Workspace Render */}
        <div className="pt-4 pb-24">
          {currentView === "tournaments" && userProfile && (
            <UserPanel
              user={userProfile}
              appSettings={appSettings}
              view="tournaments"
              setView={setView}
            />
          )}

          {currentView === "my-registrations" && userProfile && (
            <UserPanel
              user={userProfile}
              appSettings={appSettings}
              view="my-registrations"
              setView={setView}
            />
          )}

          {currentView === "leaderboard" && userProfile && (
            <UserPanel
              user={userProfile}
              appSettings={appSettings}
              view="leaderboard"
              setView={setView}
            />
          )}

          {currentView === "wallet" && userProfile && (
            <WalletHub
              user={userProfile}
              appSettings={appSettings}
            />
          )}

          {currentView === "notifications" && userProfile && (
            <NotificationCenter
              user={userProfile}
            />
          )}

          {currentView === "settings" && userProfile && (
            <SettingsPanel
              user={userProfile}
            />
          )}

          {currentView === "referral" && userProfile && (
            <ReferralHub
              user={userProfile}
            />
          )}

          {currentView === "support" && userProfile && (
            <SupportCenter
              user={userProfile}
              setView={setView}
            />
          )}

          {/* Legal and Business Pages */}
          {currentView === "about-us" && <AboutUs setView={setView} />}
          {currentView === "contact-us" && <ContactUs setView={setView} />}
          {currentView === "privacy-policy" && <PrivacyPolicy setView={setView} />}
          {currentView === "terms-conditions" && <TermsAndConditions setView={setView} />}
          {currentView === "refund-policy" && <RefundPolicy setView={setView} />}
        </div>
      </div>

      {userProfile && !isAdminView && (
        <BottomNav currentView={currentView} setView={setView} />
      )}

      {/* Professional Footer for Business Compliance */}
      <footer id="app-footer" className="bg-[#090d16] border-t border-slate-900 pt-12 pb-8 px-4 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-indigo-500" />
              <span className="font-black text-white italic uppercase tracking-tighter">KhelArena</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              India's premier competitive gaming platform. Play Free Fire tournaments, compete with the best, and win real rewards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setView("about-us")} className="text-slate-500 hover:text-white transition cursor-pointer">About Us</button></li>
                <li><button onClick={() => setView("contact-us")} className="text-slate-500 hover:text-white transition cursor-pointer">Contact Us</button></li>
                <li><button onClick={() => setView("tournaments")} className="text-slate-500 hover:text-white transition cursor-pointer">Tournaments</button></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setView("privacy-policy")} className="text-slate-500 hover:text-white transition cursor-pointer">Privacy Policy</button></li>
                <li><button onClick={() => setView("terms-conditions")} className="text-slate-500 hover:text-white transition cursor-pointer">Terms & Conditions</button></li>
                <li><button onClick={() => setView("refund-policy")} className="text-slate-500 hover:text-white transition cursor-pointer">Refund Policy</button></li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">SSL Secured Platform</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Secure Payment by Razorpay</span>
              </div>
              <p className="text-[9px] text-slate-600 leading-relaxed italic">
                100% Safe Transactions. Our payment systems are fully encrypted and PCI-DSS compliant.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-slate-500 font-medium">© 2026 KhelArena Esports Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[10px] text-slate-600 font-mono uppercase tracking-tighter">
            <span>Verified Member</span>
            <span className="h-1 w-1 bg-slate-800 rounded-full"></span>
            <span>PCI Compliant</span>
            <span className="h-1 w-1 bg-slate-800 rounded-full"></span>
            <span>India Gaming Certified</span>
          </div>
        </div>
      </footer>

      {/* Secret Admin Credentials Login Modal */}
      {showSecretModal && (
        <div id="secret-admin-portal-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-4 relative shadow-2xl text-white">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span>Secret Admin Entrance</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              This terminal is strictly for administrators. To continue to the SuperAdmin Console, click the validation verification button below to inspect database credentials.
            </p>

            <button
              id="close-secret-btn"
              onClick={() => setShowSecretModal(false)}
              className="absolute top-4 right-4 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white p-1.5 rounded-full transition border border-slate-800"
            >
              ✕
            </button>

            {adminAuthError && (
              <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <button
              id="verify-admin-btn"
              onClick={handleVerifyAdminAccess}
              disabled={isValidatingAdmin}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>{isValidatingAdmin ? "Checking Credentials..." : "Authenticate as Super Admin"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
