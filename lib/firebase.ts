import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForStaticBuildsOnly1234",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eventradar-f59b9.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://eventradar-f59b9-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eventradar-f59b9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eventradar-f59b9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Safe helper to avoid crashes during static prerendering / CI builds without live credentials
function safeInit<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (typeof window !== "undefined") {
      console.warn("[Firebase] Service initialization warning:", err);
    }
    return {} as T;
  }
}

// Initialize Firebase as a singleton to avoid duplicate app errors in Next.js SSR & hot reloads
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : safeInit(() => initializeApp(firebaseConfig));

// Firebase Services
export const auth: Auth = safeInit(() => getAuth(app));
export const db: Firestore = safeInit(() => getFirestore(app));
export const rtdb: Database = safeInit(() => getDatabase(app));
export const storage: FirebaseStorage = safeInit(() => getStorage(app));

// Browser-safe Analytics initialization
let analyticsInstance: Analytics | null = null;
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window !== "undefined" && !analyticsInstance) {
    try {
      const supported = await isSupported();
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    } catch (err) {
      console.warn("[Firebase] Analytics not supported in this environment:", err);
    }
  }
  return analyticsInstance;
}

export default app;
