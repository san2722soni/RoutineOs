import { getNotificationPermissionStatus } from "@/src/lib/notifications";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { BellOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NotificationPermissionBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("undetermined");
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | undefined>();

  useEffect(() => {
    const refresh = () => {
      getNotificationPermissionStatus().then(setStatus).catch(() => setStatus("unavailable"));
      Location.getBackgroundPermissionsAsync().then((permission) => setLocationStatus(permission.status)).catch(() => undefined);
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  if (status === "granted" && locationStatus === "granted") return null;

  const locationNeeded = locationStatus !== "granted";

  const requestAccess = async () => {
    if (locationNeeded) {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status === "granted") await Location.requestBackgroundPermissionsAsync();
    }
    if (status !== "granted") await import("@/src/lib/notifications").then(({ requestNotificationAccess }) => requestNotificationAccess());
  };

  return (
    <TouchableOpacity
      className="absolute left-4 right-4 z-50 flex-row items-center gap-2 rounded-2xl border px-3 py-2"
      style={{ top: insets.top + 6, backgroundColor: "#F59E0BEE", borderColor: "#FDE68A" }}
      onPress={locationNeeded ? requestAccess : () => router.push("/settings")}
    >
      <BellOff size={15} color="#111827" />
      <Text className="font-SatoshiBlack flex-1 text-xs" style={{ color: "#111827" }} numberOfLines={2}>
        {locationNeeded ? "Allow full location access for arrival reminders." : "Notifications are off. Enable them for reminders."}
      </Text>
    </TouchableOpacity>
  );
}
