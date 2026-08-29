const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Replace getRazorpayConfig
const getRazorpayConfigRegex = /async function getRazorpayConfig\(\) \{[\s\S]*?^}/m;
code = code.replace(getRazorpayConfigRegex, `async function getRazorpayConfig() {
  // Store all payment configuration securely using environment variables
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  };
}`);

// 2. Replace the admin post config to write to .env
const adminPostRegex = /\/\/ Update secure Razorpay credentials \(Super Admin only\)[\s\S]*?^\}\);/m;
code = code.replace(adminPostRegex, `// Update secure Razorpay credentials (Super Admin only)
app.post("/api/admin/razorpay-config", verifySuperAdmin, async (req, res) => {
  try {
    const { keyId, keySecret, webhookSecret } = req.body;
    
    // Never store payment secrets in Firestore or local JSON files.
    // We update the environment variables directly and optionally a .env file for persistence in the workspace
    if (keyId) process.env.RAZORPAY_KEY_ID = keyId;
    if (keySecret) process.env.RAZORPAY_KEY_SECRET = keySecret;
    if (webhookSecret) process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    
    const envContent = \`RAZORPAY_KEY_ID=\${keyId || ''}\\nRAZORPAY_KEY_SECRET=\${keySecret || ''}\\nRAZORPAY_WEBHOOK_SECRET=\${webhookSecret || ''}\\n\`;
    fs.writeFileSync('.env', envContent);

    // Reset lazy instance to force recreation with new keys next time
    razorpayInstance = null;
    res.json({ success: true, message: "Secure Razorpay configuration updated successfully in environment variables!" });
  } catch (error: any) {
    console.error("Error saving secure config:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});`);

// 3. Replace create order API to log to payment_logs and payments
const createOrderRegex = /\/\/ Create Order API[\s\S]*?^\}\);/m;
code = code.replace(createOrderRegex, `// Create Order API
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, receipt, notes, userId } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const rzp = await getRazorpay();
    
    let orderId = "";
    let responseObj = null;

    if (!rzp) {
      // Return a simulated order for development/sandbox mode when credentials are not supplied
      orderId = "order_mock_" + crypto.randomBytes(8).toString("hex");
      responseObj = {
        id: orderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: receipt || "receipt_123",
        status: "created",
        isMock: true,
      };
    } else {
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: receipt || \`receipt_\${Date.now()}\`,
        notes: notes || {},
      };
      const order = await rzp.orders.create(options);
      orderId = order.id;
      responseObj = order;
    }

    // Proper Firestore collections: payments
    const paymentDocRef = doc(serverDb, "payments", orderId);
    await setDoc(paymentDocRef, {
      serverSecret: "ai_studio_secret_handshake_987654321",
      orderId,
      userId: userId || "unknown",
      amount: Math.round(amount * 100) / 100,
      status: "created",
      provider: "razorpay",
      createdAt: serverTimestamp()
    });

    // Complete logging for every payment
    const logRef = doc(collection(serverDb, "payment_logs"));
    await setDoc(logRef, {
      serverSecret: "ai_studio_secret_handshake_987654321",
      action: "create_order",
      orderId,
      userId: userId || "unknown",
      amount,
      createdAt: serverTimestamp()
    });

    res.json(responseObj);
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});`);

fs.writeFileSync('server.ts', code);
console.log("Refactored parts 1-3");
