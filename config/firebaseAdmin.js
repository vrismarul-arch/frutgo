// ============================================================
// config/firebaseAdmin.js
// Initializes the Firebase Admin SDK once for the whole app.
// ============================================================
//
// SETUP:
// 1. Firebase Console -> Project Settings -> Service Accounts
//    -> "Generate new private key" -> downloads a JSON file.
// 2. DO NOT commit that JSON file to git.
// 3. Two ways to load it (pick one):
//
//    A) File on disk (simplest for a VPS):
//       - Save it as backend/config/serviceAccountKey.json
//       - Add "config/serviceAccountKey.json" to .gitignore
//
//    B) Environment variable (better for Render/Railway/Heroku):
//       - Put the ENTIRE JSON content (minified) into an env var
//         called FIREBASE_SERVICE_ACCOUNT
// ============================================================

const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Option B: from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Option A: from local file
  serviceAccount = require("./serviceAccountKey.json");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;