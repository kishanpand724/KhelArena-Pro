import React, { useState, useEffect } from "react";
import { Wallet, ArrowDownRight, ArrowUpLeft, AlertTriangle, CheckCircle, Clock, Copy, ArrowRightLeft, ShieldCheck, HelpCircle, Sparkles, Trophy, Shield } from "lucide-react";
import { 
  collection, 
  db, 
  doc,
  addDoc, 
  updateDoc,
  increment,
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType 
} from "../lib/firebase";
import { UserProfile, WalletTransaction, AppSettings } from "../types";

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

interface WalletHubProps {
  user: UserProfile;
  appSettings: AppSettings;
}

export default function WalletHub({ user, appSettings }: WalletHubProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "deposit" | "withdraw">("history");
  
  // Razorpay Config
  const [paymentConfig, setPaymentConfig] = useState({ configured: false, keyId: "" });

  useEffect(() => {
    fetch("/api/payment/config")
      .then((res) => res.json())
      .then((data) => setPaymentConfig(data))
      .catch((err) => console.error("Failed to load payment config:", err));
  }, []);

  const pendingWithdrawalTotal = transactions
    .filter((tx) => tx.type === "withdrawal" && tx.status === "pending")
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [paymentSenderName, setPaymentSenderName] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Deposit countdown timer states
  const [depositAmountEntered, setDepositAmountEntered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Countdown Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDepositWithRazorpay = async (amountToPay: number) => {
    setIsSubmittingDeposit(true);
    setDepositError("");
    setDepositSuccess(false);

    try {
      const isLoaded = await loadRazorpaySDK();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
      }

      // Create order on our backend
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToPay,
          receipt: `receipt_dep_${user.uid.substring(0, 5)}_${Date.now()}`
        })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to initiate payment");
      }

      const order = await orderRes.json();

      // Configure Razorpay options
      const options = {
        key: paymentConfig.keyId || "rzp_test_mock_keys",
        amount: order.amount,
        currency: "INR",
        name: "KhelArena Pro",
        description: `Deposit cash: ₹${amountToPay}`,
        order_id: order.id,
        prefill: {
          name: user.displayName || "Gamer",
          email: user.email || ""
        },
        theme: {
          color: "#4f46e5"
        },
        handler: async function (response: any) {
          try {
            setIsSubmittingDeposit(true);
            
            // Backend secure verify and automatic credit
            const verifyRes = await fetch("/api/payment/deposit-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                amount: amountToPay,
                isMock: order.isMock
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setDepositSuccess(true);
              setDepositAmount("");
              setDepositAmountEntered(false);
              setTimeout(() => {
                setActiveTab("history");
                setDepositSuccess(false);
              }, 3000);
            } else {
              setDepositError(verifyData.error || "Payment verification failed. Please contact support.");
            }
          } catch (e: any) {
            console.error("Verification error:", e);
            setDepositError(e.message || "Failed to verify transaction. Please contact support.");
          } finally {
            setIsSubmittingDeposit(false);
          }
        },
        modal: {
          ondismiss: function () {
            setDepositError("Payment checkout cancelled.");
            setIsSubmittingDeposit(false);
          }
        }
      };

      if (order.isMock) {
        // Automatically mock callback in mock mode
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

    } catch (err: any) {
      console.error(err);
      setDepositError(err.message || "Checkout failed. Please try again.");
      setIsSubmittingDeposit(false);
    }
  };

  const handleStartDepositPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");
    setDepositSuccess(false);
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Please enter a valid amount greater than zero.");
      return;
    }
    if (amount < 50) {
      setDepositError("Minimum deposit is ₹50.");
      return;
    }

    handleDepositWithRazorpay(amount);
  };

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpi, setWithdrawUpi] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Clipboard copies
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Fetch Transaction History
  useEffect(() => {
    const transactionsPath = `users/${user.uid}/transactions`;
    const q = query(
      collection(db, transactionsPath),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WalletTransaction[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as WalletTransaction);
        });
        setTransactions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, transactionsPath);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const copyUpiToClipboard = () => {
    navigator.clipboard.writeText(appSettings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");
    setDepositSuccess(false);

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Please enter a valid amount greater than zero.");
      return;
    }
    if (amount < 50) {
      setDepositError("Minimum deposit is ₹50.");
      return;
    }
    if (!paymentSenderName.trim()) {
      setDepositError("Please enter your name as registered in your payment/UPI app.");
      return;
    }

    setIsSubmittingDeposit(true);
    const transactionsPath = `users/${user.uid}/transactions`;
    const autoRef = "DEP-" + Math.floor(1000000000 + Math.random() * 9000000000);

    try {
      // 1. Add pending transaction history ledger for admin to approve
      await addDoc(collection(db, transactionsPath), {
        type: "deposit",
        amount,
        status: "pending",
        reference: autoRef,
        paymentSenderName: paymentSenderName.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Create info notification for user
      await addDoc(collection(db, `users/${user.uid}/notifications`), {
        title: "Deposit Request Submitted",
        message: `Your deposit request of ₹${amount} has been submitted for verification under sender name "${paymentSenderName.trim()}". Balance will be updated once approved by admin. Reference ID: ${autoRef}.`,
        read: false,
        type: "announcement",
        createdAt: serverTimestamp()
      });

      setDepositSuccess(true);
      setDepositAmount("");
      setDepositRef("");
      setPaymentSenderName("");
      setDepositAmountEntered(false);
      setTimerActive(false);
      // Transition back after short delay
      setTimeout(() => setActiveTab("history"), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, transactionsPath);
      setDepositError("Failed to submit deposit request. Please try again.");
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess(false);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Please enter a valid amount greater than zero.");
      return;
    }
    if (amount < 100) {
      setWithdrawError("Minimum withdrawal amount is ₹100.");
      return;
    }
    const winningBalance = user.winningBalance || 0;
    if (amount > winningBalance) {
      setWithdrawError(`Insufficient funds. Your withdrawable winning balance is ₹${winningBalance}.`);
      return;
    }
    if (!withdrawUpi.trim()) {
      setWithdrawError("Please provide a destination UPI ID.");
      return;
    }

    setIsSubmittingWithdraw(true);
    const transactionsPath = `users/${user.uid}/transactions`;

    try {
      await addDoc(collection(db, transactionsPath), {
        type: "withdrawal",
        amount,
        status: "pending",
        reference: withdrawUpi.trim(),
        createdAt: serverTimestamp()
      });

      setWithdrawSuccess(true);
      setWithdrawAmount("");
      setWithdrawUpi("");
      // Transition back after short delay
      setTimeout(() => setActiveTab("history"), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, transactionsPath);
      setWithdrawError("Failed to submit withdrawal request. Please try again.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Wallet Balance Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950/40 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl gaming-glow-indigo">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col justify-between items-stretch gap-6 z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-indigo-400 text-xs font-black tracking-widest uppercase flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Available Wallet Balance
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-4xl sm:text-5xl font-sans font-black text-white tracking-tight">
                  ₹{user.walletBalance.toLocaleString("en-IN")}
                </span>
                <span className="text-indigo-400 font-mono text-xs font-bold uppercase tracking-widest">INR</span>
              </div>
            </div>
            
            <div className="flex w-full sm:w-auto gap-3 shrink-0">
              <button
                onClick={() => { setActiveTab("deposit"); setDepositSuccess(false); setDepositError(""); }}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold transition shadow-lg shadow-indigo-500/15 cursor-pointer text-xs uppercase tracking-wider active:scale-95"
              >
                <ArrowDownRight className="h-4 w-4" />
                <span>Add Cash</span>
              </button>
              <button
                onClick={() => { setActiveTab("withdraw"); setWithdrawSuccess(false); setWithdrawError(""); }}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-extrabold transition cursor-pointer text-xs uppercase tracking-wider active:scale-95"
              >
                <ArrowUpLeft className="h-4 w-4" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>
          
          {/* Split balance tags */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2 border-t border-indigo-500/10 pt-6">
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Winning Balance</span>
              <span className="text-sm font-black text-emerald-400">₹{(user.winningBalance || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Withdrawable</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Deposit Balance</span>
              <span className="text-sm font-black text-indigo-400">₹{(user.depositBalance || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Playable Cash</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Bonus Balance</span>
              <span className="text-sm font-black text-purple-400">₹{(user.bonusBalance || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Not withdrawable</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Deposited</span>
              <span className="text-sm font-black text-slate-300">₹{(user.totalDeposited || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Lifetime added</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Withdrawn</span>
              <span className="text-sm font-black text-slate-300">₹{(user.totalWithdrawn || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Lifetime withdrawn</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Winnings</span>
              <span className="text-sm font-black text-amber-400">₹{(user.totalWinnings || 0).toLocaleString("en-IN")}</span>
              <span className="text-[8px] text-slate-500 block mt-0.5 font-semibold">Lifetime prize pool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-between items-center bg-slate-900/40 p-1 rounded-2xl border border-slate-800/80 max-w-lg mx-auto">
        {[
          { id: "history", label: "Ledger", icon: ArrowRightLeft },
          { id: "deposit", label: "Deposit Cash", icon: ArrowDownRight },
          { id: "withdraw", label: "Withdraw Cash", icon: ArrowUpLeft }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setDepositAmountEntered(false);
              setTimerActive(false);
              setDepositError("");
              setWithdrawError("");
            }}
            className={`flex-1 py-2.5 text-center rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content: History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
            <span>Transaction Ledger History</span>
          </h3>

          {transactions.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border-slate-800 text-slate-500">
              <Wallet className="h-14 w-14 text-slate-700 mx-auto mb-4 animate-pulse" />
              <p className="font-extrabold text-slate-300">No transaction records registered.</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Any deposits, entry deductions, or winner credits appear here.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-slate-900 border-slate-800/80 shadow-2xl">
              {transactions.map((tx) => {
                const isPositive = tx.type === "deposit" || tx.type === "prize_payout";
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition">
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl border ${
                        isPositive 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {tx.type === "deposit" && <ArrowDownRight className="h-4 w-4" />}
                        {tx.type === "withdrawal" && <ArrowUpLeft className="h-4 w-4" />}
                        {tx.type === "entry_fee" && <ArrowUpLeft className="h-4 w-4 text-rose-400" />}
                        {tx.type === "prize_payout" && <ArrowDownRight className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-200 uppercase tracking-wide">
                          {tx.type.replace("_", " ")}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono font-medium">
                          <span>Ref: {tx.reference}</span>
                          <span>•</span>
                          <span>
                            {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-black text-sm ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {isPositive ? "+" : "-"} ₹{tx.amount}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black mt-1.5 uppercase tracking-wider border ${
                        tx.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                        tx.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {tx.status === "pending" && <Clock className="h-2.5 w-2.5 mr-1 animate-spin" />}
                        {tx.status === "completed" && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                        {tx.status === "failed" && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Deposit */}
      {activeTab === "deposit" && (
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Enter Deposit Amount */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border-slate-800/80 max-w-lg mx-auto text-slate-300">
            <h3 className="text-base font-black text-white mb-2">Deposit Cash to Arena Wallet</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
              Add cash instantly via Razorpay to enter paid match lobbies and secure spots. Wallet balance is credited automatically.
            </p>

            <form onSubmit={handleStartDepositPayment} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Deposit Amount (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Minimum ₹50"
                    required
                    disabled={isSubmittingDeposit}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-slate-500 font-black uppercase tracking-wider">INR</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                  Minimum deposit of ₹50 required.
                </span>
              </div>

              {depositError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {depositSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-bold animate-pulse">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>Payment verified! ₹{parseFloat(depositAmount) || 0} credited automatically. Redirecting...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-3 rounded-xl transition shadow-lg shadow-indigo-500/15 flex items-center justify-center space-x-2 cursor-pointer text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmittingDeposit ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Processing Gateway...</span>
                  </>
                ) : (
                  <span>Deposit via Razorpay</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Withdraw */}
      {activeTab === "withdraw" && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border-slate-800/80 max-w-lg mx-auto text-slate-300">
          <h3 className="text-base font-black text-white mb-2">Request Cash Withdrawal</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium font-sans">
            Cash out winnings instantly to your personal UPI handle. Only winnings can be withdrawn.
          </p>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Withdrawal Amount (₹) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Minimum ₹100"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="absolute right-3 top-3 text-[10px] text-slate-500 font-black uppercase tracking-wider">INR</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block font-semibold flex justify-between">
                <span>Withdrawable Balance: <span className="font-bold text-emerald-400">₹{user.winningBalance || 0}</span></span>
                {pendingWithdrawalTotal > 0 && (
                  <span className="text-amber-500">Held in pending: ₹{pendingWithdrawalTotal}</span>
                )}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Destination UPI ID handle *
              </label>
              <input
                type="text"
                placeholder="e.g. ronaldo@ybl, paytm"
                required
                value={withdrawUpi}
                onChange={(e) => setWithdrawUpi(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>

            {withdrawError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-bold animate-pulse">
                <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                <span>Withdrawal submitted successfully! Settles soon.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingWithdraw}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-3 rounded-xl transition shadow-lg shadow-indigo-500/15 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider"
            >
              {isSubmittingWithdraw ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Processing Withdrawal Request...</span>
                </>
              ) : (
                <span>Request Secure Cashout</span>
              )}
            </button>
          </form>
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-6">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span>100% Safe</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed block text-center font-medium mt-2">
            Secure Payment Gateway by <strong className="text-slate-400">Razorpay</strong>
          </p>
        </div>
      )}
    </div>
  );
}
