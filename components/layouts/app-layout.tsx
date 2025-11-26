"use client";

import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "hsl(var(--background))",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowX: "hidden",
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
