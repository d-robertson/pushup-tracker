/**
 * Notification Service
 * Handles Web Push notifications for the PWA
 */

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  canRequest: boolean;
}

/**
 * Check if notifications are supported in this browser
 */
export function areNotificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!areNotificationsSupported()) {
    return { granted: false, denied: false, canRequest: false };
  }

  const permission = Notification.permission;

  return {
    granted: permission === "granted",
    denied: permission === "denied",
    canRequest: permission === "default",
  };
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.warn("Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("Notifications permission denied");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Show a local notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!areNotificationsSupported()) {
    console.warn("Notifications not supported");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  try {
    // Try to use service worker if available
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        badge: "/icon-192x192.png",
        icon: "/icon-192x192.png",
        ...options,
      });
    } else {
      // Fallback to regular notification
      new Notification(title, options);
    }
  } catch (error) {
    console.error("Error showing notification:", error);
  }
}

/**
 * Schedule a daily reminder notification
 */
export function scheduleDailyReminder(hour: number = 20, minute: number = 0): void {
  if (!areNotificationsSupported() || Notification.permission !== "granted") {
    return;
  }

  // Calculate time until next reminder
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hour, minute, 0, 0);

  // If reminder time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const timeUntilReminder = reminderTime.getTime() - now.getTime();

  // Schedule the reminder
  setTimeout(() => {
    showDailyReminderNotification();
    // Reschedule for next day
    setTimeout(() => scheduleDailyReminder(hour, minute), 24 * 60 * 60 * 1000);
  }, timeUntilReminder);
}

/**
 * Show daily reminder notification
 */
async function showDailyReminderNotification(): Promise<void> {
  await showNotification("Don't forget your pushups!", {
    body: "Keep your streak alive! Log your pushups for today.",
    tag: "daily-reminder",
    requireInteraction: false,
  });
}

/**
 * Show milestone notification
 */
export async function showMilestoneNotification(
  milestone: number,
  totalPushups: number
): Promise<void> {
  const milestoneLabels: Record<number, string> = {
    100: "First Century!",
    1000: "Thousand Club!",
    5000: "Five Grand!",
    10000: "Ten Thousand Strong!",
    20000: "Twenty K Champion!",
    36500: "Goal Complete!",
  };

  const label = milestoneLabels[milestone] || `${milestone} Pushups!`;

  await showNotification(`🎉 ${label}`, {
    body: `Congratulations! You've completed ${totalPushups.toLocaleString()} pushups!`,
    tag: `milestone-${milestone}`,
    requireInteraction: true,
  });
}

/**
 * Show streak notification
 */
export async function showStreakNotification(streakDays: number): Promise<void> {
  const streakEmojis: Record<number, string> = {
    3: "🌟",
    7: "⭐",
    14: "🌠",
    30: "🔆",
    50: "☀️",
    100: "🌞",
    365: "🏅",
  };

  const emoji = streakEmojis[streakDays] || "🔥";

  await showNotification(`${emoji} ${streakDays}-Day Streak!`, {
    body: `You've logged pushups ${streakDays} days in a row. Keep it up!`,
    tag: `streak-${streakDays}`,
    requireInteraction: false,
  });
}

/**
 * Show encouragement notification
 */
export async function showEncouragementNotification(
  todayCount: number,
  target: number
): Promise<void> {
  const percentage = Math.round((todayCount / target) * 100);

  await showNotification(`You're ${percentage}% there!`, {
    body: `${todayCount} of ${target} pushups done. Keep going!`,
    tag: "encouragement",
    requireInteraction: false,
  });
}

/**
 * Save notification preference to localStorage
 */
export function saveNotificationPreference(enabled: boolean, reminderTime?: string): void {
  localStorage.setItem("notifications_enabled", enabled.toString());
  if (reminderTime) {
    localStorage.setItem("reminder_time", reminderTime);
  }
}

/**
 * Get notification preference from localStorage
 */
export function getNotificationPreference(): { enabled: boolean; reminderTime: string } {
  const enabled = localStorage.getItem("notifications_enabled") === "true";
  const reminderTime = localStorage.getItem("reminder_time") || "20:00";
  return { enabled, reminderTime };
}
