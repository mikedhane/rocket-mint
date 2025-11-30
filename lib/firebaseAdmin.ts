// lib/firebaseAdmin.ts
//import admin from "firebase-admin";

//if (!admin.apps.length) {
//  admin.initializeApp({
//    credential: admin.credential.cert({
//      projectId: process.env.FIREBASE_PROJECT_ID,
//      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//    }),
//    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//  });
//}

//export const bucket = admin.storage().bucket();
//export const db = admin.firestore();
// lib/firebaseAdmin.ts// lib/firebaseAdmin.ts
import admin, { ServiceAccount } from "firebase-admin";

declare global {
  // Allow global caching of the admin app + firestore config in dev/hot-reload
  // eslint-disable-next-line no-var
  var __firebaseAdminApp__: admin.app.App | undefined;
  // eslint-disable-next-line no-var
  var __firestoreConfigured__: boolean | undefined;
}

function getFirebaseApp(): admin.app.App {
  // If we've already initialized in this runtime (dev/hot reload), reuse it
  if (global.__firebaseAdminApp__) {
    console.log("[Runtime] Reusing existing Firebase app");
    return global.__firebaseAdminApp__;
  }

  // Try to get existing app first
  try {
    if (admin.apps.length > 0) {
      console.log("[Runtime] Found existing Firebase app, reusing");
      const app = admin.app();
      global.__firebaseAdminApp__ = app;
      return app;
    }
  } catch (e) {
    console.log("[Runtime] No existing app found, will initialize new one");
  }

  // Check if we have explicit credentials (for local development)
  const hasExplicitCredentials =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "rocket-mint.firebasestorage.app";

  console.log("[Runtime] Initializing Firebase Admin SDK...");
  console.log("[Runtime] Has explicit credentials:", !!hasExplicitCredentials);
  console.log("[Runtime] Storage bucket:", storageBucket);
  console.log("[Runtime] NODE_ENV:", process.env.NODE_ENV);
  console.log("[Runtime] GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

  try {
    if (hasExplicitCredentials) {
      // Local dev / custom service account from .env.local
      console.log("[Runtime] Using explicit service account credentials");
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket,
      });
    } else {
      // Production: use application default credentials
      console.log("[Runtime] Using application default credentials");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket,
      });
    }

    console.log("[Runtime] Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("[Runtime] Failed to initialize Firebase Admin SDK:", error);
    console.error("[Runtime] Error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  const app = admin.app();
  global.__firebaseAdminApp__ = app;
  return app;
}

// Cached instances
let _db: admin.firestore.Firestore | null = null;
let _bucket: ReturnType<admin.storage.Storage["bucket"]> | null = null;

// Lazy getters for Firestore and Storage - only initialize when accessed
export function getDb(): admin.firestore.Firestore {
  console.log("[Runtime] getDb() called");
  if (_db) {
    console.log("[Runtime] Returning cached Firestore instance");
    return _db;
  }

  console.log("[Runtime] Creating new Firestore instance");
  const app = getFirebaseApp();
  _db = app.firestore();

  // Configure Firestore once
  if (!global.__firestoreConfigured__) {
    _db.settings({ ignoreUndefinedProperties: true });
    global.__firestoreConfigured__ = true;
  }

  return _db;
}

export function getBucket() {
  console.log("[Runtime] getBucket() called");
  if (_bucket) {
    console.log("[Runtime] Returning cached bucket instance");
    return _bucket;
  }

  console.log("[Runtime] Creating new bucket instance");
  const app = getFirebaseApp();
  _bucket = app.storage().bucket();
  return _bucket;
}

// Legacy exports for backwards compatibility - use getDb() and getBucket() instead
export const db = getDb;
export const bucket = getBucket;
