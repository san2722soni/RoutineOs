import { checkNearbyReminders, syncPlaceGeofencesIfAllowed } from "@/src/lib/locationReminders";
import { useTaskStore } from "@/src/store/taskStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

export function usePlaceReminders() {
  const places = useTaskStore((state) => state.places);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    const refresh = async () => {
      try {
        if (!useTaskStore.persist.hasHydrated()) await useTaskStore.persist.rehydrate();
        if (cancelled) return;
        await syncPlaceGeofencesIfAllowed(useTaskStore.getState().places);
        if (!cancelled && AppState.currentState === "active") await checkNearbyReminders();
      } catch (error) {
        await AsyncStorage.setItem("routineos-geofence-error", error instanceof Error ? error.message : String(error));
      }
    };
    refresh();
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    return () => { cancelled = true; listener.remove(); };
  }, [places]);
}
