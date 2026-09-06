import { OfflineBanner } from "@/src/components/OfflineBanner";
import { PageShell } from "@/src/components/PageShell";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { SectionTitle } from "@/src/components/SectionTitle";
import { SettingRow } from "@/src/components/SettingRow";
import { signOut } from "@/src/lib/auth";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import type { ThemePreference } from "@/src/types";
import { Bell, Camera, CloudUpload, Info, LogOut, MapPin, Moon, Pencil, RefreshCw, Save, Sun, Watch } from "lucide-react-native";
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PreviewButton } from "./PreviewButton";
import { ReminderCard } from "./ReminderCard";
import { WatchHelpModal } from "./WatchHelpModal";

import { useSettingsScreen } from "./useSettingsScreen";
export default function SettingsScreen() {
  const { settings, sync, places, user, online, toast, mode, theme, canBackup, savingProfile, syncing, watchHelpOpen, setWatchHelpOpen, notificationStatus, locationStatus, profileEditing, setProfileEditing, draftName, setDraftName, profileName, profileInitials, avatarPreview, profileSurface, profileBorder, profileControlSurface, saveSettingsPatch, switchTheme, pickAvatar, saveProfile, cancelProfileEdit, testNotification, enableNotifications, enableLocation, syncNow } = useSettingsScreen();
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

      {!canBackup && <OfflineBanner theme={theme} />}

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
          <Text className="font-SatoshiMedium text-[11px]" style={{ color: theme.mutedText }}>
            Geofencing: {!places.length ? "Save a location first" : locationStatus?.geofencing ? "Active" : "Needs setup"}
          </Text>
        </View>
        <TouchableOpacity className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.surfaceAlt : theme.accent }} onPress={enableLocation}>
          <MapPin size={16} color={locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.primary : "#0B0D10"} />
          <Text className="font-SatoshiBlack text-sm" style={{ color: locationStatus?.servicesEnabled && locationStatus.foreground === "granted" && locationStatus.background === "granted" ? theme.primary : "#0B0D10" }}>
            {locationStatus?.geofencing ? "Refresh location & geofencing" : "Enable location & geofencing"}
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

      <TouchableOpacity className="mt-10 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-4" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={() => signOut().catch((error) => toast({ kind: "warning", title: "Sign out paused", message: error.message }))}>
        <LogOut size={17} color="#EF4444" />
        <Text className="font-SatoshiBlack text-sm" style={{ color: "#EF4444" }}>
          Sign Out
        </Text>
      </TouchableOpacity>

      <WatchHelpModal visible={watchHelpOpen} onClose={() => setWatchHelpOpen(false)} theme={theme} />
    </PageShell>
  );
}
