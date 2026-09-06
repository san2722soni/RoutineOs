# Locations and Reminders: Short Guide

## Test Flow

1. Build and install with `npx expo run:android` on a real phone.
2. Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env` and enable Maps SDK for Android in Google Cloud.
3. Enable Notifications, foreground Location, **Allow all the time** background Location, and unrestricted background activity.
4. Open **Reminders > Locations** and tap **Add location**.
5. Search or move the map pin, choose a radius of at least `100m`, and tap **Save location**.
6. Open **Reminders**, tap **Add**, write `Buy conditioner and notebook`, select the saved location, and save it.
7. Leave the area, close/background the app, then return inside the saved radius.
8. Confirm a local notification lists the unfinished task.
9. Complete the task, return again, and confirm it is no longer listed.
10. Delete the place and confirm its tasks are removed.

## Under The Hood

**App:** saves a place as name, latitude, longitude, and radius. A task stores its title, selected place ID, and completion state.

**Operating system:** Android/iOS monitors the saved circle using GPS, Wi-Fi signals, and cell towers. The app does not run GPS continuously. When the phone enters the circle, the OS wakes the geofence task.

**Notification:** the geofence task reads unfinished local tasks for that place and sends a local notification. Internet is not required for this check.

Example: `Supermarket + 100m radius + Buy conditioner` means the phone can remind you when it enters that 100-meter area.

## Offline And Cloud

- Reminders and locations save locally in AsyncStorage and work offline.
- Geofence alerts can work offline if Location, background permission, and Notifications are enabled.
- Internet is needed for map tiles/address lookup and YouTube loading. The map picker requires a Google Maps API key on Android.
- The Supabase `saved_places` and `reminder_tasks` tables are connected to cloud push/pull sync.
- The active device restores cloud data after device activation before normal backup work starts.

## Limits

- Use `100m`-`200m` for most shops; GPS can drift, so a `50m` radius is unreliable for a first test.
- Battery Saver or denied permissions can delay or block alerts.
- Geofencing is an area reminder, not an exact entrance detector.
- Test on a physical Android device; Expo Go cannot fully test background geofencing.
