"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Check for updates periodically
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          ); // Check every hour
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("Service Worker updated, reloading...");
        window.location.reload();
      });
    }
  }, []);

  return null;
}
