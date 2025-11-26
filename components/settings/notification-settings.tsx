"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle } from "lucide-react";
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  saveNotificationPreference,
  getNotificationPreference,
  scheduleDailyReminder,
} from "@/lib/notifications/notification-service";

export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<ReturnType<typeof getNotificationPermission>>({
    granted: false,
    denied: false,
    canRequest: false,
  });
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const isSupported = areNotificationsSupported();
    setSupported(isSupported);

    if (isSupported) {
      const perm = getNotificationPermission();
      setPermission(perm);

      const prefs = getNotificationPreference();
      setEnabled(prefs.enabled && perm.granted);
      setReminderTime(prefs.reminderTime);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermission();

    if (granted) {
      setEnabled(true);
      setPermission(getNotificationPermission());
      saveNotificationPreference(true, reminderTime);

      // Schedule daily reminder
      const [hour, minute] = reminderTime.split(":").map(Number);
      scheduleDailyReminder(hour, minute);
    }

    setRequesting(false);
  };

  const handleDisableNotifications = () => {
    setEnabled(false);
    saveNotificationPreference(false, reminderTime);
  };

  const handleTimeChange = (newTime: string) => {
    setReminderTime(newTime);
    if (enabled) {
      saveNotificationPreference(true, newTime);

      // Reschedule with new time
      const [hour, minute] = newTime.split(":").map(Number);
      scheduleDailyReminder(hour, minute);
    }
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support notifications. Try using Chrome, Firefox, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          {permission.granted && enabled && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Enabled
            </Badge>
          )}
        </div>
        <CardDescription>Get daily reminders and milestone celebrations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission.denied && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Notifications have been blocked. To enable them, please allow notifications in your
              browser settings.
            </p>
          </div>
        )}

        {!permission.granted && !permission.denied && (
          <div>
            <p className="text-sm mb-4">Enable notifications to receive:</p>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Daily reminders to log your pushups</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Milestone celebrations when you hit goals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Streak notifications to keep you motivated</span>
              </li>
            </ul>
            <Button onClick={handleEnableNotifications} disabled={requesting} className="w-full">
              {requesting ? "Requesting permission..." : "Enable Notifications"}
            </Button>
          </div>
        )}

        {permission.granted && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Notifications</Label>
              <Button
                variant={enabled ? "destructive" : "default"}
                size="sm"
                onClick={enabled ? handleDisableNotifications : handleEnableNotifications}
              >
                {enabled ? "Disable" : "Enable"}
              </Button>
            </div>

            {enabled && (
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Daily Reminder Time</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a reminder at this time each day if you haven't logged your pushups
                  yet.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
