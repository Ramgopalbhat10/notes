"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (!window.isSecureContext) {
      return;
    }

    const isDev = process.env.NODE_ENV !== "production";
    const enabledInDev = process.env.NEXT_PUBLIC_ENABLE_PWA_IN_DEV === "true";
    if (isDev && !enabledInDev) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Failed to register service worker", error);
    });
  }, []);

  return null;
}
