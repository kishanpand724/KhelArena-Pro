import { Timestamp } from "firebase/firestore";

export interface UserStats {
  matchesPlayed: number;
  wins: number;
  kills: number;
  winRate: number;
  totalEarnings: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'super_admin';
  walletBalance: number; // Total balance (winnings + deposit + bonus)
  winningBalance: number; // Balance that can be withdrawn
  bonusBalance: number; // Bonus balance
  depositBalance?: number; // Balance deposited by user
  totalDeposited?: number; // Total amount deposited
  totalWithdrawn?: number; // Total amount withdrawn
  totalWinnings?: number; // Total winnings earned
  referralBalance: number; // Referral earnings
  referralCode: string;
  referredBy?: string;
  statistics?: UserStats;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  gameName: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  registeredPlayersCount: number;
  startDate: string; // Keep for backward compatibility
  matchDate?: string;
  matchTime?: string;
  registrationDeadline?: string;
  roomReleaseTime?: string;
  map?: string;
  rules?: string;
  killPointSystem?: string;
  rankPointSystem?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'registration_open' | 'registration_closed' | 'payment_pending' | 'room_released' | 'match_live' | 'cancelled';
  bannerUrl: string;
  upiId: string;
  qrCodeUrl: string;
  roomID?: string;
  roomPassword?: string;
  winners?: string[]; // user display names or userIds who won
  winnerDistributions?: { username: string; rank: string; amount: number; userId?: string }[];
  prizeDistributionDesc?: string;
  gameMode?: string; // Solo, Duo, Squad, Clash Squad
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface Registration {
  id: string; // userId (enforces single registration per user)
  userId: string;
  userEmail: string;
  userName: string;
  gameUsername: string;
  paymentStatus: 'pending' | 'verified' | 'failed';
  transactionId?: string;
  paymentScreenshotUrl?: string;
  paymentMethod?: 'wallet' | 'razorpay' | 'upi';
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_payout' | 'referral_bonus' | 'refund' | 'cashback';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  paymentSenderName?: string;
  paymentMethod?: 'wallet' | 'upi' | 'razorpay';
  createdAt: Timestamp | any;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: 'room_details' | 'payment_verified' | 'announcement' | 'prize' | 'wallet_update' | 'referral';
  createdAt: Timestamp | any;
}

export interface AppSettings {
  upiId: string;
  qrCodeUrl: string;
  razorpayId?: string;
  enableRazorpay?: boolean;
  referralRewardAmount?: number; // amount given to both inviter and invitee
  faqList?: { question: string; answer: string }[];
}

export interface AdminUpdate {
  id: string;
  adminEmail: string;
  type: 'tournament_created' | 'tournament_updated' | 'tournament_deleted' | 'room_released' | 'winners_announced' | 'payment_verified' | 'payout_processed' | 'wallet_adjustment' | 'settings_updated';
  title: string;
  message: string;
  createdAt: Timestamp | any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'resolved' | 'closed';
  messages: {
    sender: 'user' | 'admin';
    text: string;
    createdAt: string;
  }[];
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  value: number; // e.g. 10 for 10% or ₹10 flat
  minEntryFee: number;
  usageLimit: number;
  usedCount: number;
  expiryDate: string; // ISO date string
  createdAt: Timestamp | any;
}
