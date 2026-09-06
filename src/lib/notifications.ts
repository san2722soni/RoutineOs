import { blockEndDate, blockStartDate, formatTime } from "@/src/lib/date";
import type { DailyPlan, DailyPlanBlock, Settings } from "@/src/types";
import { Linking, Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

export const ROUTINE_START_CATEGORY = "routineStart";
export const ROUTINE_END_CATEGORY = "routineEnd";
export const ROUTINE_DONE_ACTION = "routineDone";
export const ROUTINE_OPEN_ACTION = "routineOpen";

let handlerReady = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === "web") return null;
  return import("expo-notifications");
}

export async function prepareNotifications({ requestPermission = false } = {}) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  if (!handlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerReady = true;
  }


  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("routine", {
      name: "Routine reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#38BDF8",
    });
  }

  const permission = requestPermission ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();

  await Notifications.setNotificationCategoryAsync(ROUTINE_START_CATEGORY, [
    { identifier: ROUTINE_OPEN_ACTION, buttonTitle: "Open Today", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(ROUTINE_END_CATEGORY, [
    { identifier: ROUTINE_DONE_ACTION, buttonTitle: "Complete", options: { opensAppToForeground: true } },
    { identifier: ROUTINE_OPEN_ACTION, buttonTitle: "Open Today", options: { opensAppToForeground: true } },
  ]);

  return permission.status === "granted" ? Notifications : null;
}

export async function getNotificationPermissionStatus() {
  const Notifications = await getNotifications();
  if (!Notifications) return "unavailable";
  const permission = await Notifications.getPermissionsAsync();
  return permission.status;
}

export async function requestNotificationAccess() {
  const ready = await prepareNotifications({ requestPermission: true });
  return ready ? "granted" : getNotificationPermissionStatus();
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

export async function scheduleBlockNotification(block: DailyPlanBlock, date: string, settings: Settings) {
  const Notifications = await getNotifications();
  if (!Notifications) return undefined;

  const triggerDate = blockStartDate({ date, start: block.start }, settings.startReminderMinutes);
  if (triggerDate.getTime() <= Date.now()) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Coming up: ${block.title}`,
      subtitle: "RoutineOS",
      body: `Your next planned block is ready at ${formatTime(block.start)}.`,
      data: { blockId: block.id, date, reminderKind: "start", title: block.title, minutes: settings.startReminderMinutes },
      categoryIdentifier: ROUTINE_START_CATEGORY,
      color: "#38BDF8",
      priority: "high",
      sound: settings.soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: "routine",
    },
  });
}

export async function scheduleBlockEndNotification(block: DailyPlanBlock, date: string, settings: Settings) {
  const Notifications = await getNotifications();
  if (!Notifications) return undefined;

  const startTrigger = blockStartDate({ date, start: block.start }, settings.startReminderMinutes).getTime();
  const endTrigger = blockEndDate({ date, end: block.end }, settings.endReminderMinutes).getTime();
  if (endTrigger <= Date.now() || endTrigger === startTrigger) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Wrapping up: ${block.title}`,
      subtitle: "RoutineOS",
      body: "Complete it if you finished.",
      data: { blockId: block.id, date, reminderKind: "end", title: block.title, minutes: settings.endReminderMinutes },
      categoryIdentifier: ROUTINE_END_CATEGORY,
      color: "#38BDF8",
      priority: "high",
      sound: settings.soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(endTrigger),
      channelId: "routine",
    },
  });
}

export async function schedulePlanNotifications(plan: DailyPlan, settings: Settings) {
  return schedulePlansNotifications([plan], settings);
}

export async function schedulePlansNotifications(plans: DailyPlan[], settings: Settings) {
  const Notifications = await getNotifications();
  if (!Notifications) return {};

  const ready = await prepareNotifications({ requestPermission: true });
  if (!ready) return {};
  for (const notification of await Notifications.getAllScheduledNotificationsAsync()) {
    if (notification.content.data?.blockId) await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }

  const ids: Record<string, string> = {};
  for (const plan of plans.filter((item) => item.status === "locked")) {
    for (const block of plan.blocks) {
      const startId = await scheduleBlockNotification(block, plan.date, settings);
      const endId = await scheduleBlockEndNotification(block, plan.date, settings);
      if (startId) ids[`${block.id}:start`] = startId;
      if (endId) ids[`${block.id}:end`] = endId;
    }
  }

  return ids;
}

export async function sendTestNotification(settings: Settings) {
  const Notifications = await getNotifications();
  if (!Notifications) throw new Error("Notifications do not run on web. Test this on your phone.");

  const ready = await prepareNotifications();
  if (!ready) throw new Error("Notification permission is not allowed on this phone.");

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "RoutineOS reminder test",
      body: "Phone and watch reminders are ready.",
      data: { kind: "test-notification" },
      color: "#38BDF8",
      priority: "high",
      sound: settings.soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: "routine",
    },
  });
}

export async function sendReminderPreview(settings: Settings, kind: "start" | "end") {
  const Notifications = await getNotifications();
  if (!Notifications) throw new Error("Notifications do not run on web. Test this on your phone.");

  const ready = await prepareNotifications();
  if (!ready) throw new Error("Notification permission is not allowed on this phone.");

  return Notifications.scheduleNotificationAsync({
    content: {
      title: kind === "start" ? "Coming up: Deep Focus" : "Wrapping up: Deep Focus",
      subtitle: "RoutineOS preview",
      body: kind === "start" ? "Your next planned block is ready." : "Complete it if you finished.",
      data: { reminderKind: kind, title: "Deep Focus", minutes: kind === "start" ? settings.startReminderMinutes : settings.endReminderMinutes },
      categoryIdentifier: kind === "start" ? ROUTINE_START_CATEGORY : ROUTINE_END_CATEGORY,
      color: "#38BDF8",
      priority: "high",
      sound: settings.soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: "routine",
    },
  });
}

export async function sendAutoNotDoneNotification(block: DailyPlanBlock, date: string, settings: Settings) {
  const Notifications = await getNotifications();
  if (!Notifications) return undefined;

  const ready = await prepareNotifications({ requestPermission: true });
  if (!ready) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Missed block",
      body: "This block has ended. Mark it complete if you finished it.",
      data: { blockId: block.id, date, reminderKind: "missed", title: block.title, minutes: 0 },
      categoryIdentifier: ROUTINE_END_CATEGORY,
      color: "#F59E0B",
      priority: "high",
      sound: settings.soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: "routine",
    },
  });
}
