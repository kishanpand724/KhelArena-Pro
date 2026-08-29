import React from "react";
import { Home, Trophy, Wallet, Users, MessageSquare } from "lucide-react";

interface BottomNavProps {
  currentView: string;
  setView: (view: string) => void;
}

export default function BottomNav({ currentView, setView }: BottomNavProps) {
  const tabs = [
    { id: "tournaments", label: "Home", icon: Home },
    { id: "my-registrations", label: "Matches", icon: Trophy },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "referral", label: "Referral", icon: Users },
    { id: "support", label: "Support", icon: MessageSquare },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900 z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setView(tab.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center space-y-1 w-full transition-all duration-200 active:scale-90 ${
                isActive ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-indigo-500/10" : ""}`}>
                <Icon className={`h-5 w-5 ${isActive ? "animate-pulse" : ""}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
