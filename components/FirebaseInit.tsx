"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase";

export default function FirebaseInit() {
  useEffect(() => {
    // Safely initialize analytics in the browser
    getFirebaseAnalytics().catch((err) => {
      console.warn("[Firebase] Could not initialize analytics:", err);
    });
  }, []);

  return null;
}
