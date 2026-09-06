import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { env } from "@/src/lib/env";
import { useRoutineStore } from "@/src/store/routineStore";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const updateSync = useRoutineStore((state) => state.updateSync);

  useEffect(() => {
    let cancelled = false;

    const applyStatus = (isOnline: boolean) => {
      if (cancelled) return;
      setOnline(isOnline);
      updateSync(isOnline ? { online: true, lastError: undefined } : { online: false, lastError: undefined });
    };

    const pingSupabase = async () => {
      try {
        if (!env.supabaseUrl) throw new Error("Supabase URL missing");
        await fetch(env.supabaseUrl, { method: "HEAD" });
        applyStatus(true);
      } catch {
        applyStatus(false);
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === false) {
        applyStatus(false);
        return;
      }
      if (state.isInternetReachable === true) {
        applyStatus(true);
        return;
      }
      if (state.isInternetReachable === false) {
        applyStatus(false);
        return;
      }
      pingSupabase();
    });

    pingSupabase();
    const timer = setInterval(pingSupabase, 30000);
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(timer);
    };
  }, [updateSync]);

  return online;
}
