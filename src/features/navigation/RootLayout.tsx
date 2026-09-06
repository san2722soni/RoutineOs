import "@/global.css";
import { StartupSplash } from "@/src/components/StartupSplash";
import { ToastProvider } from "@/src/components/ToastProvider";
import { usePlaceReminders } from "@/src/features/tasks/usePlaceReminders";
import { dateFromOffset } from "@/src/lib/date";
import { prepareNotifications, ROUTINE_DONE_ACTION, ROUTINE_OPEN_ACTION } from "@/src/lib/notifications";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const router = useRouter();
  const settings = useRoutineStore((state) => state.settings);
  usePlaceReminders();
  const mode = modeFromSetting(settings.themeMode);
  const theme = appTheme(mode);
  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("@/assets/fonts/satoshi/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("@/assets/fonts/satoshi/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("@/assets/fonts/satoshi/Satoshi-Bold.otf"),
    "Satoshi-Black": require("@/assets/fonts/satoshi/Satoshi-Black.otf"),
    "SpaceGrotesk-SemiBold": require("@/assets/fonts/space-grotesk/SpaceGrotesk-SemiBold.otf"),
    "SpaceGrotesk-Bold": require("@/assets/fonts/space-grotesk/SpaceGrotesk-Bold.otf"),
  });
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  const finishStartupSplash = useCallback(() => setShowStartupSplash(false), []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    prepareNotifications().then((Notifications) => {
      if (!Notifications) return;
      const handleResponse = (response: import("expo-notifications").NotificationResponse) => {
        const data = response.notification.request.content.data;
        if (String(data.kind ?? "").startsWith("place-task")) {
          router.push({ pathname: "/(tabs)/tasks", params: { placeId: String(data.placeId ?? "") } });
          return;
        }
        const reminderKind = String(data.reminderKind ?? "");
        const title = String(data.title ?? "RoutineOS");
        const minutes = String(data.minutes ?? "");
        const date = String(data.date ?? dateFromOffset(0));
        const blockId = typeof data.blockId === "string" ? data.blockId : "";
        const notificationAction = response.actionIdentifier === ROUTINE_DONE_ACTION ? "done" : response.actionIdentifier === ROUTINE_OPEN_ACTION ? "open" : "tap";

        if (notificationAction === "done" && blockId) {
          useRoutineStore.getState().setBlockStatus(date, blockId, "done");
        }

        router.push({ pathname: "/(tabs)", params: { reminderKind, reminderTitle: title, reminderMinutes: minutes, notificationAction } });
      };
      subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) { handleResponse(response); Notifications.clearLastNotificationResponseAsync(); }
      });
    });

    return () => subscription?.remove();
  }, [router]);


  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  if (!fontsLoaded) return null;

  if (showStartupSplash) return <StartupSplash theme={theme} onComplete={finishStartupSplash} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <ToastProvider>
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
          <Stack.Screen name="login" options={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: theme.background } }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="template-editor" options={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: theme.background } }} />
          <Stack.Screen name="+not-found" options={{ contentStyle: { backgroundColor: theme.background } }} />
        </Stack>
      </ToastProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </GestureHandlerRootView>
  );
}
