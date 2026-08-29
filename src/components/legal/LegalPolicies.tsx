import React from "react";
import { ArrowLeft } from "lucide-react";

interface PolicyProps {
  setView?: (view: string) => void;
}

export const PrivacyPolicy = ({ setView }: PolicyProps) => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-slate-300 animate-fade-in">
    {setView && (
      <button 
        onClick={() => setView("tournaments")}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group transition-all"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Arena</span>
      </button>
    )}
    <div className="border-b border-slate-800 pb-8">
      <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Privacy Policy</h1>
      <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Last Updated: July 09, 2026</p>
    </div>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">1. Information We Collect</h2>
      <p className="text-sm leading-relaxed">
        KhelArena collects information to provide better services to all our users. We collect information in the following ways:
      </p>
      <ul className="text-sm list-disc list-inside space-y-2 ml-4">
        <li>Information you give us (e.g., name, email address, phone number).</li>
        <li>Information we get from your use of our services (e.g., device information, log information, location information).</li>
        <li>Payment information processed securely via Razorpay. We do not store your credit card or bank details on our servers.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">2. How We Use Information</h2>
      <p className="text-sm leading-relaxed">
        We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect KhelArena and our users.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">3. Information Security</h2>
      <p className="text-sm leading-relaxed">
        We work hard to protect KhelArena and our users from unauthorized access to or unauthorized alteration, disclosure or destruction of information we hold. In particular:
      </p>
      <ul className="text-sm list-disc list-inside space-y-2 ml-4">
        <li>We encrypt many of our services using SSL.</li>
        <li>We review our information collection, storage and processing practices, including physical security measures, to guard against unauthorized access to systems.</li>
      </ul>
    </section>
  </div>
);

export const TermsAndConditions = ({ setView }: PolicyProps) => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-slate-300 animate-fade-in">
    {setView && (
      <button 
        onClick={() => setView("tournaments")}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group transition-all"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Arena</span>
      </button>
    )}
    <div className="border-b border-slate-800 pb-8">
      <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Terms & Conditions</h1>
      <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Last Updated: July 09, 2026</p>
    </div>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">1. Acceptance of Terms</h2>
      <p className="text-sm leading-relaxed">
        By accessing or using KhelArena, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">2. Use License</h2>
      <p className="text-sm leading-relaxed">
        Permission is granted to temporarily download one copy of the materials (information or software) on KhelArena's website for personal, non-commercial transitory viewing only.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">3. Tournament Rules</h2>
      <p className="text-sm leading-relaxed">
        Players must adhere to the specific rules set for each tournament. Any form of cheating, hacking, or unsportsmanlike conduct will result in immediate disqualification and a permanent ban from the platform without refund.
      </p>
    </section>
  </div>
);

export const RefundPolicy = ({ setView }: PolicyProps) => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-slate-300 animate-fade-in">
    {setView && (
      <button 
        onClick={() => setView("tournaments")}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group transition-all"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Arena</span>
      </button>
    )}
    <div className="border-b border-slate-800 pb-8">
      <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Refund & Cancellation Policy</h1>
      <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Last Updated: July 09, 2026</p>
    </div>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">1. Tournament Entry Fees</h2>
      <p className="text-sm leading-relaxed">
        Tournament entry fees are generally non-refundable once a player has successfully registered and the tournament has reached its minimum player requirement.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">2. Cancellation by KhelArena</h2>
      <p className="text-sm leading-relaxed">
        In the event that KhelArena cancels a tournament for any reason (e.g., technical issues, insufficient participants), the entry fee will be fully refunded to the player's wallet balance within 24 hours.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">3. Processing Refunds</h2>
      <p className="text-sm leading-relaxed">
        All approved refunds will be credited back to the original payment source or the player's KhelArena wallet, as determined by the administration. Processing may take 5-7 business days depending on the banking partner.
      </p>
    </section>
  </div>
);
