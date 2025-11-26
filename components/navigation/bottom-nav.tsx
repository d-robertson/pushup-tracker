"use client";

import { PlusCircle, BarChart3, Trophy, Calendar, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

type TabType = "add" | "stats" | "achievements" | "history" | "admin";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { isAdmin } = useAuth();

  return (
    <nav
      style={{
        height: "100px",
        margin: "8px",
        borderRadius: "16px",
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#ffffff",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => onTabChange("add")}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: activeTab === "add" ? "#dbeafe" : "transparent",
          color: activeTab === "add" ? "#2563eb" : "#6b7280",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <PlusCircle style={{ width: "32px", height: "32px" }} />
      </button>

      <button
        onClick={() => onTabChange("stats")}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: activeTab === "stats" ? "#dbeafe" : "transparent",
          color: activeTab === "stats" ? "#2563eb" : "#6b7280",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <BarChart3 style={{ width: "32px", height: "32px" }} />
      </button>

      <button
        onClick={() => onTabChange("achievements")}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: activeTab === "achievements" ? "#dbeafe" : "transparent",
          color: activeTab === "achievements" ? "#2563eb" : "#6b7280",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <Trophy style={{ width: "32px", height: "32px" }} />
      </button>

      <button
        onClick={() => onTabChange("history")}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: activeTab === "history" ? "#dbeafe" : "transparent",
          color: activeTab === "history" ? "#2563eb" : "#6b7280",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <Calendar style={{ width: "32px", height: "32px" }} />
      </button>

      {isAdmin && (
        <button
          onClick={() => onTabChange("admin")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: activeTab === "admin" ? "#dbeafe" : "transparent",
            color: activeTab === "admin" ? "#2563eb" : "#6b7280",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Shield style={{ width: "32px", height: "32px" }} />
        </button>
      )}
    </nav>
  );
}
