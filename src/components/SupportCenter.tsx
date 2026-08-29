import React, { useState, useEffect } from "react";
import { HelpCircle, Mail, MessageSquare, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Send, Loader2, Sparkles, Phone, MessageCircle, FileText, Shield, RotateCcw, ArrowLeft, ExternalLink, ChevronRight } from "lucide-react";
import { collection, db, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, handleFirestoreError, OperationType } from "../lib/firebase";
import { UserProfile, SupportTicket } from "../types";

interface SupportCenterProps {
  user: UserProfile;
  setView?: (view: string) => void;
}

const defaultFAQs = [
  {
    question: "How do I register for a tournament?",
    answer: "Go to the Tournaments tab, browse the active list of lobbies, and click on any tournament details card. Enter your precise in-game nickname and complete the payment using your Wallet balance or manual UPI transfer. Your slot is guaranteed once verified."
  },
  {
    question: "How does the wallet system work?",
    answer: "Your wallet consists of multiple balances: Deposit balance (credited when you add funds), Winning balance (prizes from tournaments, withdrawable), and Bonus balance (credited from promotions, can be used for tournament entries). Withdrawals are processed within 24 hours."
  },
  {
    question: "When are Room IDs and Passwords released?",
    answer: "Room IDs and passwords are released exactly 15 minutes before the match start time. You can view them on the details modal of the tournament you registered for. We also send an automatic push notification."
  },
  {
    question: "How do I claim my tournament winnings?",
    answer: "As soon as a tournament finishes, the SuperAdmin declares the winners. Winnings are automatically calculated and credited to your withdrawable wallet balance instantly. You can check the transaction statement in your Wallet hub."
  },
  {
    question: "What happens if a tournament gets cancelled?",
    answer: "If a tournament is cancelled by the admin, full automatic refunds are initiated instantly. The entry fee is credited back to your wallet balance within seconds."
  }
];

