import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Gamepad2, 
  Calendar, 
  Users, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Check, 
  X, 
  Bell, 
  TrendingUp, 
  UserPlus, 
  UserCheck, 
  ShieldAlert,
  Sliders,
  Wallet,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Copy,
  ShieldCheck,
  CheckSquare
} from "lucide-react";
import { 
  collection, 
  db, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDocs,
  onSnapshot, 
  query, 
  orderBy, 
  increment, 
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  auth
} from "../lib/firebase";
import { Tournament, Registration, UserProfile, WalletTransaction, AppSettings, AdminUpdate } from "../types";

interface AdminPanelProps {
  adminUser: UserProfile;
  appSettings: AppSettings;
  onCloseAdmin: () => void;
}

export default function AdminPanel({ adminUser, appSettings, onCloseAdmin }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"tournaments" | "pending-slots" | "pending-deposits" | "pending-withdrawals" | "wallets" | "settings" | "registrations">("tournaments");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Tournaments lists
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Selected tournament for registrations
  const [selectedRegTournament, setSelectedRegTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // Selected user for wallet management
  const [selectedWalletUser, setSelectedWalletUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);

  // Form State: Create/Edit Tournament
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [tournamentFormId, setTournamentFormId] = useState("");
  const [tournamentTitle, setTournamentTitle] = useState("");
  const [tournamentDesc, setTournamentDesc] = useState("");
  const [tournamentGame, setTournamentGame] = useState("PUBG Mobile");
  const [tournamentGameMode, setTournamentGameMode] = useState("Clash Squad 1v1");
  const [tournamentPrizeDesc, setTournamentPrizeDesc] = useState("");
  const [tournamentFee, setTournamentFee] = useState("");
  const [tournamentPrize, setTournamentPrize] = useState("");
  const [tournamentMaxPlayers, setTournamentMaxPlayers] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentBannerUrl, setTournamentBannerUrl] = useState("");
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  // Form State: Release Room ID
  const [selectedRoomTournament, setSelectedRoomTournament] = useState<Tournament | null>(null);
  const [roomID, setRoomID] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isReleasingKeys, setIsReleasingKeys] = useState(false);

  // Form State: Declare Winners
  interface WinnerRow {
    userId: string;
    username: string;
    rank: string;
    amount: number;
  }
  const [selectedWinnersTournament, setSelectedWinnersTournament] = useState<Tournament | null>(null);
  const [winnersList, setWinnersList] = useState<string[]>([]); // chosen gamertags / displayNames
  const [winnerRows, setWinnerRows] = useState<WinnerRow[]>([
    { userId: "", username: "", rank: "1st Player", amount: 0 }
  ]);
  const [verifiedRegs, setVerifiedRegs] = useState<Registration[]>([]);
  const [isDeclaringWinners, setIsDeclaringWinners] = useState(false);

  // Form State: Settings
  const [settingsUpi, setSettingsUpi] = useState(appSettings.upiId);
  const [settingsQrUrl, setSettingsQrUrl] = useState(appSettings.qrCodeUrl);
  const [settingsRazorpayId, setSettingsRazorpayId] = useState(appSettings.razorpayId || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Custom states for iframe compatibility and visual elegance
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  useEffect(() => {
    setSettingsUpi(appSettings.upiId || "");
    setSettingsQrUrl(appSettings.qrCodeUrl || "");
    setSettingsRazorpayId(appSettings.razorpayId || "");
  }, [appSettings]);

  // Form State: Balance Adjustment
  const [balanceAdjAmount, setBalanceAdjAmount] = useState("");
  const [balanceAdjType, setBalanceAdjType] = useState<"credit" | "debit">("credit");
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);

  // Master consolidated real-time states for "see every data in admin"
  const [allRegistrations, setAllRegistrations] = useState<(Registration & { tournamentTitle: string, tournamentId: string, tournamentFee: number })[]>([]);
  const [allTransactions, setAllTransactions] = useState<(WalletTransaction & { userDisplayName: string, userEmail: string, userId: string })[]>([]);
  const [registrationViewMode, setRegistrationViewMode] = useState<"consolidated" | "by-tournament">("consolidated");
  const [walletViewMode, setWalletViewMode] = useState<"consolidated" | "by-user">("consolidated");

  const [regSearch, setRegSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState<"all" | "pending" | "verified" | "failed">("all");

  const [walletSearch, setWalletSearch] = useState("");
  const [walletTxTypeFilter, setWalletTxTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [walletStatusFilter, setWalletStatusFilter] = useState<"all" | "pending" | "completed" | "failed">("all");

  // States for Slots & Registrations Tab
  const [selectedSlotTournament, setSelectedSlotTournament] = useState<Tournament | null>(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState("");
  const [slotUserSearchQuery, setSlotUserSearchQuery] = useState("");
  const [addRegUserId, setAddRegUserId] = useState("");
  const [addRegGameUsername, setAddRegGameUsername] = useState("");
  const [addRegPaymentStatus, setAddRegPaymentStatus] = useState<"verified" | "pending" | "failed">("verified");
  const [addRegTransactionId, setAddRegTransactionId] = useState("");
  const [addRegPaymentMethod, setAddRegPaymentMethod] = useState<"wallet" | "upi" | "razorpay">("wallet");
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editRegGameUsername, setEditRegGameUsername] = useState("");
  const [editRegPaymentStatus, setEditRegPaymentStatus] = useState<"verified" | "pending" | "failed">("verified");
  const [editRegTransactionId, setEditRegTransactionId] = useState("");

  // Presets banners
  const bannerPresets = [
    { name: "Cyber Esport", url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" },
    { name: "Retro Console", url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800" },
    { name: "Gaming Rig", url: "https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?auto=format&fit=crop&q=80&w=800" }
  ];

  // Load Tournaments & Users
  useEffect(() => {
    const unsubTournaments = onSnapshot(
      query(collection(db, "tournaments"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Tournament);
        });
        setTournaments(list);
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setUsers(list);
      }
    );

    return () => {
      unsubTournaments();
      unsubUsers();
    };
  }, []);

  // Real-time listener for ALL registrations across ALL tournaments
  useEffect(() => {
    if (tournaments.length > 0) {
      const unsubscribes = tournaments.map((t) => {
        const regPath = `tournaments/${t.id}/registrations`;
        return onSnapshot(
          query(collection(db, regPath), orderBy("createdAt", "desc")),
          (snapshot) => {
            setAllRegistrations((prev) => {
              const otherRegs = prev.filter((r) => r.tournamentId !== t.id);
              const tournamentRegs: any[] = [];
              snapshot.forEach((docSnap) => {
                tournamentRegs.push({
                  id: docSnap.id,
                  tournamentId: t.id,
                  tournamentTitle: t.title,
                  tournamentFee: t.entryFee,
                  ...docSnap.data()
                });
              });
              return [...otherRegs, ...tournamentRegs];
            });
          }
        );
      });
      return () => unsubscribes.forEach((unsub) => unsub());
    }
  }, [tournaments]);

  // Real-time listener for ALL transactions across ALL users
  useEffect(() => {
    if (users.length > 0) {
      const unsubscribes = users.map((u) => {
        const txPath = `users/${u.uid}/transactions`;
        return onSnapshot(
          query(collection(db, txPath), orderBy("createdAt", "desc")),
          (snapshot) => {
            setAllTransactions((prev) => {
              const otherTxs = prev.filter((tx) => tx.userId !== u.uid);
              const userTxs: any[] = [];
              snapshot.forEach((docSnap) => {
                userTxs.push({
                  id: docSnap.id,
                  userId: u.uid,
                  userDisplayName: u.displayName,
                  userEmail: u.email,
                  ...docSnap.data()
                });
              });
              return [...otherTxs, ...userTxs];
            });
          }
        );
      });
      return () => unsubscribes.forEach((unsub) => unsub());
    }
  }, [users]);

  // Fetch registrations when selected tournament changes
  useEffect(() => {
    if (selectedRegTournament) {
      const regPath = `tournaments/${selectedRegTournament.id}/registrations`;
      const unsubReg = onSnapshot(
        query(collection(db, regPath), orderBy("createdAt", "desc")),
        (snapshot) => {
          const list: Registration[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Registration);
          });
          setRegistrations(list);
        }
      );
      return () => unsubReg();
    } else {
      setRegistrations([]);
    }
  }, [selectedRegTournament]);

  // Fetch selected user transactions
  useEffect(() => {
    if (selectedWalletUser) {
      const txPath = `users/${selectedWalletUser.uid}/transactions`;
      const unsubTx = onSnapshot(
        query(collection(db, txPath), orderBy("createdAt", "desc")),
        (snapshot) => {
          const list: WalletTransaction[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as WalletTransaction);
          });
          setUserTransactions(list);
        }
      );
      return () => unsubTx();
    } else {
      setUserTransactions([]);
    }
  }, [selectedWalletUser]);

  // Helper to send a notification to a specific user
  const sendUserNotification = async (userId: string, title: string, message: string, type: 'room_details' | 'payment_verified' | 'announcement' | 'prize') => {
    const notifPath = `users/${userId}/notifications`;
    try {
      await addDoc(collection(db, notifPath), {
        title,
        message,
        read: false,
        type,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, notifPath);
    }
  };

  // Helper to log administrative updates app-wide
  const logAdminUpdate = async (type: AdminUpdate['type'], title: string, message: string) => {
    try {
      await addDoc(collection(db, "updates"), {
        adminEmail: adminUser.email,
        type,
        title,
        message,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "updates");
    }
  };

  // Create/Edit Tournament Submit
  const handleTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentTitle.trim() || !tournamentGame.trim()) return;

    const entryFee = parseFloat(tournamentFee) || 0;
    const prizePool = parseFloat(tournamentPrize) || 0;
    const maxPlayers = parseInt(tournamentMaxPlayers) || 100;

    const data: Partial<Tournament> = {
      title: tournamentTitle.trim(),
      description: tournamentDesc.trim(),
      gameName: tournamentGame.trim(),
      gameMode: tournamentGame === "Free Fire" ? tournamentGameMode : "",
      prizeDistributionDesc: tournamentPrizeDesc.trim(),
      entryFee,
      prizePool,
      maxPlayers,
      startDate: tournamentDate.trim() || "TBD",
      bannerUrl: tournamentBannerUrl.trim(),
      upiId: appSettings.upiId,
      qrCodeUrl: appSettings.qrCodeUrl,
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditingTournament && tournamentFormId) {
        await updateDoc(doc(db, "tournaments", tournamentFormId), data);
        await logAdminUpdate(
          'tournament_updated',
          `Tournament Updated: ${data.title}`,
          `The tournament details for "${data.title}" were modified by the admin.`
        );
      } else {
        const newDocRef = doc(collection(db, "tournaments"));
        await setDoc(newDocRef, {
          ...data,
          id: newDocRef.id,
          registeredPlayersCount: 0,
          status: "upcoming",
          createdAt: serverTimestamp()
        });
        await logAdminUpdate(
          'tournament_created',
          `New Tournament: ${data.title}`,
          `A new tournament "${data.title}" for ${data.gameName} has been created! Entry: ₹${data.entryFee}, Prize: ₹${data.prizePool}.`
        );
      }

      // Reset forms
      setTournamentTitle("");
      setTournamentDesc("");
      setTournamentFee("");
      setTournamentPrize("");
      setTournamentMaxPlayers("");
      setTournamentDate("");
      setTournamentBannerUrl("");
      setTournamentGameMode("Clash Squad 1v1");
      setTournamentPrizeDesc("");
      setShowTournamentModal(false);
      setIsEditingTournament(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "tournaments");
      showToast("Failed to save tournament details.", "error");
    }
  };

  // Delete Tournament
  const handleDeleteTournament = async (id: string) => {
    const target = tournaments.find(t => t.id === id);
    const title = target ? target.title : "Unknown Tournament";
    try {
      await deleteDoc(doc(db, "tournaments", id));
      await logAdminUpdate(
        'tournament_deleted',
        `Tournament Cancelled: ${title}`,
        `The tournament "${title}" has been deleted and cancelled by the admin.`
      );
      showToast(`Tournament "${title}" deleted successfully.`, "success");
    } catch (err) {
      console.error("Failed to delete tournament:", err);
      showToast("Failed to delete tournament due to insufficient permissions or error.", "error");
    }
  };

  // Release Room ID and Password
  const handleReleaseKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomTournament || !roomID.trim() || !roomPassword.trim()) return;

    setIsReleasingKeys(true);
    try {
      // 1. Update tournament document
      await updateDoc(doc(db, "tournaments", selectedRoomTournament.id), {
        roomID: roomID.trim(),
        roomPassword: roomPassword.trim(),
        status: "ongoing"
      });

      // 2. Fetch all verified registered users and notify them!
      const regPath = `tournaments/${selectedRoomTournament.id}/registrations`;
      const regSnap = await getDocs(collection(db, regPath));
      
      const notificationsPromises: Promise<any>[] = [];
      regSnap.forEach((docSnap) => {
        const reg = docSnap.data() as Registration;
        if (reg.paymentStatus === "verified") {
          notificationsPromises.push(
            sendUserNotification(
              reg.userId,
              `Room Details Released: ${selectedRoomTournament.title}`,
              `Room ID: ${roomID.trim()} | Password: ${roomPassword.trim()}. Copy codes now and prepare for combat!`,
              "room_details"
            )
          );
        }
      });

      await Promise.all(notificationsPromises);

      await logAdminUpdate(
        'room_released',
        `Room Credentials Released: ${selectedRoomTournament.title}`,
        `Match room credentials for "${selectedRoomTournament.title}" have been securely published. Check your My Registrations portal to get your keys!`
      );

      setRoomID("");
      setRoomPassword("");
      setSelectedRoomTournament(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tournaments/${selectedRoomTournament.id}`);
      showToast("Failed to release room credentials.", "error");
    } finally {
      setIsReleasingKeys(false);
    }
  };

  // Declare Winners & End Tournament
  const handleDeclareWinners = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinnersTournament || winnerRows.length === 0) return;

    // Check if all rows have a selected player
    const invalidRow = winnerRows.find(r => !r.userId || r.amount < 0);
    if (invalidRow) {
      showToast("Please select a verified player and enter a valid prize amount for all winner rows.", "error");
      return;
    }

    setIsDeclaringWinners(true);
    try {
      // 1. Get list of winner names
      const winnersListNames = winnerRows.map(r => r.username);

      // Save to tournament document
      await updateDoc(doc(db, "tournaments", selectedWinnersTournament.id), {
        status: "completed",
        winners: winnersListNames,
        winnerDistributions: winnerRows,
        updatedAt: serverTimestamp()
      });

      // 2. Prize distribution (We will reward winners by crediting their wallets automatically)
      for (const row of winnerRows) {
        if (!row.userId || row.amount <= 0) continue;

        // Credit winner's wallet
        const userDocRef = doc(db, "users", row.userId);
        await updateDoc(userDocRef, {
          walletBalance: increment(row.amount),
          winningBalance: increment(row.amount),
          totalWinnings: increment(row.amount)
        });

        // Log transaction
        await addDoc(collection(db, `users/${row.userId}/transactions`), {
          type: "prize_payout",
          amount: row.amount,
          status: "completed",
          reference: `${row.rank} in ${selectedWinnersTournament.title}`,
          createdAt: serverTimestamp()
        });

        // Send notification
        await sendUserNotification(
          row.userId,
          `🏆 Victory Champion! Prize Credited`,
          `Congratulations! You finished ${row.rank} in ${selectedWinnersTournament.title}. Your cash prize of ₹${row.amount} is credited into your KhelArena wallet.`,
          "prize"
        );
      }

      await logAdminUpdate(
        'winners_announced',
        `Champions Crowned: ${selectedWinnersTournament.title}`,
        `The battle has concluded for "${selectedWinnersTournament.title}". Distributions: ${winnerRows.map(r => `${r.username} (${r.rank}): ₹${r.amount}`).join(", ")}.`
      );

      setSelectedWinnersTournament(null);
      setWinnerRows([]);
      showToast("Winners declared successfully! Cash prizes have been credited.", "success");
    } catch (err) {
      console.error("Failed to declare winners:", err);
      showToast("An error occurred while declaring winners.", "error");
    } finally {
      setIsDeclaringWinners(false);
    }
  };

  // Verify Player Payment Registration
  const handleVerifyRegistration = async (reg: Registration, tournamentId: string, entryFee: number, tournamentTitle: string, status: "verified" | "failed") => {
    const path = `tournaments/${tournamentId}/registrations/${reg.id}`;
    try {
      // 1. Update registration status
      await updateDoc(doc(db, path), {
        paymentStatus: status,
        updatedAt: serverTimestamp()
      });

      // 2. If approved, increment registeredPlayersCount on tournament
      if (status === "verified") {
        await updateDoc(doc(db, "tournaments", tournamentId), {
          registeredPlayersCount: increment(1)
        });

        // Add fee transaction history to player ledger
        if (entryFee > 0) {
          await addDoc(collection(db, `users/${reg.userId}/transactions`), {
            type: "entry_fee",
            amount: entryFee,
            status: "completed",
            reference: `Entry for ${tournamentTitle}`,
            createdAt: serverTimestamp()
          });
        }

        // Send victory confirmation notification
        await sendUserNotification(
          reg.userId,
          "Slot Confirmed! Payment Approved",
          `Your entry for "${tournamentTitle}" is verified. Stay alert! Room credentials will appear as soon as the battle starts.`,
          "payment_verified"
        );

        await logAdminUpdate(
          'payment_verified',
          `Payment Approved: ${reg.userName}`,
          `The payment entry of ₹${entryFee} for user ${reg.userName} (Gamer ID: ${reg.gameUsername}) in tournament "${tournamentTitle}" has been successfully verified.`
        );
      } else {
        // Send rejection notification
        await sendUserNotification(
          reg.userId,
          "Registration Verification Failed",
          `Your payment confirmation for "${tournamentTitle}" was rejected by admin. UTR ID was invalid or mismatch.`,
          "announcement"
        );

        await logAdminUpdate(
          'payment_verified',
          `Payment Rejected: ${reg.userName}`,
          `The payment entry for user ${reg.userName} in tournament "${tournamentTitle}" was rejected due to an invalid/incorrect transaction reference.`
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Adjust User Wallet balance manually
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletUser) return;

    const amount = parseFloat(balanceAdjAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsAdjustingBalance(true);
    try {
      const userRef = doc(db, "users", selectedWalletUser.uid);

      if (balanceAdjType === "credit") {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          depositBalance: increment(amount)
        });
      } else {
        // Debit adjustment (deduct from bonus -> deposit -> winning)
        let remainingFee = amount;
        let bonus = selectedWalletUser.bonusBalance || 0;
        let deposit = selectedWalletUser.depositBalance || 0;
        let winning = selectedWalletUser.winningBalance || 0;

        if (bonus >= remainingFee) {
          bonus -= remainingFee;
          remainingFee = 0;
        } else {
          remainingFee -= bonus;
          bonus = 0;
        }

        if (remainingFee > 0) {
          if (deposit >= remainingFee) {
            deposit -= remainingFee;
            remainingFee = 0;
          } else {
            remainingFee -= deposit;
            deposit = 0;
          }
        }

        if (remainingFee > 0) {
          if (winning >= remainingFee) {
            winning -= remainingFee;
            remainingFee = 0;
          } else {
            remainingFee -= winning;
            winning = 0;
          }
        }

        await updateDoc(userRef, {
          bonusBalance: bonus,
          depositBalance: deposit,
          winningBalance: winning,
          walletBalance: bonus + deposit + winning
        });
      }

      // Log Transaction
      await addDoc(collection(db, `users/${selectedWalletUser.uid}/transactions`), {
        type: balanceAdjType === "credit" ? "deposit" : "withdrawal",
        amount,
        status: "completed",
        reference: `Admin Manual Adjustment`,
        createdAt: serverTimestamp()
      });

      // Send Alert
      await sendUserNotification(
        selectedWalletUser.uid,
        `Wallet Balance Adjusted by Admin`,
        `An admin has manually ${balanceAdjType === "credit" ? "credited" : "debited"} ₹${amount} in your wallet.`,
        "announcement"
      );

      await logAdminUpdate(
        'wallet_adjustment',
        `Wallet Adjust: ${selectedWalletUser.displayName}`,
        `Admin manually adjusted cash wallet for ${selectedWalletUser.displayName} by ${balanceAdjType === "credit" ? "crediting" : "debiting"} ₹${amount}.`
      );

      // Refresh selection to show new balance
      const updatedUserSnap = await getDocs(query(collection(db, "users")));
      updatedUserSnap.forEach((docSnap) => {
        if (docSnap.id === selectedWalletUser.uid) {
          setSelectedWalletUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        }
      });

      setBalanceAdjAmount("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${selectedWalletUser.uid}`);
      showToast("Failed to adjust user balance.", "error");
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  // ---------------- Slots & Registrations CRUD Handlers ----------------

  // CREATE: Manually Register / Occupy Slot
  const handleCreateRegistration = async () => {
    if (!selectedSlotTournament || !addRegUserId) return;
    
    const userToRegister = users.find(u => u.uid === addRegUserId);
    if (!userToRegister) return;

    // Check if user is already registered for this tournament
    const isAlreadyRegistered = allRegistrations.some(
      r => r.tournamentId === selectedSlotTournament.id && r.userId === addRegUserId
    );
    if (isAlreadyRegistered) {
      showToast(`${userToRegister.displayName} is already registered in this tournament!`, "error");
      return;
    }

    try {
      const regPath = `tournaments/${selectedSlotTournament.id}/registrations/${addRegUserId}`;
      const regData: Registration = {
        id: addRegUserId,
        userId: addRegUserId,
        userName: userToRegister.displayName || userToRegister.email || "Unknown",
        userEmail: userToRegister.email || "",
        gameUsername: addRegGameUsername.trim() || "Gamer",
        paymentStatus: addRegPaymentStatus,
        transactionId: addRegTransactionId.trim() || "ADMIN_MANUAL",
        paymentMethod: addRegPaymentMethod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Write registration
      await setDoc(doc(db, regPath), regData);

      // Increment registeredPlayersCount if verified
      if (addRegPaymentStatus === "verified") {
        await updateDoc(doc(db, "tournaments", selectedSlotTournament.id), {
          registeredPlayersCount: increment(1)
        });

        // Add entry_fee ledger history
        if (selectedSlotTournament.entryFee > 0) {
          await addDoc(collection(db, `users/${addRegUserId}/transactions`), {
            type: "entry_fee",
            amount: selectedSlotTournament.entryFee,
            status: "completed",
            reference: `Entry for ${selectedSlotTournament.title} (Admin)`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Notify the user
      await sendUserNotification(
        addRegUserId,
        addRegPaymentStatus === "verified" ? "Slot Confirmed by Admin" : "Slot Request Lodged by Admin",
        addRegPaymentStatus === "verified"
          ? `An admin has manually registered you for "${selectedSlotTournament.title}". Your seat is fully verified.`
          : `An admin has registered you for "${selectedSlotTournament.title}". Payment is pending review.`,
        addRegPaymentStatus === "verified" ? "payment_verified" : "announcement"
      );

      // Log administrative action
      await logAdminUpdate(
        'payment_verified',
        `Slot Created: ${userToRegister.displayName}`,
        `Admin manually registered ${userToRegister.displayName} (Gamer: ${addRegGameUsername}) into "${selectedSlotTournament.title}" with status: ${addRegPaymentStatus}.`
      );

      showToast(`Successfully registered ${userToRegister.displayName}!`, "success");
      
      // Reset inputs
      setAddRegUserId("");
      setAddRegGameUsername("");
      setAddRegTransactionId("");
      setAddRegPaymentStatus("verified");
    } catch (err) {
      console.error("Failed to create manual registration:", err);
      showToast("Error creating registration. Check permissions.", "error");
    }
  };

  // UPDATE: Edit slot registration details
  const handleUpdateRegistration = async () => {
    if (!selectedSlotTournament || !editingRegistration) return;

    try {
      const regPath = `tournaments/${selectedSlotTournament.id}/registrations/${editingRegistration.userId}`;
      const wasVerified = editingRegistration.paymentStatus === "verified";
      const isNowVerified = editRegPaymentStatus === "verified";

      // Calculate slot counter delta
      let countDelta = 0;
      if (!wasVerified && isNowVerified) {
        countDelta = 1;
      } else if (wasVerified && !isNowVerified) {
        countDelta = -1;
      }

      // Update registration document
      await updateDoc(doc(db, regPath), {
        gameUsername: editRegGameUsername.trim() || editingRegistration.gameUsername,
        paymentStatus: editRegPaymentStatus,
        transactionId: editRegTransactionId.trim() || editingRegistration.transactionId || "ADMIN_MANUAL",
        updatedAt: serverTimestamp()
      });

      // Apply slot counter delta to tournament document
      if (countDelta !== 0) {
        await updateDoc(doc(db, "tournaments", selectedSlotTournament.id), {
          registeredPlayersCount: increment(countDelta)
        });

        // Add ledger entry if it became verified
        if (countDelta === 1 && selectedSlotTournament.entryFee > 0) {
          await addDoc(collection(db, `users/${editingRegistration.userId}/transactions`), {
            type: "entry_fee",
            amount: selectedSlotTournament.entryFee,
            status: "completed",
            reference: `Entry for ${selectedSlotTournament.title}`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Notify user
      await sendUserNotification(
        editingRegistration.userId,
        "Registration Details Updated",
        `Admin updated your slot booking for "${selectedSlotTournament.title}". Status is now: ${editRegPaymentStatus.toUpperCase()}.`,
        "announcement"
      );

      // Log admin update
      await logAdminUpdate(
        'payment_verified',
        `Slot Updated: ${editingRegistration.userName}`,
        `Admin modified slot registration for ${editingRegistration.userName} in "${selectedSlotTournament.title}". Status changed from ${editingRegistration.paymentStatus} to ${editRegPaymentStatus}.`
      );

      showToast(`Updated registration for ${editingRegistration.userName} successfully.`, "success");
      setEditingRegistration(null);
    } catch (err) {
      const errorPath = `tournaments/${selectedSlotTournament.id}/registrations/${editingRegistration.userId}`;
      handleFirestoreError(err, OperationType.WRITE, errorPath);
      showToast("Error updating registration.", "error");
    }
  };

  // DELETE: Cancel slot booking and delete registration
  const handleDeleteRegistration = async (tournamentId: string, userId: string, currentStatus: string) => {
    try {
      const regPath = `tournaments/${tournamentId}/registrations/${userId}`;
      
      // Delete document
      await deleteDoc(doc(db, regPath));

      // Decrement registered players count if registration was verified
      if (currentStatus === "verified") {
        await updateDoc(doc(db, "tournaments", tournamentId), {
          registeredPlayersCount: increment(-1)
        });
      }

      // Notify user
      await sendUserNotification(
        userId,
        "Registration Cancelled",
        `Your slot booking for "${selectedSlotTournament?.title || 'Tournament'}" has been cancelled/removed by the admin.`,
        "announcement"
      );

      // Log admin update
      await logAdminUpdate(
        'tournament_updated',
        `Slot Cancelled: User ID ${userId}`,
        `Admin cancelled registration slot and removed user ${userId} from tournament ID ${tournamentId}.`
      );

      showToast("Slot booking cancelled and slot freed up.", "success");
    } catch (err) {
      const errorPath = `tournaments/${tournamentId}/registrations/${userId}`;
      handleFirestoreError(err, OperationType.WRITE, errorPath);
      showToast("Error deleting registration.", "error");
    }
  };

  // Approve Pending Deposit / Withdrawal Request
  const handleApproveTxRequest = async (tx: WalletTransaction, userId: string, userDisplayName: string, status: "completed" | "failed") => {
    const path = `users/${userId}/transactions/${tx.id}`;
    try {
      // 1. Update transaction status
      await updateDoc(doc(db, path), {
        status,
        updatedAt: serverTimestamp()
      });

      // 2. Adjust Balance & Notify
      if (status === "completed") {
        if (tx.type === "deposit") {
          // Increase wallet balance
          await updateDoc(doc(db, "users", userId), {
            walletBalance: increment(tx.amount),
            depositBalance: increment(tx.amount),
            totalDeposited: increment(tx.amount)
          });
          
          await sendUserNotification(
            userId,
            `Deposit Approved! ₹${tx.amount} Credited`,
            `Your UPI deposit of ₹${tx.amount} has been successfully verified. Enjoy the tournaments!`,
            "payment_verified"
          );

          await logAdminUpdate(
            'payout_processed',
            `Deposit Confirmed: ${userDisplayName}`,
            `The UPI deposit request of ₹${tx.amount} by ${userDisplayName} has been verified and credited successfully.`
          );
        } else if (tx.type === "withdrawal") {
          // Deduct wallet balance (it was already held or we deduct it now)
          await updateDoc(doc(db, "users", userId), {
            walletBalance: increment(-tx.amount),
            winningBalance: increment(-tx.amount),
            totalWithdrawn: increment(tx.amount)
          });

          await sendUserNotification(
            userId,
            `Withdrawal Completed Successfully`,
            `Your withdrawal request of ₹${tx.amount} has been approved and processed. Funds sent to your UPI.`,
            "payment_verified"
          );

          await logAdminUpdate(
            'payout_processed',
            `Withdrawal Paid: ${userDisplayName}`,
            `The cash withdrawal request of ₹${tx.amount} by ${userDisplayName} has been processed and paid out via UPI.`
          );
        }
      } else {
        // Rejected
        await sendUserNotification(
          userId,
          `Wallet Request Rejected`,
          `Your wallet ${tx.type} request of ₹${tx.amount} was rejected by admin. Please contact support.`,
          "announcement"
        );

        await logAdminUpdate(
          'payout_processed',
          `Transaction Declined: ${userDisplayName}`,
          `The wallet ${tx.type} request of ₹${tx.amount} by ${userDisplayName} was rejected by administration.`
        );
      }

      // Re-trigger refresh of selected user profile to see live changes if selected
      if (selectedWalletUser && selectedWalletUser.uid === userId) {
        const updatedUserSnap = await getDocs(query(collection(db, "users")));
        updatedUserSnap.forEach((docSnap) => {
          if (docSnap.id === userId) {
            setSelectedWalletUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Change App-wide Payment Details (UPI ID and QR Code)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        upiId: settingsUpi.trim(),
        qrCodeUrl: settingsQrUrl.trim(),
        razorpayId: settingsRazorpayId.trim()
      });
      await logAdminUpdate(
        'settings_updated',
        `App Payment Credentials Updated`,
        `Admin updated the official global payment billing credentials.`
      );
      showToast("Application-wide billing details updated successfully!", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/global");
      showToast("Failed to save payment settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const pendingSlotsCount = allRegistrations.filter(r => r.paymentStatus === "pending").length;
  const pendingDepositsCount = allTransactions.filter(tx => tx.type === "deposit" && tx.status === "pending").length;
  const pendingWithdrawalsCount = allTransactions.filter(tx => tx.type === "withdrawal" && tx.status === "pending").length;

  return (
    <div id="admin-panel-wrapper" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce duration-300">
          <div className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 max-w-sm ${
            toast.type === "success" ? "bg-emerald-950/95 border-emerald-500 text-emerald-300" :
            toast.type === "error" ? "bg-rose-950/95 border-rose-500 text-rose-300" :
            "bg-slate-900/95 border-slate-700 text-slate-200"
          }`}>
            <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-[10px] opacity-70 hover:opacity-100 font-bold ml-auto pl-2">✕</button>
          </div>
        </div>
      )}

      {/* Admin Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 w-full overflow-hidden">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
          <Sliders className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 shrink-0" />
          <h1 className="font-sans font-bold tracking-tight text-xs sm:text-lg text-white truncate">
            Admin Console
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <span className="hidden sm:inline-flex text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            {adminUser.email}
          </span>
          <button
            id="admin-exit-btn"
            onClick={onCloseAdmin}
            className="px-2 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-[10px] sm:text-xs tracking-wide transition cursor-pointer shrink-0"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Admin Subnav */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none sticky top-16 z-30">
        <button
          onClick={() => setActiveTab("tournaments")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer ${
            activeTab === "tournaments" 
              ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <Gamepad2 className="h-3.5 w-3.5" />
          <span>Tournaments</span>
        </button>
        <button
          onClick={() => setActiveTab("pending-slots")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer relative ${
            activeTab === "pending-slots" 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Pending Slots</span>
          {pendingSlotsCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans font-black">
              {pendingSlotsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pending-deposits")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer relative ${
            activeTab === "pending-deposits" 
              ? "bg-emerald-600 border-emerald-600 text-white shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <ArrowDownCircle className="h-3.5 w-3.5" />
          <span>Pending Deposits</span>
          {pendingDepositsCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans font-black">
              {pendingDepositsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pending-withdrawals")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer relative ${
            activeTab === "pending-withdrawals" 
              ? "bg-purple-600 border-purple-600 text-white shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          <span>Pending Withdrawals</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans font-black">
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("registrations")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer relative ${
            activeTab === "registrations" 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Slots Desk</span>
        </button>
        <button
          onClick={() => setActiveTab("wallets")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer ${
            activeTab === "wallets" 
              ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Users & Ledgers</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition flex items-center space-x-1.5 border cursor-pointer ${
            activeTab === "settings" 
              ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md" 
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Global UPI</span>
        </button>
      </div>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Tab 1: Tournaments Manager */}
        {activeTab === "tournaments" && (
          <div id="admin-tab-tournaments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Gamepad2 className="h-6 w-6 text-amber-500" />
                <span>Active Esports Arena</span>
              </h2>
              <button
                id="create-tournament-btn"
                onClick={() => {
                  setIsEditingTournament(false);
                  setTournamentTitle("");
                  setTournamentDesc("");
                  setTournamentFee("");
                  setTournamentPrize("");
                  setTournamentMaxPlayers("");
                  setTournamentDate("");
                  setTournamentBannerUrl("");
                  setShowTournamentModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-sm cursor-pointer transition shadow-lg"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Create Tournament</span>
              </button>
            </div>

            {/* List of tournaments */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {t.gameName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                        t.status === "upcoming" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                        t.status === "ongoing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-2.5 line-clamp-1">{t.title}</h3>
                    <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{t.description}</p>
                    
                    {/* stats overview */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs border-t border-b border-slate-800/80 py-2.5 my-3">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Entry Fee</span>
                        <span className="font-bold text-slate-200">₹{t.entryFee}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Prize Pool</span>
                        <span className="font-bold text-amber-400">₹{t.prizePool}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Joined Slots</span>
                        <span className="font-bold text-indigo-400">{t.registeredPlayersCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col gap-2 mt-auto">
                    {t.status === "upcoming" && (
                      <button
                        onClick={() => setSelectedRoomTournament(t)}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition"
                      >
                        <Key className="h-4 w-4" />
                        <span>Deploy Room Credentials</span>
                      </button>
                    )}

                    {t.status === "ongoing" && (
                      <button
                        onClick={() => {
                          setSelectedWinnersTournament(t);
                          setVerifiedRegs([]);
                          getDocs(collection(db, `tournaments/${t.id}/registrations`)).then((snap) => {
                            const regs: Registration[] = [];
                            snap.forEach((d) => {
                              const r = d.data() as Registration;
                              if (r.paymentStatus === "verified") {
                                regs.push(r);
                              }
                            });
                            setVerifiedRegs(regs);
                            setWinnerRows([{ userId: "", username: "", rank: "1st Player", amount: t.prizePool }]);
                          });
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer transition animate-pulse"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Declare Winners & Complete</span>
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTournamentFormId(t.id);
                          setTournamentTitle(t.title);
                          setTournamentDesc(t.description);
                          setTournamentGame(t.gameName);
                          setTournamentGameMode(t.gameMode || "Clash Squad 1v1");
                          setTournamentPrizeDesc(t.prizeDistributionDesc || "");
                          setTournamentFee(String(t.entryFee));
                          setTournamentPrize(String(t.prizePool));
                          setTournamentMaxPlayers(String(t.maxPlayers));
                          setTournamentDate(t.startDate);
                          setTournamentBannerUrl(t.bannerUrl);
                          setIsEditingTournament(true);
                          setShowTournamentModal(true);
                        }}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (deletingId === t.id) {
                            handleDeleteTournament(t.id);
                            setDeletingId(null);
                          } else {
                            setDeletingId(t.id);
                            setTimeout(() => {
                              setDeletingId(prev => prev === t.id ? null : prev);
                            }, 3500);
                          }
                        }}
                        className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg border transition ${
                          deletingId === t.id
                            ? "bg-rose-600 border-rose-600 text-white font-bold animate-pulse"
                            : "border-rose-950/40 hover:bg-rose-950/20 text-rose-400 font-semibold"
                        } text-xs cursor-pointer`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{deletingId === t.id ? "Confirm?" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Pending Slot Approvals */}
        {activeTab === "pending-slots" && (
          <div id="admin-tab-pending-slots" className="flex flex-col space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-indigo-400" />
                <span>Pending Slot Approvals</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Review player payment UTR receipts to verify tournament seat registration.</p>
            </div>

            {(() => {
              const pendingRegs = allRegistrations.filter(r => r.paymentStatus === "pending");

              if (pendingRegs.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                    <CheckSquare className="h-12 w-12 mx-auto text-slate-800 mb-3 animate-pulse" />
                    <p className="text-sm">No pending slot approvals found.</p>
                    <p className="text-xs text-slate-600 mt-1">All registrations have been verified and processed.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Mobile Card Layout */}
                  <div className="block md:hidden space-y-4">
                    {pendingRegs.map((reg) => (
                      <div key={reg.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase block">Tournament</span>
                            <span className="font-bold text-sm text-white block truncate">{reg.tournamentTitle}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            Fee: ₹{reg.tournamentFee}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-800/60 py-2.5">
                          <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Gamer Name</span>
                            <span className="font-bold text-slate-200 block truncate">{reg.userName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Gamertag</span>
                            <span className="font-bold text-indigo-400 font-mono block truncate">{reg.gameUsername}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-semibold">UTR / Transaction ID</span>
                          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 block mt-1 break-all">
                            {reg.transactionId}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => handleVerifyRegistration(reg, reg.tournamentId, reg.tournamentFee, reg.tournamentTitle, "verified")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerifyRegistration(reg, reg.tournamentId, reg.tournamentFee, reg.tournamentTitle, "failed")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Tournament</th>
                          <th className="p-4">Player / Gamer Nick</th>
                          <th className="p-4">UTR/Transaction ID</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {pendingRegs.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-800/20 transition">
                            <td className="p-4">
                              <span className="font-bold text-amber-400 block">{reg.tournamentTitle}</span>
                              <span className="text-[10px] text-slate-500">Fee: ₹{reg.tournamentFee}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-200 block">{reg.userName}</span>
                              <span className="text-[10px] text-slate-500 font-semibold font-mono">Gamertag: {reg.gameUsername}</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-300">
                              {reg.transactionId}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400">
                                {reg.paymentStatus}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleVerifyRegistration(reg, reg.tournamentId, reg.tournamentFee, reg.tournamentTitle, "verified")}
                                  className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                                  title="Verify and Approve Player"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleVerifyRegistration(reg, reg.tournamentId, reg.tournamentFee, reg.tournamentTitle, "failed")}
                                  className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition cursor-pointer"
                                  title="Reject Payment Receipt"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 3: Pending Deposits */}
        {activeTab === "pending-deposits" && (
          <div id="admin-tab-pending-deposits" className="flex flex-col space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
                <span>Pending UPI Deposits</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Approve incoming cash deposits after verifying the UPI transaction reference screenshot.</p>
            </div>

            {(() => {
              const pendingDeposits = allTransactions.filter(tx => tx.type === "deposit" && tx.status === "pending");

              if (pendingDeposits.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                    <ArrowDownCircle className="h-12 w-12 mx-auto text-slate-800 mb-3 animate-pulse" />
                    <p className="text-sm">No pending deposits found.</p>
                    <p className="text-xs text-slate-600 mt-1">All player deposit requests are up to date.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Mobile Cards */}
                  <div className="block md:hidden space-y-4">
                    {pendingDeposits.map((tx) => (
                      <div key={tx.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase block">Player Details</span>
                            <span className="font-bold text-sm text-white block truncate">{tx.userDisplayName}</span>
                            <span className="text-[10px] text-slate-500 block truncate font-mono">{tx.userEmail}</span>
                          </div>
                          <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 shrink-0">
                            ₹{tx.amount}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Reference / UTR</span>
                            <span className="font-mono font-bold text-slate-300 break-all">{tx.reference}</span>
                          </div>
                          {tx.paymentSenderName && (
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Sender Name</span>
                              <span className="font-bold text-amber-400 font-sans">{tx.paymentSenderName}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "completed")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "failed")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Player Details</th>
                          <th className="p-4">Reference/UTR</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {pendingDeposits.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                            <td className="p-4">
                              <span className="font-bold text-slate-200 block">{tx.userDisplayName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{tx.userEmail}</span>
                            </td>
                            <td className="p-4 font-mono text-slate-400">
                              <div>{tx.reference}</div>
                              {tx.paymentSenderName && (
                                <div className="text-[10px] text-amber-400 font-sans mt-0.5 font-bold">
                                  Sender: {tx.paymentSenderName}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-bold font-mono text-emerald-400">
                              + ₹{tx.amount}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 animate-pulse">
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "completed")}
                                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "failed")}
                                  className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 4: Pending Withdrawals */}
        {activeTab === "pending-withdrawals" && (
          <div id="admin-tab-pending-withdrawals" className="flex flex-col space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ArrowUpCircle className="h-5 w-5 text-purple-400" />
                <span>Pending UPI Withdrawals</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Verify and execute player cash withdrawal requests to their respective UPI accounts.</p>
            </div>

            {(() => {
              const pendingWithdrawals = allTransactions.filter(tx => tx.type === "withdrawal" && tx.status === "pending");

              if (pendingWithdrawals.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                    <ArrowUpCircle className="h-12 w-12 mx-auto text-slate-800 mb-3 animate-pulse" />
                    <p className="text-sm">No pending withdrawal requests found.</p>
                    <p className="text-xs text-slate-600 mt-1">All player cash withdrawals have been paid out.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Mobile Cards */}
                  <div className="block md:hidden space-y-4">
                    {pendingWithdrawals.map((tx) => (
                      <div key={tx.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-purple-400 font-mono font-bold uppercase block">Player Details</span>
                            <span className="font-bold text-sm text-white block truncate">{tx.userDisplayName}</span>
                            <span className="text-[10px] text-slate-500 block truncate font-mono">{tx.userEmail}</span>
                          </div>
                          <span className="text-sm font-mono font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 shrink-0">
                            ₹{tx.amount}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs space-y-1">
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">Recipient UPI ID</span>
                          <span className="font-mono font-bold text-indigo-400 break-all block">{tx.reference}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "completed")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <Check className="h-4 w-4" />
                            <span>Mark Paid</span>
                          </button>
                          <button
                            onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "failed")}
                            className="w-full flex items-center justify-center space-x-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <X className="h-4 w-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Player Details</th>
                          <th className="p-4">Recipient UPI Account</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {pendingWithdrawals.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                            <td className="p-4">
                              <span className="font-bold text-slate-200 block">{tx.userDisplayName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{tx.userEmail}</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-indigo-400">
                              {tx.reference}
                            </td>
                            <td className="p-4 font-bold font-mono text-rose-400">
                              - ₹{tx.amount}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 animate-pulse">
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "completed")}
                                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Complete Paid
                                </button>
                                <button
                                  onClick={() => handleApproveTxRequest(tx, tx.userId, tx.userDisplayName, "failed")}
                                  className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 5: Users Profiles & Manual Cash Ledgers */}
        {activeTab === "wallets" && (
          <div id="admin-tab-wallets" className="flex flex-col space-y-6 w-full animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  <span>Users Profiles & Ledger Desk</span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Adjust manual credits/debits, inspect historic transaction logs, and search accounts.</p>
              </div>
            </div>

            {/* Desktop Split Layout */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-8 w-full items-start">
              {/* Sidebar of users with elegant live search */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col max-h-[680px]">
                <div className="pb-3 border-b border-slate-800/80 mb-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Search Players ({users.length})</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Type username or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[500px]">
                  {(() => {
                    const filteredUsers = users.filter(u => 
                      u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    );

                    if (filteredUsers.length === 0) {
                      return <span className="text-[10px] text-slate-600 block py-6 text-center">No profiles found.</span>;
                    }

                    return filteredUsers.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => setSelectedWalletUser(u)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex flex-col cursor-pointer ${
                          selectedWalletUser?.uid === u.uid
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-slate-950/40 border-slate-800/50 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <span className="font-semibold block truncate">{u.displayName}</span>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5">{u.email}</span>
                        <span className="text-[10px] font-bold text-emerald-400 font-mono mt-1">Wallet Balance: ₹{u.walletBalance || 0}</span>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Detail operations panel */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                {selectedWalletUser ? (
                  <div className="space-y-8">
                    {/* User Profile Overview Header */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Account Profile Selected</span>
                        <h4 className="font-bold text-lg text-amber-400">{selectedWalletUser.displayName}</h4>
                        <p className="text-xs text-slate-400">{selectedWalletUser.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Ledger Balance</span>
                        <span className="text-2xl font-bold font-mono text-emerald-400">₹{selectedWalletUser.walletBalance || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {/* Form: Manual adjust balance */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5">
                        <h4 className="font-bold text-xs text-slate-300 mb-4 uppercase tracking-wider border-b border-slate-800 pb-2">Manual Ledger Credit/Debit</h4>
                        <form onSubmit={handleAdjustBalance} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Adjustment Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setBalanceAdjType("credit")}
                                className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                  balanceAdjType === "credit" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"
                                }`}
                              >
                                <span>Credit (+ Funds)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBalanceAdjType("debit")}
                                className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                  balanceAdjType === "debit" ? "bg-rose-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                                }`}
                              >
                                <span>Debit (- Deduct)</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Deduction / Credit Amount (₹) *</label>
                            <input
                              type="number"
                              placeholder="e.g. 500"
                              required
                              value={balanceAdjAmount}
                              onChange={(e) => setBalanceAdjAmount(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAdjustingBalance}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            Execute Balance Adjustment
                          </button>
                        </form>
                      </div>

                      {/* Right Panel: Selected user recent transactions */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">Historic Wallet Ledger</h4>
                        {userTransactions.length === 0 ? (
                          <p className="text-xs text-slate-600 italic py-6 text-center">No transaction logs recorded for this account.</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {userTransactions.map((tx) => (
                              <div key={tx.id} className="p-2.5 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs gap-3">
                                <div className="truncate">
                                  <span className="font-bold text-slate-200 capitalize block truncate">{tx.type.replace("_", " ")}</span>
                                  <span className="text-[9px] text-slate-500 font-mono block truncate">{tx.reference}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`font-bold font-mono block ${
                                    tx.type === "deposit" || tx.type === "prize_payout" ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    {tx.type === "deposit" || tx.type === "prize_payout" ? "+" : "-"} ₹{tx.amount}
                                  </span>
                                  <span className="text-[8px] text-slate-500 block uppercase">{tx.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <UserCheck className="h-12 w-12 mx-auto text-slate-800 mb-3" />
                    <p className="text-sm">Select a player profile from the sidebar list to inspect balances, adjust ledgers, and check private transaction histories.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Layout (Strictly 1 Column with Detail/Master toggle) */}
            <div className="block lg:hidden w-full animate-in fade-in duration-200">
              {selectedWalletUser ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
                  <button
                    type="button"
                    onClick={() => setSelectedWalletUser(null)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition mb-4"
                  >
                    <span>← Back to Accounts list</span>
                  </button>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-white gap-3">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Managing</span>
                      <h4 className="font-bold text-base text-amber-400 truncate">{selectedWalletUser.displayName}</h4>
                      <p className="text-xs text-slate-400 truncate">{selectedWalletUser.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Balance</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">₹{selectedWalletUser.walletBalance || 0}</span>
                    </div>
                  </div>

                  {/* Form: Manual adjust balance */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <h4 className="font-bold text-xs text-slate-300 mb-3 uppercase tracking-wider">Manual Ledger Adjust</h4>
                    <form onSubmit={handleAdjustBalance} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Adjustment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setBalanceAdjType("credit")}
                            className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              balanceAdjType === "credit" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}
                          >
                            <span>Credit (+ Funds)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBalanceAdjType("debit")}
                            className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              balanceAdjType === "debit" ? "bg-rose-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}
                          >
                            <span>Debit (- Deduct)</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Amount (₹) *</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          required
                          value={balanceAdjAmount}
                          onChange={(e) => setBalanceAdjAmount(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAdjustingBalance}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        Apply Adjustment
                      </button>
                    </form>
                  </div>

                  {/* Historic Ledger list */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Account Wallet History</h4>
                    {userTransactions.length === 0 ? (
                      <p className="text-xs text-slate-600 italic py-6 text-center">No transaction logs recorded.</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {userTransactions.map((tx) => (
                          <div key={tx.id} className="p-2.5 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-xs gap-3">
                            <div className="truncate">
                              <span className="font-bold text-slate-200 capitalize block truncate">{tx.type.replace("_", " ")}</span>
                              <span className="text-[9px] text-slate-500 font-mono block truncate">{tx.reference}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`font-bold font-mono block ${
                                tx.type === "deposit" || tx.type === "prize_payout" ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {tx.type === "deposit" || tx.type === "prize_payout" ? "+" : "-"} ₹{tx.amount}
                              </span>
                              <span className="text-[8px] text-slate-500 block uppercase">{tx.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Search Accounts ({users.length})</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(() => {
                      const filteredUsers = users.filter(u => 
                        u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                      );

                      if (filteredUsers.length === 0) {
                        return <span className="text-xs text-slate-500 block py-6 text-center">No profiles found matching search terms.</span>;
                      }

                      return filteredUsers.map((u) => (
                        <button
                          key={u.uid}
                          onClick={() => setSelectedWalletUser(u)}
                          className="w-full text-left p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 text-slate-300 transition flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-200 block truncate">{u.displayName}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{u.email}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-emerald-400 font-mono">₹{u.walletBalance || 0}</span>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Global Credentials Settings */}
        {activeTab === "settings" && (
          <div id="admin-tab-settings" className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-1.5 pb-2 border-b border-slate-800 uppercase tracking-wider">
                <Sliders className="h-5 w-5 text-amber-500" />
                Global Payment Coordinates
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Update the application-wide UPI ID and QR code URL. This is the coordinates displayed to players when they request deposits or register for tournaments.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Global Payment UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsUpi}
                    onChange={(e) => setSettingsUpi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Global QR Code Image URL (Unsplash or direct image link)
                  </label>
                  <input
                    type="text"
                    value={settingsQrUrl}
                    onChange={(e) => setSettingsQrUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Global Razorpay ID (Optional - for Razorpay payments)
                  </label>
                  <input
                    type="text"
                    value={settingsRazorpayId}
                    onChange={(e) => setSettingsRazorpayId(e.target.value)}
                    placeholder="e.g. rzp_live_xxxxx or merchant ID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition disabled:opacity-50"
                >
                  {isSavingSettings ? "Saving Settings..." : "Save Coordinates App-wide"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 5: Slots & Registration Desk */}
        {activeTab === "registrations" && (
          <div id="admin-tab-registrations" className="flex flex-col space-y-6 w-full animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-indigo-400" />
                  <span>Slots & Registration Desk</span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Manage tournament slots, register players manually, edit gamertags, and verify/cancel seats.</p>
              </div>
            </div>

            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 w-full items-start">
              {/* Left Sidebar: Tournaments List */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col max-h-[680px]">
                <div className="pb-3 border-b border-slate-800/80 mb-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Search Tournaments ({tournaments.length})</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search tournament..."
                      value={slotUserSearchQuery}
                      onChange={(e) => setSlotUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[500px]">
                  {(() => {
                    const filteredTournaments = tournaments.filter(t => 
                      t.title?.toLowerCase().includes(slotUserSearchQuery.toLowerCase()) || 
                      t.gameName?.toLowerCase().includes(slotUserSearchQuery.toLowerCase())
                    );

                    if (filteredTournaments.length === 0) {
                      return <span className="text-[10px] text-slate-600 block py-6 text-center">No tournaments found.</span>;
                    }

                    return filteredTournaments.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedSlotTournament(t)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col cursor-pointer ${
                          selectedSlotTournament?.id === t.id
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-slate-950/40 border-slate-800/50 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <span className="font-bold block truncate">{t.title}</span>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5">{t.gameName}</span>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-mono text-slate-400">Fee: ₹{t.entryFee}</span>
                          <span className={`text-[10px] font-bold font-mono ${t.registeredPlayersCount >= t.maxPlayers ? "text-rose-400" : "text-emerald-400"}`}>
                            {t.registeredPlayersCount || 0} / {t.maxPlayers} Slots
                          </span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Right Panel: Selected Tournament Registrations & CRUD Desk */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                {selectedSlotTournament ? (
                  <div className="space-y-8">
                    {/* Header Details */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Tournament Slots Desk</span>
                        <h4 className="font-bold text-lg text-amber-400">{selectedSlotTournament.title}</h4>
                        <p className="text-xs text-slate-400">{selectedSlotTournament.gameName} • Fee: ₹{selectedSlotTournament.entryFee} • Prize: ₹{selectedSlotTournament.prizePool}</p>
                      </div>
                      <div className="text-right w-full sm:w-auto">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Occupied / Total Slots</span>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, ((selectedSlotTournament.registeredPlayersCount || 0) / selectedSlotTournament.maxPlayers) * 100)}%` }}
                            />
                          </div>
                          <span className="text-2xl font-bold font-mono text-indigo-400">
                            {selectedSlotTournament.registeredPlayersCount || 0} / {selectedSlotTournament.maxPlayers}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                      {/* Left: Manual Registration Form (Create) */}
                      <div className="xl:col-span-1 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">Manually Register Player</h4>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateRegistration();
                        }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Select User Profile *</label>
                            <select
                              required
                              value={addRegUserId}
                              onChange={(e) => setAddRegUserId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Choose Account --</option>
                              {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email} ({u.email})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">In-Game Username (Gamertag) *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Slayer99"
                              value={addRegGameUsername}
                              onChange={(e) => setAddRegGameUsername(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Payment Status *</label>
                            <select
                              value={addRegPaymentStatus}
                              onChange={(e: any) => setAddRegPaymentStatus(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="verified">Verified (Seat Confirmed)</option>
                              <option value="pending">Pending Review</option>
                              <option value="failed">Failed / Rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Transaction Ref ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. UPI8274012"
                              value={addRegTransactionId}
                              onChange={(e) => setAddRegTransactionId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Payment Source</label>
                            <select
                              value={addRegPaymentMethod}
                              onChange={(e: any) => setAddRegPaymentMethod(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="wallet">Wallet Balance Deduction</option>
                              <option value="upi">Direct UPI QR Code</option>
                              <option value="razorpay">Razorpay Gateway</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Add Player & Occupy Slot
                          </button>
                        </form>
                      </div>

                      {/* Right: Existing registrations list & actions (Read/Update/Delete) */}
                      <div className="xl:col-span-2 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                          <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Registered Players ({allRegistrations.filter(r => r.tournamentId === selectedSlotTournament.id).length})</h4>
                          <div className="relative w-full sm:max-w-[200px]">
                            <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search gamers..."
                              value={slotSearchQuery}
                              onChange={(e) => setSlotSearchQuery(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                            />
                          </div>
                        </div>

                        {(() => {
                          const tournamentRegs = allRegistrations.filter(r => r.tournamentId === selectedSlotTournament.id);
                          const filteredRegs = tournamentRegs.filter(r => 
                            r.userName?.toLowerCase().includes(slotSearchQuery.toLowerCase()) || 
                            r.gameUsername?.toLowerCase().includes(slotSearchQuery.toLowerCase()) || 
                            r.userEmail?.toLowerCase().includes(slotSearchQuery.toLowerCase()) ||
                            (r.transactionId || "").toLowerCase().includes(slotSearchQuery.toLowerCase())
                          );

                          if (filteredRegs.length === 0) {
                            return <p className="text-xs text-slate-600 italic py-12 text-center">No registrations match search criteria.</p>;
                          }

                          return (
                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                              {filteredRegs.map((reg) => (
                                <div key={reg.id} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-800 transition">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-200">{reg.userName}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                        reg.paymentStatus === "verified" ? "bg-emerald-500/10 text-emerald-400" :
                                        reg.paymentStatus === "pending" ? "bg-amber-500/10 text-amber-400 animate-pulse" :
                                        "bg-rose-500/10 text-rose-400"
                                      }`}>
                                        {reg.paymentStatus}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{reg.userEmail}</span>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px]">
                                      <span className="text-indigo-400 font-mono font-bold">Gamertag: {reg.gameUsername}</span>
                                      <span className="text-slate-400 font-mono">Ref: {reg.transactionId || "N/A"}</span>
                                      <span className="text-slate-500 capitalize">Via: {reg.paymentMethod || "wallet"}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-1.5 justify-end border-t border-slate-800/60 pt-2.5 sm:pt-0 sm:border-0 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRegistration(reg);
                                        setEditRegGameUsername(reg.gameUsername);
                                        setEditRegPaymentStatus(reg.paymentStatus);
                                        setEditRegTransactionId(reg.transactionId || "");
                                      }}
                                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition"
                                      title="Edit registration details"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeleteRegistration(selectedSlotTournament.id, reg.userId, reg.paymentStatus);
                                      }}
                                      className="p-1 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 rounded cursor-pointer transition"
                                      title="Cancel and Free Slot"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <UserCheck className="h-12 w-12 mx-auto text-slate-800 mb-3" />
                    <p className="text-sm">Select an esports tournament from the sidebar list to inspect occupied slots, list players, manually register users, and edit existing bookings.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Edit Registration */}
      {editingRegistration && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateRegistration();
          }} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 relative shadow-2xl text-white">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Edit Slot Booking</h3>
            <p className="text-xs text-slate-400">Updating booking for <strong>{editingRegistration.userName}</strong> in tournament.</p>
            
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">In-Game Username (Gamertag) *</label>
                <input
                  type="text"
                  required
                  value={editRegGameUsername}
                  onChange={(e) => setEditRegGameUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Payment Status *</label>
                <select
                  value={editRegPaymentStatus}
                  onChange={(e: any) => setEditRegPaymentStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="verified">Verified (Seat Confirmed)</option>
                  <option value="pending">Pending Review</option>
                  <option value="failed">Failed / Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Transaction Ref ID</label>
                <input
                  type="text"
                  value={editRegTransactionId}
                  onChange={(e) => setEditRegTransactionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingRegistration(null)}
                className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: Create/Edit Tournament */}
      {showTournamentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleTournamentSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-4 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {isEditingTournament ? "Edit Tournament Details" : "Create Esports Tournament"}
            </h3>
            
            <button
              type="button"
              onClick={() => setShowTournamentModal(false)}
              className="absolute top-4 right-4 bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-white p-1.5 rounded-full transition"
            >
              ✕
            </button>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Tournament Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FreeFire Championship 2026"
                  value={tournamentTitle}
                  onChange={(e) => setTournamentTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Rules, match format, and maps..."
                  value={tournamentDesc}
                  onChange={(e) => setTournamentDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Game Name *</label>
                  <select
                    value={tournamentGame}
                    onChange={(e) => setTournamentGame(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="Call of Duty">Call of Duty</option>
                    <option value="Free Fire">Free Fire</option>
                    <option value="Valorant">Valorant</option>
                    <option value="Apex Legends">Apex Legends</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Schedule / Date *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. July 15, 08:00 PM IST"
                    value={tournamentDate}
                    onChange={(e) => setTournamentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {tournamentGame === "Free Fire" && (
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Free Fire Mode / Section *</label>
                  <select
                    value={tournamentGameMode}
                    onChange={(e) => setTournamentGameMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Clash Squad 1v1">Clash Squad 1v1</option>
                    <option value="Clash Squad 2v2">Clash Squad 2v2</option>
                    <option value="Clash Squad 4v4">Clash Squad 4v4</option>
                    <option value="Battle Royal Survival">Battle Royal Survival</option>
                    <option value="Battle Royal">Battle Royal</option>
                    <option value="Lone Wolf 1v1">Lone Wolf 1v1</option>
                    <option value="Lone Wolf 2v2">Lone Wolf 2v2</option>
                    <option value="Free Tournament">Free Tournament</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Custom Prize Breakdowns Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Player: 50, 2nd Player: 20, 3rd Player: 10"
                  value={tournamentPrizeDesc}
                  onChange={(e) => setTournamentPrizeDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Entry Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0 for Free"
                    value={tournamentFee}
                    onChange={(e) => setTournamentFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Prize Pool (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Prize money"
                    value={tournamentPrize}
                    onChange={(e) => setTournamentPrize(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Player Limit (Max Slots)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={tournamentMaxPlayers}
                    onChange={(e) => setTournamentMaxPlayers(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Banner Image URL</label>
                <input
                  type="text"
                  placeholder="Direct image URL"
                  value={tournamentBannerUrl}
                  onChange={(e) => setTournamentBannerUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                />
                
                {/* Banner Presets selector */}
                <div className="mt-2 flex gap-2">
                  {bannerPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setTournamentBannerUrl(preset.url)}
                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:border-slate-500 text-[10px] text-slate-300 transition cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition mt-6"
            >
              {isEditingTournament ? "Save Tournament Updates" : "Create Esports Tournament"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL 2: Release Room Credentials */}
      {selectedRoomTournament && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReleaseKeys} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 relative shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Key className="h-5 w-5 text-amber-400 animate-bounce" />
              <span>Deploy Game Room Keycards</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Input the Match lobby room coordinates for **{selectedRoomTournament.title}**. This will instantly broadcast live keys to all verified registered players of this match.
            </p>

            <button
              type="button"
              onClick={() => setSelectedRoomTournament(null)}
              className="absolute top-4 right-4 bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-white p-1 rounded-full transition"
            >
              ✕
            </button>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Room ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2930283"
                  value={roomID}
                  onChange={(e) => setRoomID(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Room Password *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. battlepass123"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isReleasingKeys}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition mt-4 disabled:opacity-50"
            >
              {isReleasingKeys ? "Broadcasting Keycards..." : "Deploy Room Keys & Notify Players"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL 3: Declare Winners & End Tournament */}
      {selectedWinnersTournament && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDeclareWinners} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 relative shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span>Conclude Match & Declare Winners</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define the customized winnings distribution for verified players of **{selectedWinnersTournament.title}** (Tournament Prize Pool: **₹{selectedWinnersTournament.prizePool}**).
            </p>

            <button
              type="button"
              onClick={() => setSelectedWinnersTournament(null)}
              className="absolute top-4 right-4 bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-white p-1 rounded-full transition"
            >
              ✕
            </button>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-400">
                  Configure Winners & Winnings *
                </label>
                <button
                  type="button"
                  onClick={() => setWinnerRows([...winnerRows, { userId: "", username: "", rank: `${winnerRows.length + 1}nd Player`, amount: 0 }])}
                  className="text-[10px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded cursor-pointer transition"
                >
                  <Plus className="h-3 w-3" /> Add Winner Row
                </button>
              </div>

              {verifiedRegs.length === 0 ? (
                <div className="text-center py-6 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                  No verified players are registered for this tournament.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {winnerRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2 border border-slate-800 rounded-xl relative">
                      {/* Rank Input */}
                      <div className="w-20">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1st Player"
                          value={row.rank}
                          onChange={(e) => {
                            const newRows = [...winnerRows];
                            newRows[idx].rank = e.target.value;
                            setWinnerRows(newRows);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] font-bold text-white focus:outline-none"
                        />
                      </div>

                      {/* Username Dropdown */}
                      <div className="flex-1">
                        <select
                          required
                          value={row.userId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const foundReg = verifiedRegs.find(r => r.userId === val);
                            const newRows = [...winnerRows];
                            newRows[idx].userId = val;
                            newRows[idx].username = foundReg ? foundReg.userName : "";
                            setWinnerRows(newRows);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Choose Player --</option>
                          {verifiedRegs.map((reg) => (
                            <option key={reg.id} value={reg.userId}>
                              {reg.gameUsername} ({reg.userName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Prize Amount Input */}
                      <div className="w-16">
                        <input
                          type="number"
                          placeholder="₹"
                          required
                          value={row.amount || ""}
                          onChange={(e) => {
                            const newRows = [...winnerRows];
                            newRows[idx].amount = parseFloat(e.target.value) || 0;
                            setWinnerRows(newRows);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] font-mono text-amber-400 font-bold focus:outline-none text-right"
                        />
                      </div>

                      {/* Remove Button */}
                      {winnerRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWinnerRows(winnerRows.filter((_, rIdx) => rIdx !== idx))}
                          className="p-1 text-slate-500 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Total Allocated:</span>
                <span className="font-bold text-amber-400 text-xs font-mono">
                  ₹{winnerRows.reduce((sum, r) => sum + r.amount, 0)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isDeclaringWinners || verifiedRegs.length === 0}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition mt-4 disabled:opacity-50"
            >
              {isDeclaringWinners ? "Concluding Match..." : "Distribute Custom Prizes & End Tournament"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
