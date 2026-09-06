import { distanceMeters } from "@/src/features/tasks/locationMath";
import { prepareNotifications } from "@/src/lib/notifications";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import type { SavedPlace } from "@/src/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Linking, Platform } from "react-native";

export const geofenceTaskName = "routineos-place-reminders";
const visitKey = (id: string) => `routineos-place-visit:${id}`;
let registration = Promise.resolve(false);
let registeredSignature = "";
let delivery = Promise.resolve();

export async function getLocationAccessStatus() {
  if (Platform.OS === "web") return { servicesEnabled: false, foreground: "denied", background: "denied", geofencing: false };
  const [servicesEnabled, foreground, background, geofencing] = await Promise.all([
    Location.hasServicesEnabledAsync(), Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync(), Location.hasStartedGeofencingAsync(geofenceTaskName),
  ]);
  return { servicesEnabled, foreground: foreground.status, background: background.status, geofencing };
}
export type LocationAccessStatus = Awaited<ReturnType<typeof getLocationAccessStatus>>;

async function hydrate() {
  await Promise.all([
    useTaskStore.persist.hasHydrated() ? Promise.resolve() : useTaskStore.persist.rehydrate(),
    useRoutineStore.persist.hasHydrated() ? Promise.resolve() : useRoutineStore.persist.rehydrate(),
  ]);
}

// Serialize OS entry events and foreground checks to avoid duplicate alerts.
function notifyArrival(placeId: string) {
  const next = delivery.catch(() => undefined).then(async () => {
    await hydrate();
    const place = useTaskStore.getState().places.find((item) => item.id === placeId);
    if (!place) return;
    const sent: string[] = JSON.parse((await AsyncStorage.getItem(visitKey(placeId))) ?? "[]");
    const tasks = useTaskStore.getState().tasks.filter((task) => task.placeId === placeId && !task.completed && !sent.includes(task.id));
    if (!tasks.length) return;
    const notifications = await prepareNotifications();
    if (!notifications) throw new Error("Allow notifications to receive place reminders.");
    await notifications.scheduleNotificationAsync({
      content: {
        title: `You're at ${place.name}`, body: tasks.map((task) => task.title).join(" / "),
        data: { kind: "place-task", placeId }, sound: useRoutineStore.getState().settings.soundEnabled, priority: "high"
      },
      trigger: Platform.OS === "android" ? { channelId: "routine" } : null,
    });
    await AsyncStorage.setItem(visitKey(placeId), JSON.stringify([...sent, ...tasks.map((task) => task.id)]));
  });
  delivery = next;
  return next;
}

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(geofenceTaskName)) {
  TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(geofenceTaskName, async ({ data, error }) => {
    try {
      if (error) throw error;
      if (!data?.region.identifier) return;
      if (data.eventType === Location.GeofencingEventType.Exit) {
        await delivery.catch(() => undefined);
        await AsyncStorage.removeItem(visitKey(data.region.identifier));
      } else if (data.eventType === Location.GeofencingEventType.Enter) {
        await notifyArrival(data.region.identifier);
      }
      await AsyncStorage.removeItem("routineos-geofence-error");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      await AsyncStorage.setItem("routineos-geofence-error", message);
      console.warn("Place reminder failed:", message);
    }
  });
}

export function syncPlaceGeofencesIfAllowed(places: SavedPlace[]) {
  registration = registration.catch(() => false).then(async () => {
    if (Platform.OS === "web") return false;
    if (!places.length) { await stopPlaceGeofences(); return true; }
    const access = await getLocationAccessStatus();
    if (!access.servicesEnabled || access.foreground !== "granted" || access.background !== "granted" || !(await prepareNotifications())) return false;
    const limit = Platform.OS === "ios" ? 20 : 100;
    if (places.length > limit) throw new Error(`This device supports ${limit} saved places. Remove a place before adding another.`);
    const regions = places.map((place) => ({
      identifier: place.id, latitude: place.latitude, longitude: place.longitude,
      radius: Math.max(100, place.radiusMeters), notifyOnEnter: true, notifyOnExit: true
    }));
    const signature = JSON.stringify(regions);
    if (signature !== registeredSignature || !(await Location.hasStartedGeofencingAsync(geofenceTaskName))) {
      await Location.startGeofencingAsync(geofenceTaskName, regions);
      registeredSignature = signature;
    }
    return true;
  });
  return registration;
}

export async function requestLocationAccess(places: SavedPlace[]) {
  if (Platform.OS === "web") throw new Error("Place reminders require the installed mobile app.");
  if (!(await Location.hasServicesEnabledAsync())) { await Linking.openSettings(); return false; }
  if (!(await Location.requestForegroundPermissionsAsync()).granted) return false;
  if (!(await Location.requestBackgroundPermissionsAsync()).granted) return false;
  return syncPlaceGeofencesIfAllowed(places);
}
export const requestPlaceGeofencing = requestLocationAccess;
export const syncPlaceGeofences = syncPlaceGeofencesIfAllowed;

export async function checkNearbyReminders() {
  await hydrate();
  const { places, tasks } = useTaskStore.getState();
  if (!tasks.some((task) => !task.completed)) return;
  if (!(await Location.getForegroundPermissionsAsync()).granted) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Could not get your position. Turn on precise location and try outdoors.")), 15000); }),
    ]);
    const relevant = places.filter((place) => tasks.some((task) => task.placeId === place.id && !task.completed));
    const accuracy = position.coords.accuracy ?? 0;
    if (relevant.length && relevant.every((place) => accuracy > place.radiusMeters)) {
      throw new Error(`Location accuracy is about ${Math.round(accuracy)} m. Allow precise location and try near a window or outdoors.`);
    }
    for (const place of places) {
      const distance = distanceMeters(position.coords, place);
      const accuracy = position.coords.accuracy ?? 0;
      if (accuracy > place.radiusMeters) continue;
      if (distance <= Math.max(100, place.radiusMeters)) await notifyArrival(place.id);
      else if (distance - accuracy > place.radiusMeters) await AsyncStorage.removeItem(visitKey(place.id));
    }
  } finally { if (timer) clearTimeout(timer); }
}

export async function stopPlaceGeofences() {
  registeredSignature = "";
  if (Platform.OS !== "web" && await Location.hasStartedGeofencingAsync(geofenceTaskName)) await Location.stopGeofencingAsync(geofenceTaskName);
}

