"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeviceIdService } from "./device-id";

// Profile type with device fields
interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  device_id: string | null;
  device_name: string | null;
  device_fingerprint: string | null;
  last_seen_at: string | null;
  invited_by: string | null;
  invited_at: string | null;
  onboarded_at: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  profile: Profile | null;
  deviceId: string | null;
  loading: boolean;
  isAdmin: boolean;
  authenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfileByDeviceId = async (devId: string): Promise<Profile | null> => {
    try {
      // @ts-expect-error - RPC function types will be properly inferred after migration
      const { data, error } = await supabase.rpc("get_user_by_device_id", {
        p_device_id: devId,
      });

      if (error) {
        console.error("Error fetching profile by device ID:", error);
        return null;
      }

      // @ts-expect-error - Types will be correct after migration
      if (!data || data.length === 0) {
        return null;
      }

      // Map RPC result to Profile
      const userData = data[0];
      const { data: fullProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        // @ts-expect-error - Types will be correct after migration
        .eq("id", userData.user_id)
        .single();

      if (profileError) {
        console.error("Error fetching full profile:", profileError);
        return null;
      }

      return fullProfile;
    } catch (error) {
      console.error("Error in fetchProfileByDeviceId:", error);
      return null;
    }
  };

  const updateLastSeen = async (profileId: string) => {
    try {
      await supabase
        .from("profiles")
        // @ts-expect-error - Types will be correct after migration
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", profileId);
    } catch (error) {
      console.error("Error updating last_seen_at:", error);
    }
  };

  const refreshProfile = async () => {
    if (!deviceId) return;

    const fetchedProfile = await fetchProfileByDeviceId(deviceId);
    if (fetchedProfile) {
      setProfile(fetchedProfile);
      await updateLastSeen(fetchedProfile.id);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get or create device ID
        const devId = await DeviceIdService.getOrCreateDeviceId();
        setDeviceId(devId);

        // Validate fingerprint (ensure device hasn't changed significantly)
        const isValid = await DeviceIdService.validateFingerprint();
        if (!isValid) {
          console.warn("Device fingerprint has changed significantly");
          // Still continue - we'll handle this in the UI if needed
        }

        // Try to fetch profile with this device ID
        const fetchedProfile = await fetchProfileByDeviceId(devId);

        if (fetchedProfile) {
          setProfile(fetchedProfile);
          await updateLastSeen(fetchedProfile.id);
        } else {
          // Device ID not found in database
          // User needs to accept invitation or is on admin setup page
          setProfile(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const isAdmin = profile?.is_admin ?? false;
  const authenticated = profile !== null;

  return (
    <AuthContext.Provider
      value={{
        profile,
        deviceId,
        loading,
        isAdmin,
        authenticated,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
