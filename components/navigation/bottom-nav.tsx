"use client";

import { PlusCircle, BarChart3, Trophy, Calendar } from "lucide-react";

type TabType = "add" | "stats" | "leaderboard" | "history";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
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
        onClick={() => onTabChange("leaderboard")}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: activeTab === "leaderboard" ? "#dbeafe" : "transparent",
          color: activeTab === "leaderboard" ? "#2563eb" : "#6b7280",
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
    </nav>
  );
}
