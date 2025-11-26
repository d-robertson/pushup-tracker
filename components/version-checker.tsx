"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Change this version number with each deployment
const CURRENT_VERSION = "1.0.0";

export function VersionChecker() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Check version on mount
    const storedVersion = localStorage.getItem("app_version");

    if (storedVersion && storedVersion !== CURRENT_VERSION) {
      // Version mismatch - show update prompt
      setShowUpdatePrompt(true);
    } else {
      // Store current version
      localStorage.setItem("app_version", CURRENT_VERSION);
    }

    // Check for updates every 5 minutes
    const interval = setInterval(
      () => {
        const currentStoredVersion = localStorage.getItem("app_version");
        if (currentStoredVersion !== CURRENT_VERSION) {
          setShowUpdatePrompt(true);
        }
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    // Clear all caches and reload
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    localStorage.setItem("app_version", CURRENT_VERSION);
    window.location.reload();
  };

  if (!showUpdatePrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        backgroundColor: "#2563eb",
        color: "white",
        padding: "12px 20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span style={{ fontSize: "14px", fontWeight: 500 }}>New version available!</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUpdate}
        style={{ backgroundColor: "white", color: "#2563eb" }}
      >
        Update Now
      </Button>
    </div>
  );
}
