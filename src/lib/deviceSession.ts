import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";
import { supabase } from "@/src/lib/supabase";

const deviceIdKey = "routineos-device-id";
const onboardingKeyPrefix = "routineos-device-onboarding:";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export async function getDeviceId() {
  const nativePlaces = NativeModules.RoutinePlacesAutocomplete as { getDeviceId?: () => Promise<string> } | undefined;
  if (nativePlaces?.getDeviceId) {
    try {
      const stableId = await nativePlaces.getDeviceId();
      if (stableId) {
        await AsyncStorage.setItem(deviceIdKey, stableId);
        return stableId;
      }
    } catch {
      // Fall back to the installation ID when the native bridge is unavailable.
    }
  }
  const existing = await AsyncStorage.getItem(deviceIdKey);
  if (existing) return existing;
  const next = uuid();
  await AsyncStorage.setItem(deviceIdKey, next);
  return next;
}

export async function activateDeviceSession() {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("routineos_activate_device", { p_device_id: deviceId });
  if (error) throw error;
  if (!data) throw new Error("device-activation-failed");
  return true;
}

export async function removeCurrentDeviceSession() {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("routineos_delete_device", { p_device_id: deviceId });
  if (error) throw error;
  return Boolean(data);
}

export async function assertActiveDevice() {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc("routineos_is_active_device", { p_device_id: deviceId });
  if (error) throw error;
  if (!data) throw new Error("inactive-device");
}

export async function deviceOnboardingDone(userId: string) {
  const deviceId = await getDeviceId();
  return (await AsyncStorage.getItem(`${onboardingKeyPrefix}${userId}:${deviceId}`)) === "true";
}

export async function markDeviceOnboardingDone(userId: string) {
  const deviceId = await getDeviceId();
  await AsyncStorage.setItem(`${onboardingKeyPrefix}${userId}:${deviceId}`, "true");
}
