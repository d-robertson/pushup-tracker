import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pushup Tracker - 100 Pushups Challenge",
  description: "Track your journey to 36,500 pushups in 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