export default function SupportCenter({ user, setView }: SupportCenterProps) {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  
  // Ticket list & messaging
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const ticket = { id: docSnap.id, ...docSnap.data() } as SupportTicket;
        if (ticket.userId === user.uid) {
          list.push(ticket);
        }
      });
      setTickets(list);

      if (selectedTicket) {
        const updatedSelected = list.find((t) => t.id === selectedTicket.id);
        if (updatedSelected) {
          setSelectedTicket(updatedSelected);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "SupportCenter:onSnapshot");
    });

    return () => unsubscribe();
  }, [user.uid, selectedTicket?.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");
    setStatusMsg("");

    try {
      const ticketRef = doc(collection(db, "support_tickets"));
      const newTicket: SupportTicket = {
        id: ticketRef.id,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        subject: ticketSubject.trim(),
        status: "open",
        messages: [
          {
            sender: "user",
            text: ticketMessage.trim(),
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(ticketRef, newTicket);

      setTicketSubject("");
      setTicketMessage("");
      setStatusMsg("Support ticket raised successfully! Our admins will respond shortly.");
      setTimeout(() => setStatusMsg(""), 5000);
      setActiveDetail("inbox"); // Switch to inbox after raising
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "SupportCenter:handleCreateTicket");
      setErrorMsg("Failed to create ticket: " + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !chatMessage.trim()) return;

    const updatedMessages = [
      ...selectedTicket.messages,
      {
        sender: "user" as const,
        text: chatMessage.trim(),
        createdAt: new Date().toISOString()
      }
    ];

    try {
      const ticketRef = doc(db, "support_tickets", selectedTicket.id);
      await setDoc(ticketRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setChatMessage("");
    } catch (err) {
      console.error("Failed to append message:", err);
    }
  };

  const supportOptions = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", value: "+91 9112379133", link: "https://wa.me/919112379133" },
    { id: "call", label: "Call Support", icon: Phone, color: "text-amber-400", bg: "bg-amber-500/10", value: "+91 9112379133", link: "tel:+919112379133" },
    { id: "telegram", label: "Telegram", icon: Send, color: "text-sky-400", bg: "bg-sky-500/10", value: "Official Channel", link: "https://t.me/+919112379133" },
    { id: "email", label: "Email Us", icon: Mail, color: "text-indigo-400", bg: "bg-indigo-500/10", value: "kishanpande724@gmail.com", link: "mailto:kishanpande724@gmail.com" },
    { id: "faq", label: "FAQ", icon: HelpCircle, color: "text-purple-400", bg: "bg-purple-500/10", value: "Frequently Asked Questions" },
    { id: "inbox", label: "Support Inbox", icon: MessageSquare, color: "text-rose-400", bg: "bg-rose-500/10", value: tickets.length > 0 ? `${tickets.length} Tickets Found` : "Raise or View Tickets" },
    { id: "privacy", label: "Privacy Policy", icon: Shield, color: "text-slate-400", bg: "bg-slate-500/10", value: "Read our privacy policy", view: "privacy-policy" },
    { id: "terms", label: "Terms & Conditions", icon: FileText, color: "text-slate-400", bg: "bg-slate-500/10", value: "Read our terms of service", view: "terms-conditions" },
    { id: "refund", label: "Refund Policy", icon: RotateCcw, color: "text-slate-400", bg: "bg-slate-500/10", value: "Read our refund policy", view: "refund-policy" },
  ];

  if (activeDetail) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        <button
          onClick={() => setActiveDetail(null)}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest cursor-pointer group mb-6"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Support</span>
        </button>

        {activeDetail === "faq" && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border-slate-800/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
              <HelpCircle className="h-6 w-6 text-purple-400" />
              <span>Frequently Asked Questions</span>
            </h2>
            <div className="space-y-4">
              {defaultFAQs.map((faq, idx) => (
                <div key={idx} className="border-b border-slate-800 pb-4 last:border-b-0 last:pb-0">
                  <button
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    className="w-full flex justify-between items-center text-left py-2 font-bold text-slate-200 hover:text-indigo-400 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {openFaqIdx === idx ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {openFaqIdx === idx && (
                    <p className="text-sm text-slate-400 leading-relaxed mt-2 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeDetail === "inbox" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Raise Ticket Form */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border-slate-800/80">
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                <span>Raise Support Ticket</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">Need help with payments or room issues?</p>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <textarea
                  required
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Send Ticket"}
                </button>
              </form>
            </div>

            {/* Support Inbox */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border-slate-800/80 min-h-[400px] flex flex-col">
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Mail className="h-5 w-5 text-indigo-400" />
                <span>Inbox</span>
              </h3>
              {selectedTicket ? (
                <div className="flex flex-col h-full">
                  <button onClick={() => setSelectedTicket(null)} className="text-[10px] text-indigo-400 font-black uppercase mb-3">← Back to List</button>
                  <div className="flex-1 space-y-3 overflow-y-auto mb-4 p-2 bg-slate-950/40 rounded-xl">
                    {selectedTicket.messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.sender === "admin" ? "items-start" : "items-end"}`}>
                        <div className={`p-3 rounded-2xl text-xs max-w-[90%] ${msg.sender === "admin" ? "bg-slate-800 text-slate-200 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Reply..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                    <button type="submit" className="bg-indigo-600 p-2 rounded-xl text-white"><Send className="h-4 w-4" /></button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto">
                  {tickets.length === 0 ? (
                    <p className="text-center text-slate-500 text-xs py-10">No active tickets.</p>
                  ) : (
                    tickets.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-slate-950/20 group transition"
                      >
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400">{t.subject}</h4>
                        <span className="text-[9px] text-slate-500 uppercase">{t.status}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(activeDetail === "whatsapp" || activeDetail === "call" || activeDetail === "telegram" || activeDetail === "email") && (
          <div className="glass-panel rounded-3xl p-10 border-slate-800/80 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            {(() => {
              const opt = supportOptions.find(o => o.id === activeDetail);
              if (!opt) return null;
              return (
                <>
                  <div className={`p-6 ${opt.bg} rounded-3xl w-fit mx-auto mb-6`}>
                    <opt.icon className={`h-12 w-12 ${opt.color}`} />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">{opt.label}</h2>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto font-medium">Get in touch with our dedicated tournament support agents directly on {opt.label}.</p>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl mb-8 flex items-center justify-between group">
                    <span className="text-lg font-mono font-bold text-indigo-400">{opt.value}</span>
                    <a href={opt.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 transition">
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                  <a
                    href={opt.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest hover:scale-105 transition active:scale-95 shadow-xl shadow-indigo-500/20"
                  >
                    <span>Connect Now</span>
                    <opt.icon className="h-5 w-5" />
                  </a>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Support Center</h1>
        <p className="text-slate-400 max-w-2xl mx-auto font-medium">
          Choose a support channel below for 24/7 tournament assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {supportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              if (opt.view && setView) {
                setView(opt.view);
              } else {
                setActiveDetail(opt.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="glass-panel border-slate-800 p-6 rounded-3xl text-left group hover:border-indigo-500/40 transition duration-300 relative overflow-hidden cursor-pointer flex flex-col justify-between min-h-[160px]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <opt.icon className={`h-24 w-24 ${opt.color}`} />
            </div>
            <div>
              <div className={`p-3 ${opt.bg} border border-slate-800 group-hover:border-indigo-500/30 rounded-2xl w-fit mb-4 transition-colors`}>
                <opt.icon className={`h-6 w-6 ${opt.color}`} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">{opt.label}</h3>
              <p className="text-xs text-slate-500 font-medium line-clamp-2">{opt.value}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-4">
              <span>Open Details</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Safety Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-8 border-t border-slate-900">
        <div className="flex items-center gap-2 text-slate-500 grayscale opacity-50">
          <Shield className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">SSL Secured</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 grayscale opacity-50">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Verified Support</span>
        </div>
      </div>
    </div>
  );
}


