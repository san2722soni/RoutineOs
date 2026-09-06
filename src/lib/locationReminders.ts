import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Linking } from "react-native";
import { useTaskStore } from "@/src/store/taskStore";
import type { SavedPlace } from "@/src/types";
import { prepareNotifications } from "@/src/lib/notifications";

const geofenceTaskName = "routineos-place-reminders";

export type LocationAccessStatus = {
  servicesEnabled: boolean;
  foreground: Location.PermissionStatus;
  background: Location.PermissionStatus;
};

export async function getLocationAccessStatus(): Promise<LocationAccessStatus> {
  const [servicesEnabled, foreground, background] = await Promise.all([
    Location.hasServicesEnabledAsync(),
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  return {
    servicesEnabled,
    foreground: foreground.status,
    background: background.status,
  };
}

export async function requestLocationAccess(places: SavedPlace[]) {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    await Linking.openSettings();
    return false;
  }

  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== "granted") return false;

  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    background = await Location.requestBackgroundPermissionsAsync();
  }
  if (background.status !== "granted") return false;

  return syncPlaceGeofences(places);
}

if (!TaskManager.isTaskDefined(geofenceTaskName)) {
  TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(geofenceTaskName, async ({ data, error }) => {
    if (error || !data) {
      console.warn("[Geofence] Task received no data", error ?? "missing data");
      return;
    }
    await useTaskStore.persist.rehydrate();
    const place = data.region.identifier;
    const state = useTaskStore.getState();
    const savedPlace = state.places.find((item) => item.id === place);
    console.log(`[Geofence] ${data.eventType === Location.GeofencingEventType.Enter ? "enter" : "exit"} ${place}; places=${state.places.length}; tasks=${state.tasks.length}`);
    if (data.eventType === Location.GeofencingEventType.Exit && savedPlace?.isHome) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "You left home",
          body: "RoutineOS will remind you about tasks linked to places you visit.",
          data: { kind: "home-exit", placeId: place },
        },
        trigger: null,
      });
      return;
    }
    if (data.eventType !== Location.GeofencingEventType.Enter) return;
    const tasks = state.tasks.filter((task) => task.placeId === place && !task.completed && task.dueDate <= new Date().toISOString().slice(0, 10));
    if (!tasks.length) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `You are at ${useTaskStore.getState().places.find((item) => item.id === place)?.name ?? "a saved place"}`,
        body: tasks.map((task) => task.title).join(", "),
        data: { kind: "place-task", placeId: place },
      },
      trigger: null,
    });
  });
}

export async function syncPlaceGeofences(places: SavedPlace[]) {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== "granted") return false;
  }
  let permission = await Location.getBackgroundPermissionsAsync();
  if (permission.status !== "granted") {
    permission = await Location.requestBackgroundPermissionsAsync();
  }
  if (permission.status !== "granted") return false;

  const notificationsReady = await prepareNotifications({ requestPermission: true });
  if (!notificationsReady) return false;

  if (!places.length) {
    await stopPlaceGeofences();
    return true;
  }

  await stopPlaceGeofences();
  await Location.startGeofencingAsync(
    geofenceTaskName,
    places.map((place) => ({
      identifier: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      radius: place.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: Boolean(place.isHome),
    })),
  );
  console.log(`[Geofence] registered ${places.length} location(s): ${places.map((place) => `${place.name}:${place.radiusMeters}m`).join(", ")}`);
  return true;
}

export async function syncPlaceGeofencesIfAllowed(places: SavedPlace[]) {
  const access = await getLocationAccessStatus();
  if (!access.servicesEnabled || access.foreground !== "granted" || access.background !== "granted") return false;
  if (!(await prepareNotifications())) return false;
  return syncPlaceGeofences(places);
}

export async function requestPlaceGeofencing(places: SavedPlace[]) {
  return syncPlaceGeofences(places);
}

export async function stopPlaceGeofences() {
  if (await Location.hasStartedGeofencingAsync(geofenceTaskName)) {
    await Location.stopGeofencingAsync(geofenceTaskName);
  }
}

export async function sendPlaceNotificationPreview(placeName: string, taskTitles: string[], settings: unknown) {
  const notifications = await prepareNotifications({ requestPermission: true });
  if (!notifications) throw new Error("Notification permission is not allowed on this phone.");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You are at ${placeName}`,
      body: taskTitles.length ? taskTitles.join(", ") : "No unfinished tasks are linked to this place.",
      data: { kind: "place-task-preview" },
      sound: Boolean((settings as { soundEnabled?: boolean }).soundEnabled),
    },
    trigger: null,
  });
}
