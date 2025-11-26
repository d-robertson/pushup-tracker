/**
 * Type-safe wrappers for Supabase RPC functions
 *
 * This file provides properly typed wrappers around Supabase RPC calls
 * to ensure type safety throughout the application.
 */

import { createClient } from "./client";
import type { Database } from "@/types/database.types";

type RpcFunctions = Database["public"]["Functions"];

/**
 * Type-safe RPC caller
 */
export async function callRpc<T extends keyof RpcFunctions>(
  functionName: T,
  args: RpcFunctions[T]["Args"]
): Promise<{ data: RpcFunctions[T]["Returns"] | null; error: Error | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc(
      functionName as string,
      args as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    if (error) {
      return { data: null, error };
    }

    return { data: data as RpcFunctions[T]["Returns"], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Convenience wrappers for specific RPC functions

export async function getUserByDevice(deviceId: string) {
  return callRpc("get_user_by_device", { p_device_id: deviceId });
}

export async function getUserByDeviceId(deviceId: string) {
  return callRpc("get_user_by_device_id", { p_device_id: deviceId });
}

export async function createDeviceUser(params: {
  deviceId: string;
  deviceName: string;
  deviceFingerprint: string;
  email: string | null;
  invitedBy: string | null;
}) {
  return callRpc("create_device_user", {
    p_device_id: params.deviceId,
    p_device_name: params.deviceName,
    p_device_fingerprint: params.deviceFingerprint,
    p_email: params.email,
    p_invited_by: params.invitedBy,
  });
}

export async function getPendingAccessRequests() {
  return callRpc("get_pending_access_requests", {});
}

export async function approveAccessRequest(requestId: string, displayName?: string) {
  return callRpc("approve_access_request", {
    p_request_id: requestId,
    p_display_name: displayName || null,
  });
}

export async function rejectAccessRequest(requestId: string) {
  return callRpc("reject_access_request", { p_request_id: requestId });
}

export async function deleteUser(userId: string) {
  return callRpc("delete_user", { p_user_id: userId });
}

export async function requestAccess(deviceId: string, requestedName: string) {
  return callRpc("request_access", {
    p_device_id: deviceId,
    p_requested_name: requestedName,
  });
}

export async function redeemInvitation(params: {
  deviceId: string;
  deviceName: string;
  deviceFingerprint: string;
  email: string | null;
  invitedBy: string;
}) {
  return callRpc("redeem_invitation", {
    p_device_id: params.deviceId,
    p_device_name: params.deviceName,
    p_device_fingerprint: params.deviceFingerprint,
    p_email: params.email,
    p_invited_by: params.invitedBy,
  });
}

export async function awardAchievement(userId: string, achievementId: string) {
  return callRpc("award_achievement", {
    p_user_id: userId,
    p_achievement_id: achievementId,
  });
}

export async function getAchievementsWithProgress(userId: string) {
  return callRpc("get_achievements_with_progress", { p_user_id: userId });
}

export async function getUserAchievements(userId: string) {
  return callRpc("get_user_achievements", { p_user_id: userId });
}

export async function getLatestProgression(userId: string) {
  return callRpc("get_latest_progression", { p_user_id: userId });
}

export async function getProgressionHistory(userId: string, days: number) {
  return callRpc("get_progression_history", {
    p_user_id: userId,
    p_days: days,
  });
}

export async function createProgressionSnapshot(userId: string, snapshotDate: string) {
  return callRpc("create_progression_snapshot", {
    p_user_id: userId,
    p_snapshot_date: snapshotDate,
  });
}

export async function addPushups(userId: string, count: number, notes?: string) {
  return callRpc("add_pushups", {
    p_user_id: userId,
    p_count: count,
    p_notes: notes || null,
  });
}

export async function getTodaysPushups(userId: string) {
  return callRpc("get_todays_pushups", { p_user_id: userId });
}

export async function getPushupHistory(userId: string, days?: number) {
  return callRpc("get_pushup_history", {
    p_user_id: userId,
    p_days: days,
  });
}

export async function getUserPushupStats(userId: string) {
  return callRpc("get_user_pushup_stats", { p_user_id: userId });
}

export async function getLeaderboard() {
  return callRpc("get_leaderboard", {});
}
