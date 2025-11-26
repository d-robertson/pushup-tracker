"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Header } from "@/components/layouts/header";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const router = useRouter();

  const handleThemeToggle = () => {
    const html = document.documentElement;
    const currentTheme = html.classList.contains("dark") ? "dark" : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    html.classList.remove(currentTheme);
    html.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-8 w-8" />
                Settings
              </h1>
              <p className="text-muted-foreground mt-2">Customize your experience</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>

          {/* Notifications */}
          <NotificationSettings />

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleThemeToggle}>
                  <Moon className="h-4 w-4 mr-2" />
                  Toggle Theme
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Challenge Info */}
          <Card>
            <CardHeader>
              <CardTitle>Challenge Details</CardTitle>
              <CardDescription>36,500 pushups in 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Start Date</span>
                <span className="text-sm font-medium">January 1, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">End Date</span>
                <span className="text-sm font-medium">December 31, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Daily Target</span>
                <span className="text-sm font-medium">100 pushups</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Days</span>
                <span className="text-sm font-medium">365 days</span>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>Pushup Tracker v1.0.0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                A Progressive Web App to track your pushup challenge journey. Built with Next.js,
                Supabase, and determination.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
