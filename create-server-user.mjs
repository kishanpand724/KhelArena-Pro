import fs from "fs";
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

async function createServerUser() {
  const apiKey = firebaseConfig.apiKey;
  const email = "server@ai-studio.local";
  const password = "SuperSecretServerPassword123";

  // 1. Try to sign up
  let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  let data = await res.json();
  if (data.error && data.error.message === "EMAIL_EXISTS") {
    console.log("User already exists, trying to sign in...");
    // 2. Sign in
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    data = await res.json();
  }

  if (data.idToken) {
    console.log("SUCCESS. UID:", data.localId);
  } else {
    console.log("ERROR:", data);
  }
}
createServerUser();
