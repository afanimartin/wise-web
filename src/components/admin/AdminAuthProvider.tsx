"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getAuthProfile, type AuthProfile } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

type AdminAuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    async function loadProfile(nextUser: User) {
      setLoading(true);
      setError("");

      try {
        const nextProfile = await getAuthProfile(nextUser);
        if (cancelled) return;

        if (!nextProfile.roles.includes("ADMIN")) {
          setError("Admin access denied. Redirecting to the tester.");
          window.setTimeout(() => router.replace("/"), 900);
          return;
        }

        setProfile(nextProfile);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to verify admin access";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    try {
      const { auth } = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setProfile(null);

        if (!nextUser) {
          setLoading(false);
          return;
        }

        void loadProfile(nextUser);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Firebase is not configured";
      queueMicrotask(() => {
        setError(message);
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  async function signIn() {
    setError("");
    const { auth, provider } = getFirebaseAuth();
    await signInWithPopup(auth, provider);
  }

  const signOutUser = useCallback(async () => {
    const { auth } = getFirebaseAuth();
    await signOut(auth);
    router.replace("/");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      signIn,
      signOutUser,
      clearError: () => setError(""),
    }),
    [user, profile, loading, error, signOutUser],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
