"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getClient } from "./supabase/client";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  /** Send OTP to phone (e.g. "+12125551234") */
  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  /** Verify the 6-digit OTP. Returns isNewUser=true if no profile exists yet. */
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Omit<Profile, "id" | "created_at">>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const supabase = getClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data ?? null);
      setProfileLoading(false);
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const sendOtp = useCallback(
    async (phone: string) => {
      try {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        return { error: error?.message ?? null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Network error — please check your connection and try again." };
      }
    },
    [supabase]
  );

  const verifyOtp = useCallback(
    async (phone: string, token: string) => {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) return { error: error.message, isNewUser: false };

      const userId = data.user?.id;
      if (!userId) return { error: "Authentication failed", isNewUser: false };

      // Check if this user already has a profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!existingProfile) {
        // Auto-create a minimal profile row so foreign-key constraints are met
        await supabase.from("profiles").insert({ id: userId });
      }

      return { error: null, isNewUser: !existingProfile };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const updateProfile = useCallback(
    async (data: Partial<Omit<Profile, "id" | "created_at">>) => {
      if (!user) return { error: "Not authenticated" };
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...data })
        .eq("id", user.id);
      if (!error) await fetchProfile(user.id);
      return { error: error?.message ?? null };
    },
    [user, supabase, fetchProfile]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        sendOtp,
        verifyOtp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
