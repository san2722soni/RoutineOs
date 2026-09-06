import { supabase } from "@/src/lib/supabase";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

function paramsFromCallback(url: string) {
  const parsed = new URL(url.replace("#", "?"));
  return parsed.searchParams;
}

export function authRedirectUrl() {
  return Linking.createURL("/auth/callback");
}

export async function handleAuthCallback(url: string | null) {
  if (!url || !url.includes("auth/callback")) return;

  const params = paramsFromCallback(url);
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
  }
}

export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  if (!data.session) throw new Error("No session returned after OTP verification.");
  return data.session;
}

export async function signOut({ preservePending = false } = {}) {
  const routine = useRoutineStore.getState();
  const tasks = useTaskStore.getState();
  if (routine.sync.pendingPush || tasks.pendingPush) {
    if (!preservePending) {
      const { pushLocalSnapshot } = await import("@/src/lib/pushLocalSnapshot");
      if (!(await pushLocalSnapshot("backup before sign out")) || useRoutineStore.getState().sync.pendingPush || useTaskStore.getState().pendingPush) {
        throw new Error("Your changes are saved on this phone. Connect and finish backup before signing out.");
      }
    } else {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Cannot safely identify the owner of unsynced changes.");
      await AsyncStorage.setItem(`routineos-recovery:${data.session.user.id}`, JSON.stringify({ routine, tasks }));
    }
  }
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  await clearLocalRoutineData();
}

export async function recoverPendingData(userId: string) {
  const key = `routineos-recovery:${userId}`;
  const saved = await AsyncStorage.getItem(key);
  if (!saved) return false;
  const data = JSON.parse(saved);
  useRoutineStore.getState().restoreFromBackup(data.routine);
  useTaskStore.getState().restoreFromBackup(data.tasks.places, data.tasks.tasks, data.tasks.lastSyncedAt, data.tasks.deletedRecords);
  useRoutineStore.getState().markPendingPush();
  useTaskStore.getState().markPendingPush();
  // Keep the recovery copy until a confirmed cloud backup succeeds.
  return true;
}

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | "INITIAL_SESSION" | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthEvent("INITIAL_SESSION");
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthEvent(_event);
      setLoading(false);
    });

    Linking.getInitialURL().then((url) => handleAuthCallback(url).catch(() => undefined));
    const linking = Linking.addEventListener("url", ({ url }) => {
      handleAuthCallback(url).catch(() => undefined);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
      linking.remove();
    };
  }, []);

  return { session, user: session?.user ?? null, loading, authEvent };
}

export function displayName(user: User | null) {
  return user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "RoutineOS";
}

export async function clearLocalRoutineData() {
  const { stopPlaceGeofences } = await import("@/src/lib/locationReminders");
  const Notifications = await import("expo-notifications");
  await stopPlaceGeofences().catch(() => undefined);
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  useRoutineStore.getState().resetLocalData();
  useTaskStore.getState().resetLocalData();
  await AsyncStorage.removeItem("routineos-store");
  await AsyncStorage.removeItem("routineos-tasks");
}
