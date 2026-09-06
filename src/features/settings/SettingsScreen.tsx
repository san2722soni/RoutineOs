import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Image, Keyboard, Modal, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Bell, Camera, CloudUpload, Info, LogOut, MapPin, Moon, Pencil, RefreshCw, Save, Sun, Watch, X } from "lucide-react-native";
import { displayName, signOut, useSupabaseSession } from "@/src/lib/auth";
import { useOnlineStatus } from "@/src/hooks/useOnlineStatus";
import { getNotificationPermissionStatus, openNotificationSettings, requestNotificationAccess, schedulePlansNotifications, sendTestNotification } from "@/src/lib/notifications";
import { uploadProfileAvatar } from "@/src/lib/profile";
import { pushLocalSnapshot } from "@/src/lib/pushLocalSnapshot";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { errorMessage, logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import { useToast } from "@/src/components/ToastProvider";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { AppIllustration } from "@/src/components/AppIllustration";
import { PageShell } from "@/src/components/PageShell";
import { InfoBanner } from "@/src/components/InfoBanner";
import { SectionTitle } from "@/src/components/SectionTitle";
import { SettingRow } from "@/src/components/SettingRow";
import { getLocationAccessStatus, requestLocationAccess, type LocationAccessStatus } from "@/src/lib/locationReminders";
import type { Settings, ThemePreference } from "@/src/types";

export default function SettingsScreen() {
  const settings = useRoutineStore((state) => state.settings);
  const sync = useRoutineStore((state) => state.sync);
  const plans = useRoutineStore((state) => state.plans);
  const places = useTaskStore((state) => state.places);
  const updateSettings = useRoutineStore((state) => state.updateSettings);
  const markSynced = useRoutineStore((state) => state.markSynced);
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
    if (status !== "granted") await openNotificationSettings();
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
      if (backedUp) markSynced();
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

  return (
    <PageShell theme={theme}>
      <ScreenHeader
        eyebrow="Profile & Preferences"
        title="Settings"
        theme={theme}
        actions={<ScreenHelpButton
          title="Settings"
          intro="Settings control your profile, theme, reminders, watch alerts, and backup."
          steps={[
            { title: "Profile", body: "Name and photo are saved on this phone first." },
            { title: "Notifications", body: "Your watch mirrors phone notifications if the watch app allows RoutineOS." },
            { title: "Backup", body: "Your changes are backed up when internet is available." },
          ]}
          illustration="screen-settings"
          theme={theme}
        />}
      />

          {!canBackup && <CacheBanner theme={theme} />}

          <View className="mt-5 rounded-3xl border p-4" style={{ backgroundColor: profileSurface, borderColor: profileBorder }}>
            <View className="flex-row items-center gap-4">
            <TouchableOpacity className="items-center justify-center overflow-hidden rounded-full border" style={{ width: 88, height: 88, flexShrink: 0, backgroundColor: profileControlSurface, borderColor: profileBorder }} onPress={() => (profileEditing ? pickAvatar() : setProfileEditing(true))} disabled={savingProfile}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={{ width: 88, height: 88 }} resizeMode="cover" />
              ) : (
                <Text className="font-SpaceGroteskBold text-2xl" style={{ color: theme.text }}>
                  {profileInitials}
                </Text>
              )}
              {savingProfile && (
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "#00000088" }}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
              <View className="flex-1">
                <Text className="font-SatoshiBlack text-[10px] uppercase tracking-wider" style={{ color: theme.primary }}>
                  Profile
                </Text>
                <Text className="font-SpaceGroteskBold mt-1 text-2xl" numberOfLines={1} style={{ color: theme.text }}>
                  {profileName}
                </Text>
                <Text className="font-SatoshiBold mt-1 text-xs" numberOfLines={1} style={{ color: theme.mutedText }}>
                  {user?.email ?? "Signed in"}
                </Text>
              </View>
              {!profileEditing && (
                <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: profileControlSurface, borderColor: profileBorder }} onPress={() => setProfileEditing(true)}>
                  <Pencil size={15} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>

            {profileEditing ? (
              <View className="mt-5 w-full">
                <TouchableOpacity className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: profileControlSurface, borderColor: profileBorder }} onPress={pickAvatar} disabled={savingProfile}>
                  <Camera size={15} color={theme.mutedText} />
                  <Text className="font-SatoshiBlack text-sm" style={{ color: theme.mutedText }}>
                    Choose Photo
                  </Text>
                </TouchableOpacity>
                <TextInput className="font-SatoshiBlack rounded-2xl border px-4 py-3 text-base" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} value={draftName} onChangeText={setDraftName} placeholder="Your name" placeholderTextColor={theme.mutedText} editable={!savingProfile} />
                <View className="mt-3 flex-row gap-2">
                  <TouchableOpacity className="h-12 flex-1 items-center justify-center rounded-2xl border" style={{ backgroundColor: profileControlSurface, borderColor: profileBorder }} onPress={cancelProfileEdit} disabled={savingProfile}>
                    <Text className="font-SatoshiBlack text-sm" style={{ color: theme.mutedText }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={saveProfile} disabled={savingProfile}>
                    {savingProfile ? <ActivityIndicator color="#0B0D10" /> : <Save size={15} color="#0B0D10" />}
                    <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View className="mt-4 flex-row items-center justify-between rounded-2xl border px-4 py-3" style={{ backgroundColor: profileControlSurface, borderColor: profileBorder }}>
                  <Text className="font-SatoshiMedium flex-1 text-xs" style={{ color: theme.mutedText }}>
                    Tap the photo or pencil to update your name and avatar.
                  </Text>
                  <Text>
                    <Info size={12} color={theme.mutedText} />
                  </Text>
                </View>
                <Text className="font-SatoshiMedium mt-2 text-xs" style={{ color: theme.mutedText }}>
                  Home location: {places.find((place) => place.isHome)?.name ?? "Not saved"}
                </Text>
              </View>
            )}
          </View>

          <SectionTitle icon={Moon} title="Appearance" theme={theme} />
          <View className="mt-3 rounded-3xl border p-1.5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="flex-row gap-1.5">
              {(["dark", "light"] as ThemePreference[]).map((item) => {
                const active = mode === item;
                const Icon = item === "light" ? Sun : Moon;
                return (
                  <TouchableOpacity key={item} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3" style={{ backgroundColor: active ? (item === "dark" ? theme.primary : "#0F172A") : "transparent" }} onPress={() => switchTheme(item)}>
                    <Icon size={16} color={active ? (item === "dark" ? theme.primaryText : "#FFFFFF") : theme.mutedText} />
                    <Text className="font-SatoshiBlack text-xs" style={{ color: active ? (item === "dark" ? theme.primaryText : "#FFFFFF") : theme.mutedText }}>
                      {item === "dark" ? "Dark" : "Light"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <SectionTitle icon={Bell} title="Notifications" theme={theme} />
          <View className="mt-3 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="mb-4 flex-row items-center justify-between rounded-2xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <View className="flex-1 pr-3">
                <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                  Permission
                </Text>
                <Text className="font-SatoshiMedium mt-1 text-[11px]" style={{ color: theme.mutedText }}>
                  {notificationStatus === "granted" ? "Allowed. Reminders can appear on phone and watch." : "Not allowed. RoutineOS can run, but reminders will not appear."}
                </Text>
              </View>
              {notificationStatus !== "granted" && (
                <TouchableOpacity className="rounded-xl px-3 py-2" style={{ backgroundColor: theme.accent }} onPress={enableNotifications}>
                  <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                    Enable
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <SettingRow title="Sound" description="Uses the phone's notification sound while enabled." value={settings.soundEnabled} theme={theme} onValueChange={(soundEnabled) => saveSettingsPatch({ soundEnabled }, "Notification settings saved.")} />
            <Text className="font-SatoshiBlack mt-4 text-sm" style={{ color: theme.text }}>Remove completed reminders</Text>
            <Text className="font-SatoshiMedium mt-1 text-[11px]" style={{ color: theme.mutedText }}>Completed reminders disappear automatically after this time.</Text>
            <View className="mt-2 flex-row gap-2">
              {[10, 30, 60, 1440].map((minutes) => (
                <TouchableOpacity key={minutes} className="flex-1 items-center rounded-xl border py-2" style={{ backgroundColor: settings.reminderRetentionMinutes === minutes ? theme.primary : theme.input, borderColor: settings.reminderRetentionMinutes === minutes ? theme.primary : theme.border }} onPress={() => saveSettingsPatch({ reminderRetentionMinutes: minutes }, "Reminder cleanup saved.")}>
                  <Text className="font-SatoshiBlack text-[11px]" style={{ color: settings.reminderRetentionMinutes === minutes ? theme.primaryText : theme.mutedText }}>{minutes === 1440 ? "1 day" : `${minutes}m`}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="mt-4 flex-row gap-3">
              <ReminderCard title="Starts" value={settings.startReminderMinutes} onMinus={() => saveSettingsPatch({ startReminderMinutes: Math.max(0, settings.startReminderMinutes - 5) }, "Profile updated.")} onPlus={() => saveSettingsPatch({ startReminderMinutes: Math.min(60, settings.startReminderMinutes + 5) }, "Profile updated.")} theme={theme} />
              <ReminderCard title="Ends" value={settings.endReminderMinutes} onMinus={() => saveSettingsPatch({ endReminderMinutes: Math.max(0, settings.endReminderMinutes - 5) }, "Profile updated.")} onPlus={() => saveSettingsPatch({ endReminderMinutes: Math.min(60, settings.endReminderMinutes + 5) }, "Profile updated.")} theme={theme} />
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
              <PreviewButton label="Test notification" onPress={testNotification} theme={theme} disabled={false} />
            </View>
          </View>

          <SectionTitle icon={MapPin} title="Location & Geofencing" theme={theme} />
          <View className="mt-3 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
              Arrival reminders
            </Text>
            <Text className="font-SatoshiMedium mt-2 text-xs leading-5" style={{ color: theme.mutedText }}>
              Full location access lets RoutineOS detect saved places while the app is in the background.
            </Text>
            <View className="mt-3 gap-1">
              <Text className="font-SatoshiMedium text-[11px]" style={{ color: theme.mutedText }}>
                Device location: {locationStatus?.servicesEnabled ? "On" : "Off"}
              </Text>
              <Text className="font-SatoshiMedium text-[11px]" style={{ color: theme.mutedText }}>
                Foreground access: {locationStatus?.foreground === "granted" ? "Allowed" : "Needed"}
              </Text>
              <Text className="font-SatoshiMedium text-[11px]" style={{ color: theme.mutedText }}>
                Background access: {locationStatus?.background === "granted" ? "Allowed" : "Needed"}
              </Text>
            </View>
            <TouchableOpacity className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.surfaceAlt : theme.accent }} onPress={enableLocation}>
              <MapPin size={16} color={locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.primary : "#0B0D10"} />
              <Text className="font-SatoshiBlack text-sm" style={{ color: locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.primary : "#0B0D10" }}>
                {locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? "Refresh location access" : "Enable location access"}
              </Text>
            </TouchableOpacity>
          </View>

          <SectionTitle icon={Watch} title="Watch" theme={theme} />
          <View className="mt-3 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
              Watch notification setup
            </Text>
            <Text className="font-SatoshiMedium mt-2 text-xs leading-5" style={{ color: theme.mutedText }}>
              In your watch app, enable notification access for the phone and turn on Other apps for RoutineOS. Keep RoutineOS notifications allowed in Android settings.
            </Text>
            <TouchableOpacity className="mt-4 rounded-2xl border px-4 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setWatchHelpOpen(true)}>
              <Text className="font-SatoshiBlack text-sm" style={{ color: theme.primary }}>
                How to enable notifications in your smart watch?
              </Text>
            </TouchableOpacity>
          </View>

          <SectionTitle icon={CloudUpload} title="Backup & Sync" theme={theme} />
          <View className="mt-3 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="flex-row items-center justify-between">
              <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                {online ? "Online" : "Offline"} / Backup {isSupabaseConfigured ? "ready" : "not ready"}
              </Text>
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: canBackup ? "#22C55E" : "#F59E0B" }} />
            </View>
            <Text className="font-SatoshiMedium mt-2 text-[11px]" style={{ color: theme.mutedText }}>
              Last backup: {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : "not yet"}
            </Text>
            <Text className="font-SatoshiMedium mt-2 text-[11px] leading-4" style={{ color: theme.mutedText }}>
              Changes are saved on this phone and backed up when you are online.
            </Text>

            <TouchableOpacity className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: canBackup ? theme.accent : theme.surfaceAlt }} onPress={syncNow} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#0B0D10" /> : <RefreshCw size={16} color={canBackup ? "#0B0D10" : theme.mutedText} />}
              <Text className="font-SatoshiBlack text-sm" style={{ color: canBackup ? "#0B0D10" : theme.mutedText }}>
                Back Up Now
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="mt-10 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-4" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={signOut}>
            <LogOut size={17} color="#EF4444" />
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#EF4444" }}>
              Sign Out
            </Text>
          </TouchableOpacity>

      <WatchHelpModal visible={watchHelpOpen} onClose={() => setWatchHelpOpen(false)} theme={theme} />
    </PageShell>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CacheBanner({ theme }: { theme: ReturnType<typeof appTheme> }) {
  return (
    <InfoBanner
      title="Backup pending"
      body="You are offline. Your changes are saved on this phone."
      theme={theme}
      accent="warning"
    />
  );
}

function WatchHelpModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: ReturnType<typeof appTheme> }) {
  const steps = [
    "Open your smart watch companion app.",
    "Go to notification or app alerts settings.",
    "Allow phone notification access if Android asks.",
    "Turn on Other apps or RoutineOS.",
    "Keep RoutineOS notifications enabled in Android app settings.",
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
        <View className="rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <AppIllustration name="info-questions" size={124} style={{ alignSelf: "center", marginBottom: 14 }} />
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
                Enable watch alerts
              </Text>
              <Text className="font-SatoshiMedium mt-2 text-xs leading-5" style={{ color: theme.mutedText }}>
                Your watch only mirrors phone notifications. RoutineOS cannot directly control the watch UI.
              </Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={onClose}>
              <X size={17} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View className="mt-5 gap-3">
            {steps.map((step, index) => (
              <View key={step} className="flex-row gap-3 rounded-2xl border p-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent }}>
                  <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                    {index + 1}
                  </Text>
                </View>
                <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.text }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PreviewButton({ label, onPress, theme, disabled }: { label: string; onPress: () => void; theme: ReturnType<typeof appTheme>; disabled: boolean }) {
  return (
    <TouchableOpacity className="flex-grow flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onPress} disabled={disabled}>
      <Bell size={15} color={disabled ? theme.mutedText : theme.primary} />
      <Text className="font-SatoshiBlack text-xs" style={{ color: disabled ? theme.mutedText : theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReminderCard({ title, value, onMinus, onPlus, theme }: { title: string; value: number; onMinus: () => void; onPlus: () => void; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="flex-1 rounded-3xl border p-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
      <Text className="font-SatoshiBlack text-center text-xs" style={{ color: theme.mutedText }}>
        {title}
      </Text>
      <Text className="font-SpaceGroteskBold mt-2 text-center text-3xl" style={{ color: theme.primary }}>
        {value}
      </Text>
      <Text className="font-SatoshiBold text-center text-[11px]" style={{ color: theme.mutedText }}>
        minutes
      </Text>
      <View className="mt-3 flex-row justify-center gap-2">
        <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onMinus}>
          <Text className="font-SatoshiBlack text-lg" style={{ color: theme.text }}>
            -
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onPlus}>
          <Text className="font-SatoshiBlack text-lg" style={{ color: theme.text }}>
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
