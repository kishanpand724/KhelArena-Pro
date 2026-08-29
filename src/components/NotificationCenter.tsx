import React, { useState, useEffect } from "react";
import { Bell, Key, CheckCircle, Trophy, Trash2, CheckSquare, Eye, MailOpen } from "lucide-react";
import { 
  collection, 
  db, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  handleFirestoreError,
  OperationType
} from "../lib/firebase";
import { UserProfile, UserNotification } from "../types";

interface NotificationCenterProps {
  user: UserProfile;
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    const notificationsPath = `users/${user.uid}/notifications`;
    const q = query(
      collection(db, notificationsPath),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserNotification[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as UserNotification);
        });
        setNotifications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, notificationsPath);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const markAsRead = async (id: string) => {
    const path = `users/${user.uid}/notifications/${id}`;
    try {
      await updateDoc(doc(db, path), { read: true });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    const path = `users/${user.uid}/notifications/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      const path = `users/${user.uid}/notifications/${n.id}`;
      try {
        await updateDoc(doc(db, path), { read: true });
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    }
  };

  return (
    <div id="notification-center-container" className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white flex items-center space-x-2.5">
          <Bell className="h-6 w-6 text-indigo-400" />
          <span>Notifications & Alerts</span>
        </h2>
        {notifications.filter(n => !n.read).length > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={markAllAsRead}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center text-slate-500 shadow-xl">
          <Bell className="h-16 w-16 text-slate-700 mx-auto mb-4 animate-bounce" />
          <p className="font-bold text-slate-300">Your inbox is empty.</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Updates regarding your room IDs, payments, and prizes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`border rounded-2xl p-4 flex items-start justify-between gap-4 transition duration-200 ${
                n.read 
                  ? "bg-slate-950/40 border-slate-900 text-slate-400" 
                  : "bg-slate-900 border-indigo-500/20 text-slate-100 shadow-lg shadow-indigo-500/[0.02]"
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl mt-0.5 border ${
                  n.type === "room_details" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                  n.type === "payment_verified" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  n.type === "prize" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {n.type === "room_details" && <Key className="h-4.5 w-4.5 animate-bounce" />}
                  {n.type === "payment_verified" && <CheckCircle className="h-4.5 w-4.5" />}
                  {n.type === "prize" && <Trophy className="h-4.5 w-4.5" />}
                  {n.type === "announcement" && <Bell className="h-4.5 w-4.5" />}
                </div>

                <div>
                  <div className="flex items-baseline space-x-2">
                    <h4 className="font-bold text-sm text-white">{n.title}</h4>
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block font-mono font-medium">
                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {!n.read && (
                  <button
                    id={`mark-read-btn-${n.id}`}
                    onClick={() => markAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    title="Mark as Read"
                  >
                    <MailOpen className="h-4.5 w-4.5" />
                  </button>
                )}
                <button
                  id={`delete-notif-btn-${n.id}`}
                  onClick={() => deleteNotification(n.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Delete Notification"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
