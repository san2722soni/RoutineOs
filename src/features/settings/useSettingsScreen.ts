import { useToast } from "@/src/components/ToastProvider";
import { useOnlineStatus } from "@/src/hooks/useOnlineStatus";
import { displayName, useSupabaseSession } from "@/src/lib/auth";
import { getLocationAccessStatus, requestLocationAccess, syncPlaceGeofencesIfAllowed, type LocationAccessStatus } from "@/src/lib/locationReminders";
import { errorMessage, logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";
import { getNotificationPermissionStatus, openNotificationSettings, requestNotificationAccess, schedulePlansNotifications, sendTestNotification } from "@/src/lib/notifications";
import { uploadProfileAvatar } from "@/src/lib/profile";
import { pushLocalSnapshot } from "@/src/lib/pushLocalSnapshot";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import type { Settings, ThemePreference } from "@/src/types";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useSettingsScreen() {
  const settings = useRoutineStore((state) => state.settings);
  const sync = useRoutineStore((state) => state.sync);
  const plans = useRoutineStore((state) => state.plans);
  const places = useTaskStore((state) => state.places);
  const updateSettings = useRoutineStore((state) => state.updateSettings);
  const updateSync = useRoutineStore((state) => state.updateSync);
  const { user } = useSupabaseSession();
  const online = useOnlineStatus();
  const toast = useToast();
  const mode = modeFromSetting(settings.themeMode);
  const dark = mode === "dark";
  const theme = appTheme(mode);
  const canBackup = online && isSupabaseConfigured;
  const [savingProfile, setSavingProfile] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [watchHelpOpen, setWatchHelpOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("undetermined");
  const [locationStatus, setLocationStatus] = useState<LocationAccessStatus>();
  const [profileEditing, setProfileEditing] = useState(false);
  const [draftName, setDraftName] = useState(settings.displayName ?? "");
  const [draftAvatarUri, setDraftAvatarUri] = useState<string | undefined>(undefined);
  const [draftAvatarType, setDraftAvatarType] = useState("image/jpeg");
  const profileName = settings.displayName?.trim() || displayName(user);
  const profileInitials = initials(profileName);
  const avatarPreview = draftAvatarUri ?? settings.localAvatarUri ?? settings.avatarUrl;
  const profileSurface = dark ? "rgba(255,255,255,0.035)" : theme.surface;
  const profileBorder = dark ? "rgba(255,255,255,0.14)" : theme.border;
  const profileControlSurface = dark ? "rgba(255,255,255,0.045)" : theme.surfaceAlt;
  useEffect(() => {
    if (!profileEditing) setDraftName(settings.displayName ?? "");
  }, [profileEditing, settings.displayName]);
  useEffect(() => {
    getNotificationPermissionStatus().then(setNotificationStatus).catch(() => setNotificationStatus("unavailable"));
    const refreshLocation = () => getLocationAccessStatus().then(setLocationStatus).catch(() => setLocationStatus(undefined));
    refreshLocation();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshLocation();
    });
    return () => subscription.remove();
  }, []);
  const saveSettingsPatch = async (patch: Partial<Settings>, title = "Saved") => {
    const nextSettings = { ...settings, ...patch };
    updateSettings(patch);
    logActionStart(title, patch);
    try {
      await schedulePlansNotifications(Object.values(plans), nextSettings);
      logActionSuccess(title, patch);
      toast({ kind: "success", title, message: "Your setting is saved." });
    } catch (error) {
      logActionError(title, error, patch);
      toast({ kind: "warning", title: "Setting saved locally", message: "The change is saved on this phone. Reminder scheduling will retry when available." });
    }
  };
  const switchTheme = (themeMode: ThemePreference) => {
    saveSettingsPatch({ themeMode }, `Switched to ${themeMode} mode.`);
  };
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({ kind: "warning", title: "Photo failed", message: "Allow photo access and try again." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setDraftAvatarUri(asset.uri);
    setDraftAvatarType(asset.mimeType ?? "image/jpeg");
    setProfileEditing(true);
  };
  const saveProfile = async () => {
    setSavingProfile(true);
    logActionStart("save profile", { hasAvatar: Boolean(draftAvatarUri), displayName: draftName.trim() });
    const work = (async () => {
      let avatarUrl = settings.avatarUrl;
      if (draftAvatarUri && canBackup) {
        try {
          avatarUrl = await uploadProfileAvatar(draftAvatarUri, draftAvatarType);
        } catch (error) {
          logActionError("upload profile avatar", error, { hasAvatar: true });
        }
      }
      const nextSettings = { ...settings, displayName: draftName.trim() || displayName(user), avatarUrl, localAvatarUri: draftAvatarUri ?? settings.localAvatarUri };
      updateSettings(nextSettings);
      setDraftAvatarUri(undefined);
      setProfileEditing(false);
      logActionSuccess("save profile", { hasAvatar: Boolean(draftAvatarUri), displayName: nextSettings.displayName });
      return nextSettings;
    })();

    toast.promise(work, {
      loading: draftAvatarUri ? "Saving photo..." : "Saving profile...",
      success: "Profile updated",
      error: "Photo failed",
    });

    try {
      await work;
    } catch (error) {
      logActionError("save profile", error, { hasAvatar: Boolean(draftAvatarUri), displayName: draftName.trim() });
      const message = errorMessage(error);
      if (message.toLowerCase().includes("bucket")) toast({ kind: "warning", title: "Photo failed", message: "We couldn't save that photo." });
    } finally {
      setSavingProfile(false);
    }
  };
  const cancelProfileEdit = () => {
    setDraftName(settings.displayName ?? "");
    setDraftAvatarUri(undefined);
    setProfileEditing(false);
  };
  const testNotification = async () => {
    try {
      await sendTestNotification(settings);
      logActionSuccess("test notification");
    } catch (error) {
      logActionError("test notification", error);
      toast({ kind: "error", title: "Notification failed", message: "We couldn't schedule the reminder." });
    }
  };
  const enableNotifications = async () => {
    const status = await requestNotificationAccess();
    setNotificationStatus(status);
    if (status === "granted") await syncPlaceGeofencesIfAllowed(places);
    if (status !== "granted") await openNotificationSettings();
    setLocationStatus(await getLocationAccessStatus());
  };
  const enableLocation = async () => {
    await requestLocationAccess(places);
    setLocationStatus(await getLocationAccessStatus());
  };
  const syncNow = async () => {
    if (!canBackup) {
      toast({ kind: "warning", title: "Backup unavailable", message: "Backup is unavailable right now. Your data is still safe on this phone." });
      return;
    }
    setSyncing(true);
    logActionStart("sync now");
    const work = (async () => {
      const backedUp = await pushLocalSnapshot("sync now");
      await schedulePlansNotifications(Object.values(useRoutineStore.getState().plans), useRoutineStore.getState().settings);
      logActionSuccess("sync now");
      return backedUp;
    })();

    toast.promise(work, {
      loading: "Backing up...",
      success: (backedUp) => (backedUp ? "Backup complete" : "Backup pending"),
      error: "Backup failed",
    });

    try {
      await work;
    } catch (error) {
      logActionError("sync now", error);
      updateSync({ lastError: errorMessage(error) });
    } finally {
      setSyncing(false);
    }
  };
  return { settings, sync, places, user, online, toast, mode, dark, theme, canBackup, savingProfile, syncing, watchHelpOpen, setWatchHelpOpen, notificationStatus, locationStatus, profileEditing, setProfileEditing, draftName, setDraftName, profileName, profileInitials, avatarPreview, profileSurface, profileBorder, profileControlSurface, saveSettingsPatch, switchTheme, pickAvatar, saveProfile, cancelProfileEdit, testNotification, enableNotifications, enableLocation, syncNow };
}



function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
