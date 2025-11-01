// utils/firebaseAdmin.js
const admin = require("firebase-admin");

// Load ENV variable (stringified JSON)
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in environment variables");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);

  // Fix newlines for private_key (common Render/Vercel issue)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} catch (err) {
  console.error("❌ Invalid FIREBASE_SERVICE_ACCOUNT JSON format:", err);
  process.exit(1);
}

// Initialize Firebase only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} 

module.exports = admin;
