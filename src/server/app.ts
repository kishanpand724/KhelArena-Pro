import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK using ADC
if (!getApps().length) {
  initializeApp();
}

// Get Database ID from config
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(firebaseConfig.firestoreDatabaseId)
  : getFirestore();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Razorpay Config
async function getRazorpayConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  };
}

let razorpayInstance: any = null;

async function getRazorpay() {
  const config = await getRazorpayConfig();
  if (!config.keyId || !config.keySecret) return null;
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }
  return razorpayInstance;
}

// API Routes
app.get("/api/payment/config", async (req, res) => {
  const config = await getRazorpayConfig();
  res.json({
    configured: !!(config.keyId && config.keySecret),
    keyId: config.keyId || "RAZORPAY_TEST_KEY_ID",
  });
});

app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, receipt, notes, userId } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const rzp = await getRazorpay();
    
    let responseObj: any;

    if (!rzp) {
      const orderId = "order_mock_" + crypto.randomBytes(8).toString("hex");
      responseObj = {
        id: orderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: receipt || "receipt_123",
        status: "created",
        isMock: true,
      };
    } else {
      responseObj = await rzp.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {},
      });
    }

    await db.collection("payments").doc(responseObj.id).set({
      orderId: responseObj.id,
      userId: userId || "unknown",
      amount: Math.round(amount * 100) / 100,
      status: "created",
      provider: "razorpay",
      createdAt: FieldValue.serverTimestamp()
    });

    res.json(responseObj);
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Verification logic (Consolidated)
const handlePaymentVerification = async (req: express.Request, res: express.Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount, isMock } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !userId || !amount) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const numericAmount = parseFloat(amount);
    const config = await getRazorpayConfig();
    const isMockPayment = isMock || razorpay_order_id.startsWith("order_mock_");

    if (!isMockPayment) {
      if (!config.keySecret) throw new Error("Razorpay not configured");
      const generatedSignature = crypto
        .createHmac("sha256", config.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (generatedSignature !== razorpay_signature) throw new Error("Invalid signature");
    }

    const userRef = db.collection("users").doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const lockRef = db.collection("processed_deposits").doc(razorpay_payment_id);
      const lockDoc = await transaction.get(lockRef);
      if (lockDoc.exists) throw new Error("Payment already processed");

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");
      const userData = userSnap.data() || {};

      const currentBalance = userData.walletBalance || 0;
      const currentDeposit = userData.depositBalance || 0;
      const currentTotal = userData.totalDeposited || 0;

      transaction.update(userRef, {
        walletBalance: currentBalance + numericAmount,
        depositBalance: currentDeposit + numericAmount,
        totalDeposited: currentTotal + numericAmount,
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.set(lockRef, {
        userId,
        amount: numericAmount,
        paymentId: razorpay_payment_id,
        processedAt: FieldValue.serverTimestamp()
      });

      const txRef = userRef.collection("transactions").doc();
      transaction.set(txRef, {
        type: "deposit",
        amount: numericAmount,
        status: "completed",
        reference: razorpay_payment_id,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true, verified: true });
  } catch (error: any) {
    console.error("Verification error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Secure Tournament Registration API
app.post("/api/tournament/register", async (req, res) => {
  try {
    const { tournamentId, userId, gameUsername, paymentMethod, promoCode } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const decodedToken = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
    if (decodedToken.uid !== userId) return res.status(403).json({ error: "Forbidden" });

    await db.runTransaction(async (transaction) => {
      const tournamentRef = db.collection("tournaments").doc(tournamentId);
      const userRef = db.collection("users").doc(userId);
      const registrationRef = tournamentRef.collection("registrations").doc(userId);

      const tournamentSnap = await transaction.get(tournamentRef);
      if (!tournamentSnap.exists) throw new Error("Tournament not found");
      const tournamentData = tournamentSnap.data() || {};

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("User profile not found");
      const userData = userSnap.data() || {};

      let entryFee = tournamentData.entryFee || 0;

      if (paymentMethod === "wallet") {
        if ((userData.walletBalance || 0) < entryFee) throw new Error("Insufficient balance");
        transaction.update(userRef, {
          walletBalance: FieldValue.increment(-entryFee),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      transaction.set(registrationRef, {
        userId,
        gameUsername,
        paymentStatus: "verified",
        paymentMethod,
        createdAt: FieldValue.serverTimestamp()
      });

      transaction.update(tournamentRef, {
        registeredPlayersCount: FieldValue.increment(1)
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Razorpay Webhook
app.post("/api/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const config = await getRazorpayConfig();
    if (!signature || !config.webhookSecret) return res.status(400).json({ error: "Missing signature" });

    const expectedSignature = crypto
      .createHmac("sha256", config.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== signature) return res.status(400).json({ error: "Invalid signature" });
    res.json({ status: "ok" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/payment/verify", handlePaymentVerification);
app.post("/api/payment/deposit-verify", handlePaymentVerification);

// Admin Middleware
async function verifySuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    const decodedToken = await getAuth().verifyIdToken(token);
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "super_admin") {
      return res.status(403).json({ error: "Not admin" });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/admin/razorpay-config", verifySuperAdmin, (req, res) => res.json({}));
app.post("/api/admin/razorpay-config", verifySuperAdmin, async (req, res) => {
  const { keyId, keySecret, webhookSecret } = req.body;
  process.env.RAZORPAY_KEY_ID = keyId;
  process.env.RAZORPAY_KEY_SECRET = keySecret;
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
  res.json({ success: true });
});

export default app;
