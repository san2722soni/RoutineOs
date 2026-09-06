import { useEffect, useRef, useState } from "react";
import { Redirect, Tabs } from "expo-router";
import { AppState, ActivityIndicator, View } from "react-native";
import { useToast } from "@/src/components/ToastProvider";
import { NotificationPermissionBanner } from "@/src/components/NotificationPermissionBanner";
import { OnboardingModal } from "@/src/components/OnboardingModal";
import { RoutineTabBar } from "@/src/components/RoutineTabBar";
import { useOnlineStatus } from "@/src/hooks/useOnlineStatus";
import { signOut, useSupabaseSession } from "@/src/lib/auth";
import { activateDeviceSession, assertActiveDevice, deviceOnboardingDone, markDeviceOnboardingDone } from "@/src/lib/deviceSession";
import { pushLocalSnapshot } from "@/src/lib/pushLocalSnapshot";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { pullSnapshot } from "@/src/lib/supabaseSync";
import { logActionError, logActionSuccess } from "@/src/lib/logger";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";

export default function TabLayout() {
  const settings = useRoutineStore((state) => state.settings);
  const sync = useRoutineStore((state) => state.sync);
  const taskSyncPending = useTaskStore((state) => state.pendingPush);
  const updateSettings = useRoutineStore((state) => state.updateSettings);
  const theme = appTheme(modeFromSetting(settings.themeMode));
  const { session, loading } = useSupabaseSession();
  const userId = session?.user.id;
  const online = useOnlineStatus();
  const toast = useToast();
  const [deviceSetupDone, setDeviceSetupDone] = useState(true);
  const [deviceReady, setDeviceReady] = useState(false);
  const backupRunning = useRef(false);
  const backupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deviceTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const deviceSigningOut = useRef(false);
  const activatedUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    activatedUserId.current = undefined;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    if (!userId || !online || !isSupabaseConfigured) {
      setDeviceReady(false);
      return;
    }

    setDeviceReady(false);
    const activate = () => {
      activateDeviceSession()
        .then(async () => {
          if (cancelled) return;
          const routineState = useRoutineStore.getState();
          const taskState = useTaskStore.getState();
          const hasPendingLocalChanges = routineState.sync.pendingPush || taskState.pendingPush;
          if (!hasPendingLocalChanges) {
            try {
              const snapshot = await pullSnapshot();
              if (snapshot && !cancelled) {
                useRoutineStore.getState().restoreFromBackup(snapshot);
                useTaskStore.getState().restoreFromBackup(snapshot.places, snapshot.tasks, snapshot.lastSyncedAt);
                logActionSuccess("restore cloud data after device activation");
              }
            } catch (error) {
              logActionError("restore cloud data after device activation", error);
            }
          }
          activatedUserId.current = userId;
          setDeviceReady(true);
        })
        .catch((error) => {
          if (cancelled) return;
          setDeviceReady(false);
          logActionError("activate device", error);
          retryTimer = setTimeout(activate, 2000);
        });
    };
    activate();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [online, userId]);

  useEffect(() => {
    if (!session) return;
    deviceOnboardingDone(session.user.id)
      .then(setDeviceSetupDone)
      .catch(() => setDeviceSetupDone(true));
  }, [session]);

  useEffect(() => {
    if (deviceTimer.current) clearInterval(deviceTimer.current);
    deviceSigningOut.current = false;
    if (!session || !online || !isSupabaseConfigured || !deviceReady || activatedUserId.current !== userId) return;

    const checkedUserId = userId;

    const checkDevice = () => {
      if (deviceSigningOut.current || AppState.currentState !== "active") return;
      assertActiveDevice().catch((error) => {
        if (deviceSigningOut.current || checkedUserId !== userId || activatedUserId.current !== checkedUserId) return;
        if (!(error instanceof Error) || error.message !== "inactive-device") {
          logActionError("check active device", error);
          return;
        }
        deviceSigningOut.current = true;
        toast({
          kind: "warning",
          title: "Signed out",
          message: "You were signed out because your account was used on another device.",
        });
        signOut().catch((signOutError) => logActionError("inactive device sign out", signOutError));
      });
    };

    checkDevice();
    deviceTimer.current = setInterval(checkDevice, 60000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkDevice();
    });

    return () => {
      if (deviceTimer.current) clearInterval(deviceTimer.current);
      appStateSubscription.remove();
    };
  }, [deviceReady, online, session, toast, userId]);
  useEffect(() => {
    if (backupTimer.current) clearTimeout(backupTimer.current);
    if (!session || !online || !isSupabaseConfigured || !deviceReady || activatedUserId.current !== userId || (!sync.pendingPush && !taskSyncPending) || backupRunning.current) return;

    const runBackup = () => {
      backupRunning.current = true;
      pushLocalSnapshot("auto backup").finally(() => {
        const pending = useRoutineStore.getState().sync.pendingPush;
        if (!pending) toast({ kind: "success", title: "Backup complete", message: "Your data is backed up." });
        backupRunning.current = false;
        if (pending && online) backupTimer.current = setTimeout(runBackup, 60000);
      });
    };

    backupTimer.current = setTimeout(runBackup, 300000);

    return () => {
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, [deviceReady, online, session, sync.pendingPush, taskSyncPending, toast, userId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Tabs
        tabBar={(props) => <RoutineTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: "fade",
          sceneStyle: { backgroundColor: theme.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Today" }} />
        <Tabs.Screen name="planner" options={{ title: "Plan" }} />
        <Tabs.Screen name="manage" options={{ title: "Library" }} />
        <Tabs.Screen name="tasks" options={{ title: "Reminders" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
      <NotificationPermissionBanner />
      <OnboardingModal
        visible={!settings.onboardingCompleted || !deviceSetupDone}
        theme={theme}
        onDone={() => {
          updateSettings({ onboardingCompleted: true });
          if (session) {
            markDeviceOnboardingDone(session.user.id)
              .then(() => setDeviceSetupDone(true))
              .catch((error) => logActionError("save device onboarding", error));
          }
        }}
      />
    </View>
  );
}
