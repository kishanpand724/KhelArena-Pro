import React, { useState, useEffect, useRef } from "react";
import { 
  Trophy, 
  Gamepad2, 
  Calendar, 
  Users, 
  DollarSign, 
  Search, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Copy, 
  Sparkles,
  User,
  ExternalLink,
  MapPin,
  FileText,
  Bookmark,
  Share2,
  TrendingUp,
  Award,
  Bell,
  HelpCircle,
  Smartphone,
  Flame,
  Shield,
  ArrowRight,
  Sparkle,
  Heart,
  RefreshCw,
  Gift
} from "lucide-react";
import { 
  collection, 
  db, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  increment,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  where,
  limit,
  getDocs,
  auth
} from "../lib/firebase";
import { UserProfile, Tournament, Registration, AppSettings, PromoCode } from "../types";
import LeaderboardTab from "./LeaderboardTab";
import SupportCenter from "./SupportCenter";
import ReferralHub from "./ReferralHub";
import WalletHub from "./WalletHub";

interface UserPanelProps {
  user: UserProfile;
  appSettings: AppSettings;
  view: string;
  setView: (view: string) => void;
}

// Helper to dynamically load Razorpay SDK
const loadRazorpaySDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function UserPanel({ user, appSettings, view, setView }: UserPanelProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  
  // Registration state
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [gameUsername, setGameUsername] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "razorpay" | "upi">("wallet");
  
  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");
  
  // Payment Config
  const [paymentConfig, setPaymentConfig] = useState({ configured: false, keyId: "" });

  // Navigation states (mobile-first premium bottom navigation)
  const [activeTab, setActiveTab] = useState<"home" | "tournaments" | "my-matches" | "leaderboard" | "wallet" | "referrals" | "support">("home");

  // Sync tab with App.tsx view prop (backward-compatible navigation)
  useEffect(() => {
    if (view === "tournaments") setActiveTab("home");
    else if (view === "my-registrations") setActiveTab("my-matches");
    else if (view === "leaderboard") setActiveTab("leaderboard");
    else if (view === "wallet") setActiveTab("wallet");
    else if (view === "referral") setActiveTab("referrals");
    else if (view === "support") setActiveTab("support");
  }, [view]);

  // Scroll to top on tab change for professional feel
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // Loading Skeletons State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(true);

  // Clipboard notices
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameFilter, setSelectedGameFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "solo" | "duo" | "squad" | "clash_squad" | "free">("all");

  // Fetch Tournaments list
  useEffect(() => {
    setIsLoadingLobbies(true);
    const tournamentsPath = "tournaments";
    const q = query(
      collection(db, tournamentsPath),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Tournament);
        });
        setTournaments(list);
        setIsLoadingLobbies(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, tournamentsPath);
        setIsLoadingLobbies(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch payment config on mount
  useEffect(() => {
    fetch("/api/payment/config")
      .then((res) => res.json())
      .then((data) => setPaymentConfig(data))
      .catch((err) => console.error("Failed to load payment config:", err));
  }, []);

  // Set default payment method based on wallet balance and settings
  useEffect(() => {
    if (selectedTournament) {
      setAppliedPromo(null);
      setPromoCodeInput("");
      setPromoError("");
      setPromoSuccessMsg("");
      const effectiveFee = selectedTournament.entryFee;
      if (user.walletBalance >= effectiveFee) {
        setPaymentMethod("wallet");
      } else if (paymentConfig.configured) {
        setPaymentMethod("razorpay");
      } else {
        setPaymentMethod("upi");
      }
    }
  }, [selectedTournament, user.walletBalance, paymentConfig.configured]);

  // Track user registration for currently selected tournament
  useEffect(() => {
    if (selectedTournament) {
      setUserRegistration(null);
      const regPath = `tournaments/${selectedTournament.id}/registrations/${user.uid}`;
      
      const unsubscribe = onSnapshot(doc(db, regPath), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserRegistration(docSnapshot.data() as Registration);
        } else {
          setUserRegistration(null);
        }
      }, (error) => {
        console.error("Failed to track registration state:", error);
      });

      return () => unsubscribe();
    }
  }, [selectedTournament, user.uid]);

  // Pull to refresh simulation
  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  // Promo code validator
  const handleApplyPromoCode = async () => {
    setPromoError("");
    setPromoSuccessMsg("");
    if (!promoCodeInput.trim() || !selectedTournament) return;

    try {
      // Load and evaluate promo codes
      const q = query(
        collection(db, "promo_codes"),
        where("code", "==", promoCodeInput.trim().toUpperCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const promoDoc = snap.docs[0];
        const promo = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;
        
        // Expiry verification
        if (new Date(promo.expiryDate) < new Date()) {
          setPromoError("This promo code has expired.");
          return;
        }

        // Limit verification
        if (promo.usedCount >= promo.usageLimit) {
          setPromoError("This promo code has reached its usage limit.");
          return;
        }

        // Min fee requirement
        if (selectedTournament.entryFee < promo.minEntryFee) {
          setPromoError(`Minimum entry fee of ₹${promo.minEntryFee} is required.`);
          return;
        }

        setAppliedPromo(promo);
        const discountAmount = promo.discountType === "flat" ? promo.value : Math.round((selectedTournament.entryFee * promo.value) / 100);
        setPromoSuccessMsg(`Promo Applied! Saved ₹${discountAmount}`);
      } else {
        setPromoError("Invalid promo code.");
      }
    } catch (err) {
      console.error(err);
      setPromoError("Error applying promo code.");
    }
  };

  // Automated razorpay order & signature check + registration state logging
  const handleRazorpayPayment = async (actualFee: number) => {
    const isLoaded = await loadRazorpaySDK();
    if (!isLoaded) {
      throw new Error("Razorpay payment SDK failed to load. Check internet connectivity.");
    }

    // 1. Create order on Express Server
    const orderRes = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: actualFee,
        receipt: `receipt_reg_${user.uid.substring(0, 5)}_${Date.now()}`,
        notes: {
          userId: user.uid,
          tournamentId: selectedTournament?.id,
          gameUsername
        }
      })
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json();
      throw new Error(errData.error || "Failed to create Razorpay payment order");
    }

    const order = await orderRes.json();

    // 2. Open Razorpay Widget
    return new Promise<string>((resolve, reject) => {
      const options = {
        key: paymentConfig.keyId || "rzp_test_mock_keys",
        amount: order.amount,
        currency: "INR",
        name: "KhelArena Pro",
        description: `Tournament Entry: ${selectedTournament?.title}`,
        order_id: order.id,
        prefill: {
          name: user.displayName,
          email: user.email
        },
        theme: {
          color: "#4f46e5"
        },
        handler: async function (response: any) {
          try {
            // Verify payment signature
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.verified || verifyData.isMock) {
              resolve(response.razorpay_payment_id || "MOCK_PAYMENT_ID");
            } else {
              reject(new Error("Payment signature verification failed. Secure handshake interrupted."));
            }
          } catch (e) {
            reject(e);
          }
        },
        modal: {
          ondismiss: function () {
            reject(new Error("Payment cancelled by player."));
          }
        }
      };

      // Handle Mock Order Verification
      if (order.isMock) {
        // Automatically accept or verify after 1.5 seconds to simulate Razorpay Sandbox widget beautifully
        setTimeout(() => {
          options.handler({
            razorpay_order_id: order.id,
            razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
            razorpay_signature: "mock_approved_sig"
          });
        }, 1200);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setRegisterError("");
    setRegisterSuccess(false);

    if (!gameUsername.trim()) {
      setRegisterError("In-game Username (gamertag) is required.");
      return;
    }

    setIsRegistering(true);

    try {
      // 1. If Razorpay payment is needed, do it first (client-side)
      let transactionRef = "FREE_ENTRY";
      
      let actualFee = selectedTournament.entryFee;
      if (appliedPromo) {
        const discount = appliedPromo.discountType === "flat" ? appliedPromo.value : Math.round((selectedTournament.entryFee * appliedPromo.value) / 100);
        actualFee = Math.max(0, selectedTournament.entryFee - discount);
      }

      if (actualFee > 0 && paymentMethod === "razorpay") {
        const paymentId = await handleRazorpayPayment(actualFee);
        transactionRef = paymentId;
      }

      // 2. Call secure server-side API for balance deduction and registration
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch("/api/tournament/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          userId: user.uid,
          gameUsername: gameUsername.trim(),
          paymentMethod: paymentMethod,
          promoCode: appliedPromo?.code,
          transactionId: transactionId.trim() // For UPI
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Registration failed");
      }

      setRegisterSuccess(true);
      setGameUsername("");
      setTransactionId("");
      setPromoCodeInput("");
      setAppliedPromo(null);
    } catch (err: any) {
      console.error(err);
      setRegisterError(err?.message || "Tournament entry registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string, type: "room" | "pass") => {
    navigator.clipboard.writeText(text);
    if (type === "room") {
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Filter lists based on tab selection
  const liveLobbies = tournaments.filter((t) => t.status === "ongoing" || t.status === "room_released" || t.status === "match_live");
  const upcomingLobbies = tournaments.filter((t) => t.status === "upcoming" || t.status === "registration_open");
  const completedLobbies = tournaments.filter((t) => t.status === "completed");

  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.gameName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGame = selectedGameFilter === "All" || t.gameName === selectedGameFilter;
    const matchesStatus = selectedStatusFilter === "all" || t.status === selectedStatusFilter;

    let matchesCategory = true;
    if (selectedCategory === "solo") matchesCategory = t.gameMode === "Solo";
    else if (selectedCategory === "duo") matchesCategory = t.gameMode === "Duo";
    else if (selectedCategory === "squad") matchesCategory = t.gameMode === "Squad" || t.gameMode === "Squad 4v4";
    else if (selectedCategory === "clash_squad") matchesCategory = (t.gameMode || "").toLowerCase().includes("clash");
    else if (selectedCategory === "free") matchesCategory = t.entryFee === 0;

    return matchesSearch && matchesGame && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between pb-24 md:pb-6 relative font-sans">
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Workspace Frame */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 flex-1">
        
        {/* Pull To Refresh Trigger Bar */}
        <div className="flex justify-center mb-4 md:hidden">
          <button 
            onClick={handlePullToRefresh} 
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-panel border-slate-800 text-[10px] uppercase font-black tracking-widest text-indigo-400 hover:text-white transition duration-200 active:rotate-180"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing Lobbies..." : "Pull to Refresh"}</span>
          </button>
        </div>

        {/* ==================== 1. HOME TAB ==================== */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* FEATURED BANNER SLIDER */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl h-[260px] sm:h-[320px] flex flex-col justify-end p-6 sm:p-10 gaming-glow-purple group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent)]" />
              <div className="absolute inset-0 bg-slate-950/85" />
              <img 
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000" 
                alt="Arena Banner" 
                className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:scale-105 transition-all duration-700 pointer-events-none"
              />
              <div className="relative max-w-2xl space-y-3 z-10">
                <span className="inline-flex items-center text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  <Flame className="h-3.5 w-3.5 mr-1" />
                  Season 6 Grand Arena Active
                </span>
                <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white uppercase italic">
                  DOMINATE THE BATTLEFIELD
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
                  Join certified Free Fire high stakes lobbies, compete with verified squads, and withdraw instantaneous automated cash prizes.
                </p>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setSelectedStatusFilter("all"); setView("tournaments"); setActiveTab("tournaments"); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <span>Browse Matches</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setView("referral")}
                    className="glass-panel hover:bg-slate-900/60 border-slate-800 text-slate-300 font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition duration-150 cursor-pointer"
                  >
                    Claim Referral Credits
                  </button>
                </div>
              </div>
            </div>

            {/* ANNOUNCEMENT SLIDER TICKER */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center gap-3 relative overflow-hidden">
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-indigo-400 font-black text-[10px] uppercase shrink-0">
                <Bell className="h-3.5 w-3.5 animate-bounce" />
                <span>News</span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate font-sans">
                📣 Free Fire CS 4v4 Sunday Cup starts tonight. Prize pool of <span className="text-amber-400 font-bold">₹10,000</span> guaranteed. Wallet cashouts are verified 24/7!
              </div>
            </div>

            {/* CATEGORIES / QUICK SECTIONS */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Gamepad2 className="h-5 w-5 text-indigo-400" />
                <span>Gaming Sections</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { id: "all", label: "All Formats", icon: Gamepad2, color: "from-indigo-600 to-indigo-700" },
                  { id: "solo", label: "Solo 1v1", icon: User, color: "from-purple-600 to-purple-700" },
                  { id: "duo", label: "Duo Matches", icon: Users, color: "from-fuchsia-600 to-fuchsia-700" },
                  { id: "squad", label: "Squad Lobbies", icon: Trophy, color: "from-rose-600 to-rose-700" },
                  { id: "free", label: "Free Lobbies", icon: Gift, color: "from-emerald-600 to-emerald-700" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as any);
                      setView("tournaments");
                      setActiveTab("tournaments");
                    }}
                    className="glass-panel hover:bg-slate-900/60 border-slate-800 p-4 rounded-2xl transition duration-150 text-left flex flex-col justify-between h-24 group relative cursor-pointer"
                  >
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 w-10 h-10 flex items-center justify-center group-hover:scale-110 transition duration-150">
                      <cat.icon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE LOBBIES / MATCHES */}
            {liveLobbies.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                    <span>Live Stream lobbies</span>
                  </h3>
                  <span className="text-[10px] text-rose-400 font-mono font-black uppercase">
                    Active {liveLobbies.length} Matches
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {liveLobbies.map((t) => (
                    <TournamentGridCard key={t.id} t={t} onClick={() => setSelectedTournament(t)} />
                  ))}
                </div>
              </div>
            )}

            {/* UPCOMING TOURNAMENTS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <span>Upcoming Tournaments</span>
                </h3>
                <button 
                  onClick={() => { setView("tournaments"); setActiveTab("tournaments"); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <span>See All Lobbies</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {isLoadingLobbies ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="h-64 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
                  <div className="h-64 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
                  <div className="h-64 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
                </div>
              ) : upcomingLobbies.length === 0 ? (
                <div className="glass-panel rounded-3xl p-10 text-center border-slate-800 text-slate-500">
                  <Gamepad2 className="h-10 w-10 mx-auto text-slate-700 animate-bounce mb-2" />
                  <p className="text-xs font-semibold">No upcoming lobbies are scheduled today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {upcomingLobbies.slice(0, 6).map((t) => (
                    <TournamentGridCard key={t.id} t={t} onClick={() => setSelectedTournament(t)} />
                  ))}
                </div>
              )}
            </div>

            {/* LATEST WINNERS ticker */}
            <div className="glass-panel rounded-3xl p-6 border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-400 via-indigo-500 to-amber-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <Award className="h-4.5 w-4.5 text-amber-400" />
                <span>Arena Tournament Winners</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: "CS_Terminator", game: "CS 4v4", reward: "₹1,500", rank: "1st Place" },
                  { name: "AWM_King", game: "Solo Battle Royal", reward: "₹800", rank: "1st Place" },
                  { name: "Slayers_OP", game: "CS 2v2", reward: "₹1,200", rank: "1st Place" },
                  { name: "GamerBoy_99", game: "Survival Royal", reward: "₹400", rank: "2nd Place" }
                ].map((winner, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between h-20 text-left">
                    <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase">{winner.game}</span>
                    <h4 className="text-xs font-black text-slate-200 truncate">{winner.name}</h4>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-amber-400 font-serif italic">{winner.reward}</span>
                      <span className="text-slate-500 text-[9px] font-sans font-black uppercase tracking-wider">{winner.rank}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links to Hubs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setView("referral")}
                className="glass-panel border-slate-800 p-6 rounded-3xl text-left group hover:border-indigo-500/40 transition duration-300 relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Gift className="h-20 w-20 text-indigo-400" />
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl w-fit mb-4">
                  <Gift className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-tight mb-1">Referral Program</h3>
                <p className="text-xs text-slate-400 font-medium">Invite friends and earn bonus credits for every entry.</p>
              </button>

              <button 
                onClick={() => setView("support")}
                className="glass-panel border-slate-800 p-6 rounded-3xl text-left group hover:border-emerald-500/40 transition duration-300 relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <HelpCircle className="h-20 w-20 text-emerald-400" />
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-fit mb-4">
                  <HelpCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-tight mb-1">Help & Support</h3>
                <p className="text-xs text-slate-400 font-medium">24/7 assistance for payments, verification & room issues.</p>
              </button>
            </div>
          </div>
        )}

        {/* ==================== 2. ALL LOBBIES TAB ==================== */}
        {activeTab === "tournaments" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* SEARCH AND FILTERS TOOLBAR */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search live tournament or map..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 bg-slate-950/60 border border-slate-850 px-3 py-2 rounded-xl text-xs text-slate-300">
                  <Gamepad2 className="h-4 w-4 text-indigo-400" />
                  <select
                    value={selectedGameFilter}
                    onChange={(e) => setSelectedGameFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-300 focus:outline-none cursor-pointer font-bold text-xs"
                  >
                    <option value="All" className="bg-[#030712] text-slate-300">All games</option>
                    <option value="Free Fire" className="bg-[#030712] text-slate-300">Free Fire</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1 bg-slate-950/60 border border-slate-850 p-1 rounded-xl">
                  {["all", "upcoming", "ongoing", "completed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                        selectedStatusFilter === st
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FILTERS AND FORMATS SELECTION BAR */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-900">
              {[
                { id: "all", label: "All Formats" },
                { id: "solo", label: "Solo 1V1" },
                { id: "duo", label: "Duo 2V2" },
                { id: "squad", label: "Squad 4V4" },
                { id: "clash_squad", label: "Clash Squad" },
                { id: "free", label: "Free Lobbies" }
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedCategory(format.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition duration-150 border cursor-pointer ${
                    selectedCategory === format.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>

            {/* TOURNEY GRID */}
            {filteredTournaments.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border-slate-800 text-slate-500">
                <Gamepad2 className="h-16 w-16 text-slate-700 mx-auto mb-4 animate-bounce" />
                <h3 className="text-sm font-black text-slate-200">No tournaments matched</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Try adjusting formats or active filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.map((t) => (
                  <TournamentGridCard key={t.id} t={t} onClick={() => setSelectedTournament(t)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. MY MATCHES TAB ==================== */}
        {activeTab === "my-matches" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-xl font-black text-white flex items-center space-x-2.5">
              <Trophy className="h-5 w-5 text-indigo-400" />
              <span>Registered Squad Matches</span>
            </h2>

            {tournaments.filter(t => t.id).length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border-slate-800 text-slate-500">
                <Calendar className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                <p className="text-xs font-semibold">You haven't entered any competitive matches yet.</p>
                <button
                  onClick={() => setActiveTab("tournaments")}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-500 transition text-xs shadow-md cursor-pointer"
                >
                  Enter Lobbies Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  To view Room Access details, credentials, keys, or verification logs, tap on any match registry card below.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTournament(t)}
                      className="w-full text-left glass-panel hover:bg-slate-900/30 border-slate-800 hover:border-indigo-500/30 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4 transition group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-indigo-400 font-mono font-black uppercase tracking-wider">
                          {t.gameName} {t.gameMode ? `• ${t.gameMode}` : ""}
                        </span>
                        <h4 className="font-extrabold text-white group-hover:text-indigo-400 mt-1 line-clamp-1 text-sm">
                          {t.title}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2.5 text-xs text-slate-500 font-medium">
                          <span className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                            {t.startDate}
                          </span>
                          <span>•</span>
                          <span className="font-serif italic font-bold text-amber-400">
                            Pool: ₹{t.prizePool}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. LEADERBOARD TAB ==================== */}
        {activeTab === "leaderboard" && (
          <div className="animate-in fade-in duration-300">
            <LeaderboardTab currentUser={user} />
          </div>
        )}

        {/* ==================== 5. WALLET HUB TAB ==================== */}
        {activeTab === "wallet" && (
          <div className="animate-in fade-in duration-300">
            <WalletHub user={user} appSettings={appSettings} />
          </div>
        )}

        {/* ==================== 6. REFERRAL SQUAD TAB ==================== */}
        {activeTab === "referrals" && (
          <div className="animate-in fade-in duration-300">
            <ReferralHub user={user} />
          </div>
        )}

        {/* ==================== 7. SUPPORT CENTER TAB ==================== */}
        {activeTab === "support" && (
          <div className="animate-in fade-in duration-300">
            <SupportCenter user={user} setView={setView} />
          </div>
        )}

      </div>

      {/* ==================== TOURNAMENT DETAILS OVERLAY MODAL ==================== */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-thin">
            
            {/* Modal header image */}
            <div className="h-52 bg-slate-950 relative">
              {selectedTournament.bannerUrl ? (
                <img
                  src={selectedTournament.bannerUrl}
                  alt={selectedTournament.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 to-slate-900/60 flex flex-col items-center justify-center">
                  <Gamepad2 className="h-14 w-14 text-indigo-500/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              
              <button
                onClick={() => { setSelectedTournament(null); setRegisterError(""); setRegisterSuccess(false); }}
                className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950/90 text-slate-400 hover:text-white p-2 rounded-full transition border border-slate-800 cursor-pointer shadow"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <span className="text-[9px] bg-indigo-600 text-white px-2.5 py-1 rounded font-black uppercase tracking-widest shadow-sm">
                  {selectedTournament.gameName}
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-2 leading-tight">
                  {selectedTournament.title}
                </h2>
              </div>
            </div>

            {/* Modal content body */}
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-300">
              {/* Left column: Information block */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Match Brief & rules</span>
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium whitespace-pre-line bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
                    {selectedTournament.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-850">
                  <div className="flex items-center space-x-3 text-slate-300">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Match Schedule</span>
                      <span className="text-xs font-bold text-slate-200">{selectedTournament.startDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Available Slots</span>
                      <span className="text-xs font-bold text-slate-200">{selectedTournament.maxPlayers} Spots</span>
                    </div>
                  </div>
                </div>

                {/* Map info if exists */}
                {selectedTournament.map && (
                  <div className="flex items-center space-x-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                    <MapPin className="h-4.5 w-4.5 text-purple-400" />
                    <span className="text-xs text-slate-400">Map Layout: <strong className="text-slate-200 font-bold uppercase">{selectedTournament.map}</strong></span>
                  </div>
                )}

                {/* Game Room Credentials (only displayed if user is registered and payment is verified) */}
                {userRegistration && userRegistration.paymentStatus === "verified" && (
                  <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 text-slate-300 shadow-sm">
                    <div className="flex items-center space-x-2 text-indigo-400">
                      <Key className="h-4.5 w-4.5 animate-pulse" />
                      <h4 className="font-extrabold text-xs uppercase tracking-widest">Secret Room Keys</h4>
                    </div>
                    
                    {selectedTournament.roomID ? (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-slate-500 block font-sans font-black">ROOM ID</span>
                            <span className="font-bold tracking-wide text-slate-200 select-all">{selectedTournament.roomID}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedTournament.roomID || "", "room")}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                          >
                            {copiedRoom ? <span className="text-[9px] text-emerald-400 font-sans font-bold">Copied!</span> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-slate-500 block font-sans font-black">PASSWORD</span>
                            <span className="font-bold tracking-wide text-slate-200 select-all">{selectedTournament.roomPassword}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedTournament.roomPassword || "", "pass")}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                          >
                            {copiedPass ? <span className="text-[9px] text-emerald-400 font-sans font-bold">Copied!</span> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-850 font-medium">
                        Lobby Room details release exactly 15 minutes prior to game countdown. Please check back then.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right column: Register Action panel */}
              <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800/80 rounded-3xl p-5">
                <h3 className="font-black text-white text-xs uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                  Lobby Admission Entry
                </h3>

                {selectedTournament.status === "completed" ? (
                  <div className="text-center py-6 text-slate-500">
                    <Trophy className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                    <p className="text-xs font-semibold">This tournament lobby is completed.</p>
                  </div>
                ) : userRegistration ? (
                  <div className="space-y-4 text-center py-4">
                    {userRegistration.paymentStatus === "pending" ? (
                      <div className="flex flex-col items-center">
                        <Clock className="h-12 w-12 text-amber-400 animate-spin mb-3" />
                        <h4 className="font-bold text-slate-200 text-sm">Receipt Pending verification</h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                          Our admins are verifying your manual UPI transaction reference: <span className="font-mono text-slate-300 font-bold bg-slate-950 px-1.5 py-0.5 border border-slate-850 rounded text-[11px]">{userRegistration.transactionId}</span>.
                        </p>
                      </div>
                    ) : userRegistration.paymentStatus === "verified" ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                        <h4 className="font-bold text-emerald-400 text-sm">Slot Secured Successfully</h4>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                          Your slot is secured. Gamertag: <strong className="text-white">{userRegistration.gameUsername}</strong>. Prepare for landing!
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-rose-500">
                        <AlertCircle className="h-12 w-12 mb-3" />
                        <h4 className="font-bold text-sm">Verification Failed</h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                          The receipt could not be verified. Please register again with valid UPI transaction references.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 text-slate-300">
                    {selectedTournament.entryFee > 0 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            Select Payment Gateway Method
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("wallet")}
                              className={`p-2 rounded-xl border text-left transition flex flex-col justify-between h-18 cursor-pointer ${
                                paymentMethod === "wallet"
                                  ? "border-indigo-600 bg-indigo-500/10 text-indigo-400"
                                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900/20"
                              }`}
                            >
                              <span className="text-[10px] font-extrabold leading-tight">Wallet</span>
                              <span className="text-[8px] font-mono mt-1 block">Bal: ₹{user.walletBalance}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPaymentMethod("razorpay")}
                              className={`p-2 rounded-xl border text-left transition flex flex-col justify-between h-18 cursor-pointer ${
                                paymentMethod === "razorpay"
                                  ? "border-indigo-600 bg-indigo-500/10 text-indigo-400"
                                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900/20"
                              }`}
                            >
                              <span className="text-[10px] font-extrabold leading-tight">Razorpay</span>
                              <span className="text-[8px] mt-1 block font-bold font-mono">AutoPay</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPaymentMethod("upi")}
                              className={`p-2 rounded-xl border text-left transition flex flex-col justify-between h-18 cursor-pointer ${
                                paymentMethod === "upi"
                                  ? "border-indigo-600 bg-indigo-500/10 text-indigo-400"
                                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900/20"
                              }`}
                            >
                              <span className="text-[10px] font-extrabold leading-tight">Manual UPI</span>
                              <span className="text-[8px] mt-1 block font-bold font-mono">Submit UTR</span>
                            </button>
                          </div>
                        </div>

                        {/* Promo Code section */}
                        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl space-y-2">
                          <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500">
                            Apply Promo Code / Discount Voucher
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. ARENA50"
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={handleApplyPromoCode}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1 rounded-lg text-[10px] uppercase transition cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                          {promoError && <p className="text-[9px] text-rose-400 font-medium">{promoError}</p>}
                          {promoSuccessMsg && <p className="text-[9px] text-emerald-400 font-bold">{promoSuccessMsg}</p>}
                        </div>

                        {paymentMethod === "wallet" && (
                          <div className="p-3.5 bg-indigo-950/10 border border-indigo-500/10 rounded-xl text-[11px] leading-relaxed text-slate-400 font-medium">
                            <span className="font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">Pay via Arena Wallet</span>
                            Fee deduction of <strong className="text-white">₹{selectedTournament.entryFee - (appliedPromo ? (appliedPromo.discountType === "flat" ? appliedPromo.value : Math.round((selectedTournament.entryFee * appliedPromo.value) / 100)) : 0)}</strong> happens instantly from your wallet balance.
                          </div>
                        )}

                        {paymentMethod === "razorpay" && (
                          <div className="p-3.5 bg-indigo-950/10 border border-indigo-500/10 rounded-xl text-[11px] leading-relaxed text-slate-400 font-medium">
                            <span className="font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">Razorpay Secured Automated pay</span>
                            No key configurations required in sandbox mode. Checkout operates instantly via client signatures!
                          </div>
                        )}

                        {paymentMethod === "upi" && (
                          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                            <span className="font-extrabold text-indigo-400 uppercase tracking-wider text-[10px] block">UPI ID: {appSettings.upiId}</span>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                              Send exactly <strong className="text-white">₹{selectedTournament.entryFee - (appliedPromo ? (appliedPromo.discountType === "flat" ? appliedPromo.value : Math.round((selectedTournament.entryFee * appliedPromo.value) / 100)) : 0)}</strong> to the UPI id, then paste the 12-digit reference UTR transaction ID below.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">In-Game Username (UID)*</label>
                      <input
                        type="text"
                        required
                        value={gameUsername}
                        onChange={(e) => setGameUsername(e.target.value)}
                        placeholder="e.g. Team_Shroud"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold placeholder-slate-700"
                      />
                    </div>

                    {selectedTournament.entryFee > 0 && paymentMethod === "upi" && (
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Transaction reference ID*</label>
                        <input
                          type="text"
                          required
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. 12-digit UTR number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold placeholder-slate-700"
                        />
                      </div>
                    )}

                    {registerError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-1.5 font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    {registerSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-1.5 font-bold animate-pulse">
                        <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                        <span>Registration Successful!</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10"
                    >
                      {isRegistering ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Processing Admission...</span>
                        </>
                      ) : (
                        <span>
                          {selectedTournament.entryFee === 0 ? "Join Match Free" : `Register and Pay ₹${selectedTournament.entryFee - (appliedPromo ? (appliedPromo.discountType === "flat" ? appliedPromo.value : Math.round((selectedTournament.entryFee * appliedPromo.value) / 100)) : 0)}`}
                        </span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Component: Tournament Card inside the Grid
interface TournamentGridCardProps {
  key?: any;
  t: Tournament;
  onClick: () => void;
}

function TournamentGridCard({ t, onClick }: TournamentGridCardProps) {
  const isFull = t.registeredPlayersCount >= t.maxPlayers;
  const progressRatio = Math.min((t.registeredPlayersCount / t.maxPlayers) * 100, 100);

  // Dynamic countdown timer calculation
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const updateCountdown = () => {
      const start = new Date(t.startDate).getTime();
      const now = new Date().getTime();
      const distance = start - now;

      if (distance < 0) {
        setTimeLeft("LIVE MATCH");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h left`);
        } else {
          setTimeLeft(`${hours}h ${minutes}m left`);
        }
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [t.startDate]);

  return (
    <div
      onClick={onClick}
      className="glass-panel border-slate-800/80 hover:border-indigo-500/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/5 transition duration-300 flex flex-col justify-between group cursor-pointer relative w-full"
    >
      {/* Top Graphic Image */}
      <div className="h-40 sm:h-44 bg-slate-950 relative overflow-hidden">
        {t.bannerUrl ? (
          <img
            src={t.bannerUrl}
            alt={t.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950/20 flex flex-col items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-indigo-500/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Countdown Overlay tag */}
        <span className="absolute bottom-3 left-3 bg-indigo-600/95 backdrop-blur text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
          {timeLeft}
        </span>

        {/* Status indicator tag */}
        <span className={`absolute top-3 right-3 text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest border shadow-sm ${
          t.status === "completed" ? "bg-slate-900 text-slate-400 border-slate-800" :
          t.status === "ongoing" || t.status === "match_live" ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" :
          "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        }`}>
          {t.status.replace('_', ' ')}
        </span>
      </div>

      {/* Content description */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] text-indigo-400 font-mono font-black uppercase tracking-widest">
              {t.gameName}
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {t.gameMode}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-200 group-hover:text-indigo-400 transition duration-150 line-clamp-1 mt-1 leading-tight uppercase tracking-wider">
            {t.title}
          </h3>
          
          <div className="grid grid-cols-2 gap-y-2 mt-4 text-[10px] sm:text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{t.startDate.split(',')[0]}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{t.startDate.split(',')[1] || "08:00 PM"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate uppercase">{t.map || "Bermuda"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{t.maxPlayers - t.registeredPlayersCount} Slots Left</span>
            </div>
          </div>
        </div>

        {/* Footer Slots Progress */}
        <div className="mt-5 border-t border-slate-800/60 pt-4 space-y-4">
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
              <span className="uppercase tracking-wider">Filled Status</span>
              <span className="font-mono">{t.registeredPlayersCount} / {t.maxPlayers}</span>
            </div>
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-rose-500" : "bg-indigo-500"}`}
                style={{ width: `${progressRatio}%` }}
              />
            </div>
          </div>

          {/* Pricing bento box */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-900 text-xs font-mono">
            <div className="text-center">
              <span className="text-[8px] text-slate-500 block uppercase font-bold font-sans">Prize Pool</span>
              <span className="font-bold text-amber-400 block mt-0.5 text-sm sm:text-base">₹{t.prizePool}</span>
            </div>
            <div className="text-center border-l border-slate-900">
              <span className="text-[8px] text-slate-500 block uppercase font-bold font-sans">Entry Fee</span>
              <span className="font-bold text-indigo-400 block mt-0.5 text-sm sm:text-base">
                {t.entryFee === 0 ? "FREE" : `₹${t.entryFee}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
