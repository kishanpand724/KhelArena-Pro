import React, { useState, useEffect } from "react";
import { Trophy, Award, Crown, Zap, Flame, User, ShieldAlert } from "lucide-react";
import { collection, db, query, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from "../lib/firebase";
import { UserProfile } from "../types";

interface LeaderboardTabProps {
  currentUser: UserProfile;
}

type Period = "daily" | "weekly" | "monthly" | "all-time";

export default function LeaderboardTab({ currentUser }: LeaderboardTabProps) {
  const [period, setPeriod] = useState<Period>("all-time");
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // In a real database, we would query the specific period's leaderboard collection or user fields
    // Here we query "users" ordered by walletBalance or statistics.totalEarnings
    const q = query(
      collection(db, "users"),
      orderBy("walletBalance", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Filter or modify values based on period to simulate changing statistics
        const sortedList = list.map((user, idx) => {
          // If statistics doesn't exist, create mock statistics for realistic gamified look
          const earningsBase = user.walletBalance + (user.statistics?.totalEarnings || 0);
          const mockStats = {
            matchesPlayed: user.statistics?.matchesPlayed || (25 + (idx % 5) * 12),
            wins: user.statistics?.wins || (5 + (idx % 3) * 4),
            kills: user.statistics?.kills || (84 + (idx % 4) * 32),
            winRate: user.statistics?.winRate || Math.round(((user.statistics?.wins || 5) / (user.statistics?.matchesPlayed || 25)) * 100),
            totalEarnings: user.statistics?.totalEarnings || earningsBase,
          };

          // Scale values slightly based on filter tab for active/dynamic feel
          let multiplier = 1;
          if (period === "daily") multiplier = 0.08;
          else if (period === "weekly") multiplier = 0.25;
          else if (period === "monthly") multiplier = 0.6;

          return {
            ...user,
            walletBalance: Math.round(user.walletBalance * multiplier),
            statistics: mockStats,
          };
        }).sort((a, b) => b.walletBalance - a.walletBalance);

        setLeaders(sortedList);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [period]);

  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex justify-between items-center bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 max-w-md mx-auto">
        {(["daily", "weekly", "monthly", "all-time"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              period === p
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-10">
          <div className="h-36 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
          <div className="h-44 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
          <div className="h-36 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800/40" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium Cards */}
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 max-w-2xl mx-auto pt-6">
            
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="w-full md:w-1/3 glass-panel rounded-3xl p-5 border-slate-800/80 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300 md:h-[220px]">
                <div className="absolute top-0 inset-x-0 h-[3px] bg-slate-400" />
                <div className="relative mb-3">
                  <div className="absolute -top-1 -right-1 bg-slate-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                    2
                  </div>
                  {topThree[1].photoURL ? (
                    <img
                      src={topThree[1].photoURL}
                      alt={topThree[1].displayName}
                      className="w-14 h-14 rounded-full border-2 border-slate-400 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400">
                      {topThree[1].displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-slate-200 line-clamp-1 break-all px-2">
                  {topThree[1].displayName}
                </h4>
                <p className="text-[10px] font-mono text-indigo-400 font-bold mt-1">
                  ₹{topThree[1].walletBalance.toLocaleString("en-IN")}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-bold font-mono">
                  <span>Wins: {topThree[1].statistics?.wins}</span>
                  <span>•</span>
                  <span>Kills: {topThree[1].statistics?.kills}</span>
                </div>
              </div>
            )}

            {/* 1st Place Champion Podium */}
            {topThree[0] && (
              <div className="w-full md:w-1/3 bg-gradient-to-b from-indigo-950/40 via-slate-900/50 to-purple-950/30 rounded-3xl p-6 border border-yellow-500/30 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-yellow-500/50 transition-all duration-300 md:h-[250px] shadow-2xl gaming-glow-indigo">
                <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />
                <div className="absolute top-2 right-2">
                  <Crown className="h-5 w-5 text-yellow-400 animate-bounce" />
                </div>
                <div className="relative mb-3">
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                    1
                  </div>
                  {topThree[0].photoURL ? (
                    <img
                      src={topThree[0].photoURL}
                      alt={topThree[0].displayName}
                      className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover shadow-lg shadow-yellow-500/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-yellow-400">
                      {topThree[0].displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4 className="text-base font-black text-white line-clamp-1 break-all px-2">
                  {topThree[0].displayName}
                </h4>
                <p className="text-xs font-mono text-yellow-400 font-black mt-1">
                  ₹{topThree[0].walletBalance.toLocaleString("en-IN")}
                </p>
                <div className="mt-3 flex items-center gap-2.5 text-[10px] text-yellow-500/80 font-bold font-mono bg-yellow-500/5 border border-yellow-500/10 px-2.5 py-1 rounded-lg">
                  <span>Wins: {topThree[0].statistics?.wins}</span>
                  <span>•</span>
                  <span>Kills: {topThree[0].statistics?.kills}</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="w-full md:w-1/3 glass-panel rounded-3xl p-5 border-slate-800/80 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300 md:h-[200px]">
                <div className="absolute top-0 inset-x-0 h-[3px] bg-orange-600" />
                <div className="relative mb-3">
                  <div className="absolute -top-1 -right-1 bg-orange-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                    3
                  </div>
                  {topThree[2].photoURL ? (
                    <img
                      src={topThree[2].photoURL}
                      alt={topThree[2].displayName}
                      className="w-14 h-14 rounded-full border-2 border-orange-600 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400">
                      {topThree[2].displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-slate-200 line-clamp-1 break-all px-2">
                  {topThree[2].displayName}
                </h4>
                <p className="text-[10px] font-mono text-indigo-400 font-bold mt-1">
                  ₹{topThree[2].walletBalance.toLocaleString("en-IN")}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-bold font-mono">
                  <span>Wins: {topThree[2].statistics?.wins}</span>
                  <span>•</span>
                  <span>Kills: {topThree[2].statistics?.kills}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table List */}
          <div className="max-w-2xl mx-auto glass-panel rounded-3xl border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex justify-between items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Arena Placement rankings
              </span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">
                Active Participants
              </span>
            </div>

            <div className="divide-y divide-slate-800/40">
              {remainingLeaders.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Join matches and earn coins to climb the ranks!
                </div>
              ) : (
                remainingLeaders.map((item, idx) => {
                  const isSelf = item.uid === currentUser.uid;
                  return (
                    <div
                      key={item.uid}
                      className={`flex items-center justify-between p-4 transition-all duration-150 ${
                        isSelf
                          ? "bg-indigo-600/10 border-y border-indigo-500/20"
                          : "hover:bg-slate-900/20"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className="font-mono text-slate-500 font-black text-xs w-6 text-center">
                          #{idx + 4}
                        </span>

                        <div className="relative">
                          {item.photoURL ? (
                            <img
                              src={item.photoURL}
                              alt={item.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                              {item.displayName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          {isSelf && (
                            <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] px-1.5 rounded-full font-black uppercase tracking-wider text-white ring-2 ring-slate-950">
                              You
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-extrabold text-slate-200 block">
                            {item.displayName}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            Win Rate: {item.statistics?.winRate || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-slate-300">
                          ₹{item.walletBalance.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold font-sans">
                          {item.statistics?.kills || 0} Kills
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
