import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { removeCurrentDeviceSession } from "@/src/lib/deviceSession";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";

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

export async function signOut() {
  try {
    await removeCurrentDeviceSession();
  } catch {
    // ignore cleanup failure and sign the user out anyway
  }
  try {
    await supabase.auth.signOut();
  } finally {
    await clearLocalRoutineData();
  }
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
  useRoutineStore.getState().resetLocalData();
  useTaskStore.getState().resetLocalData();
  await AsyncStorage.removeItem("routineos-store");
  await AsyncStorage.removeItem("routineos-tasks");
}
