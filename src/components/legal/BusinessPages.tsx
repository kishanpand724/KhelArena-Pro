import React from "react";
import { Mail, Phone, MapPin, Clock, MessageSquare, ArrowLeft } from "lucide-react";

interface BusinessPageProps {
  setView?: (view: string) => void;
}

export const AboutUs = ({ setView }: BusinessPageProps) => (
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
    {setView && (
      <button 
        onClick={() => setView("tournaments")}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group transition-all"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Arena</span>
      </button>
    )}
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">About KhelArena</h1>
      <p className="text-slate-400 max-w-2xl mx-auto">
        KhelArena is India's premier online Free Fire tournament management system, dedicated to providing a professional platform for competitive gamers.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-3">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Our Mission</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          To empower gamers by providing a structured, secure, and transparent environment to showcase their skills, compete at the highest level, and win exciting rewards.
        </p>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-3">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Platform Features</h3>
        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
          <li>Daily Free Fire Tournaments</li>
          <li>Instant Prize Withdrawals</li>
          <li>Real-time Leaderboards</li>
          <li>Secure Payment Gateway via Razorpay</li>
          <li>24/7 Dedicated Support</li>
        </ul>
      </div>
    </div>

    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-3xl text-center space-y-4">
      <h3 className="text-xl font-bold text-white">Trusted & Secure</h3>
      <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
        We prioritize user security and fair play. Our platform utilizes advanced anti-cheat measures and secure payment processing to ensure a premium gaming experience for all our players.
      </p>
    </div>
  </div>
);

export const ContactUs = ({ setView }: BusinessPageProps) => (
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
    {setView && (
      <button 
        onClick={() => setView("tournaments")}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group transition-all"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Arena</span>
      </button>
    )}
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Contact Us</h1>
      <p className="text-slate-400">Get in touch with our support team for any queries or assistance.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Business Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Office Address</p>
                <p className="text-sm text-slate-400 mt-1">123, Esports Plaza, HSR Layout, Bengaluru, Karnataka - 560102</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Contact Number</p>
                <p className="text-sm text-slate-400 mt-1">+91 98765 43210</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">WhatsApp Support</p>
                <p className="text-sm text-slate-400 mt-1">+91 98765 43211</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Email Support</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">General Inquiries</p>
                <p className="text-sm text-slate-400 mt-1">info@khelarena.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Technical Support</p>
                <p className="text-sm text-slate-400 mt-1">support@khelarena.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <Clock className="h-6 w-6 text-indigo-500" />
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Support Hours</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Monday - Friday</span>
            <span className="text-slate-200 font-bold">10:00 AM - 08:00 PM</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Saturday</span>
            <span className="text-slate-200 font-bold">10:00 AM - 04:00 PM</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Sunday</span>
            <span className="text-rose-400 font-bold">Closed</span>
          </div>
        </div>
        <div className="pt-6">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed text-center">
            Expect a response within 2-4 hours during business hours.
          </p>
        </div>
      </div>
    </div>
  </div>
);
