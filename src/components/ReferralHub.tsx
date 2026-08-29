import React, { useState, useEffect } from "react";
import { Copy, Gift, Share2, Sparkles, Users, UserPlus, CheckCircle, Flame } from "lucide-react";
import { collection, db, doc, getDoc, onSnapshot, query, where } from "../lib/firebase";
import { UserProfile } from "../types";

interface ReferralHubProps {
  user: UserProfile;
}

export default function ReferralHub({ user }: ReferralHubProps) {
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load friends referred by checking the "referredBy" field in "users" collection
  useEffect(() => {
    if (!user || !user.referralCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("referredBy", "==", user.referralCode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        list.push({
          uid: docSnap.id,
          displayName: u.displayName || "Anonymous Gamer",
          photoURL: u.photoURL || "",
          createdAt: u.createdAt,
          rewardEarned: 50 // Standard bonus reward amount
        });
      });
      setReferredUsers(list);
      setLoading(false);
    }, (error) => {
      console.error("Referred users load error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.referralCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = `${window.location.origin}?ref=${user.referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-4xl mx-auto">
      {/* Left Column: Share Panel (7 columns) */}
      <div className="md:col-span-7 space-y-6">
        <div className="glass-panel rounded-3xl p-6 border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <span className="inline-flex items-center text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-4 animate-pulse">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Mega Cash Promo
          </span>
          
          <h3 className="text-xl font-black text-white leading-tight">
            Invite Friends, Get Free Lobbies!
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
            Share your custom referral code or invite link. When your friends sign up, they get an extra <strong className="text-emerald-400">₹50 Bonus balance</strong>, and you earn <strong className="text-emerald-400">₹50 Cash bonus</strong> once they register for their first tournament!
          </p>

          {/* Referral Code Showcase */}
          <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Your Referral Code</span>
              <span className="text-lg font-black text-white font-mono tracking-wider">{user.referralCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Shareable Link Box */}
          <div className="mt-4 p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">One-Click Invitation Link</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 overflow-x-auto select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2.5 rounded-xl border border-slate-700/80 transition cursor-pointer"
                title="Copy Link"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Milestone Card */}
        <div className="bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/20 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden text-slate-300">
          <div className="absolute top-2 right-2">
            <Gift className="h-12 w-12 text-indigo-500/20 rotate-12" />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="h-4.5 w-4.5 text-amber-500" />
            <span>Referral Leaderboards Challenge</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium mb-3">
            Refer 10 or more active squad members this week to enter the <strong className="text-white">₹5,000 Special Arena Pool</strong> giveaway automatically!
          </p>
          <div className="w-full bg-slate-950/60 rounded-full h-2.5 border border-slate-800/60 overflow-hidden mt-4">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((referredUsers.length / 10) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold font-mono mt-2">
            <span>{referredUsers.length} / 10 Referred</span>
            <span className="text-indigo-400 font-black uppercase">Progress Milestone</span>
          </div>
        </div>
      </div>

      {/* Right Column: referred list (5 columns) */}
      <div className="md:col-span-5 space-y-6">
        <div className="glass-panel rounded-3xl p-6 border-slate-800/80 h-full flex flex-col min-h-[380px]">
          <h3 className="text-base font-black text-white flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
            <Users className="h-5 w-5 text-purple-400" />
            <span>Referred Squad</span>
            {referredUsers.length > 0 && (
              <span className="ml-auto bg-slate-800 text-slate-300 font-mono text-[10px] font-black px-2 py-0.5 rounded-full">
                {referredUsers.length}
              </span>
            )}
          </h3>

          {loading ? (
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <div className="h-12 bg-slate-900/40 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-900/40 rounded-xl animate-pulse" />
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="text-center py-10 flex-1 flex flex-col justify-center items-center">
              <UserPlus className="h-10 w-10 text-slate-700 animate-bounce mb-2.5" />
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                No referrals logged yet.<br />Share your code above to expand your squad lobby!
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[320px] flex-1">
              {referredUsers.map((friend) => (
                <div
                  key={friend.uid}
                  className="bg-slate-950/30 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    {friend.photoURL ? (
                      <img
                        src={friend.photoURL}
                        alt={friend.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {friend.displayName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {friend.displayName}
                      </h4>
                      <span className="text-[8px] font-mono text-slate-500">
                        Joined: {friend.createdAt ? (friend.createdAt.toDate ? friend.createdAt.toDate().toLocaleDateString() : new Date(friend.createdAt).toLocaleDateString()) : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-emerald-400 font-black">+₹{friend.rewardEarned}</span>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Earned</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
