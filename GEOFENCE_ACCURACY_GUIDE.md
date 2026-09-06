# RoutineOS Geofence Accuracy & Timing Guide

## Overview

RoutineOS uses Android's **Geofencing API** (via `expo-task-manager` and `expo-location`) to detect when you enter or exit a saved location. This guide explains how geofencing works and how to maximize detection accuracy and notification responsiveness.

---

## How Geofencing Works

1. **Setup**: User saves a location with latitude, longitude, and radius (50m–500m).
2. **Registration**: RoutineOS registers the geofence with Android's Location Services.
3. **Monitoring**: Android monitors the device GPS position against all geofences in the background.
4. **Detection**: When the device enters/exits the geofence radius, Android triggers a callback.
5. **Notification**: RoutineOS queries unfinished reminders for that location and sends a local notification.

**Key limitation**: Detection depends on GPS accuracy, Android OS optimization, and device power state.

---

## Factors Affecting Accuracy & Timing

### 1. **GPS Accuracy**
- GPS accuracy is typically **5–10 meters** in open sky, degrading to **20–50 meters** indoors or urban canyons.
- A geofence set to 100m radius will be reliably detected, but a 50m radius may miss entry in poor GPS conditions.

**Improvement**:
- Use at least **100m radius** for outdoor locations.
- Use **200m+ radius** for indoor or urban areas with tall buildings.

### 2. **Battery Optimization & Doze Mode**
- Android **Doze mode** and manufacturer battery optimizers (Oppo, Samsung, Xiaomi) throttle background location updates.
- Detection can be delayed by minutes to hours.

**Improvement**:
- Add RoutineOS to **Device Battery Saver/Doze whitelist**:
  - Settings → Battery → Battery Saver/Doze → Allow app to run in background.
  - Settings → App Management → Special Permissions → Unrestricted battery use.
- User should explicitly disable battery restrictions for RoutineOS.

### 3. **Location Permissions**
- Geofencing requires **background location permission** (`ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION`).
- If revoked or set to "Allow only while using the app," geofencing will not work.

**Improvement**:
- Show permission status in Settings.
- Prompt user to grant **"Allow all the time"** location permission.
- Detect if permission was revoked and warn user.

### 4. **Location Services Disabled**
- If the device's location service is turned off entirely, geofencing does not work.

**Improvement**:
- Check `Location.hasServicesEnabledAsync()` on app launch.
- Show a persistent banner if location is disabled: **"Turn on device location for reminders."**

### 5. **Network Connectivity**
- Geofencing itself works **offline** (no internet required after setup).
- However, fused location providers (Google Play Services) may improve accuracy if network is available.

**Improvement**:
- Ensure Google Play Services is up to date on the device.

### 6. **Geofence Transition Delay**
- Android applies a **1–2 minute debounce** to geofence transitions to reduce false positives from GPS jitter.
- Real detection can be delayed by 1–2 minutes after entering the geofence.

**Improvement**:
- Accept that 1–2 minute delays are normal.
- Use larger radius (150–300m) to reduce sensitivity to GPS noise.

### 7. **Multiple Geofences**
- Android limits simultaneous geofences to **100 per app** (API limit).
- RoutineOS currently registers one geofence per saved location.
- If a user has 100+ locations, older geofences will be removed.

**Improvement**:
- For typical users (< 20 locations), this is not a constraint.
- If needed, implement geofence rotation: only monitor 20 closest locations at a time.

### 8. **Notification Delivery Timing**
- After geofence entry is detected, RoutineOS queries Zustand and Supabase to find unfinished reminders.
- If the query is slow (network latency), the notification is delayed.

**Improvement**:
- Query local Zustand store first (< 10ms).
- Show notification immediately without waiting for cloud sync.
- Mark as "pending sync" if needed.

---

## Implementation Recommendations

### A. **Permissions & Status Page**

Add a new section in Settings:

```
Location & Reminders
  ✓ Location enabled / ✗ Turn on location
  ✓ Background location allowed / ⚠ Grant permission
  ✓ Battery optimizations disabled / ⚠ Whitelist RoutineOS
  Suggested radius: 100–200m for urban areas
```

### B. **Geofence Radius Guidance**

In the map modal, show:

```
Recommended radius:
  50m – Precise outdoor areas (open parks)
  100m – Standard urban locations (shops, offices)
  200m – Large indoor areas (malls, campuses)
  500m – Remote or GPS-challenged areas
```

### C. **Periodic Sync of Location**

Implement a background task that checks location periodically:

```typescript
// Every 10 minutes, request location and re-register geofences
// This refreshes GPS accuracy and keeps Android aware of active geofences
const syncLocationTask = setInterval(() => {
  Location.getCurrentPositionAsync()
    .then(() => syncPlaceGeofences(places))
    .catch(() => {});
}, 10 * 60 * 1000);
```

### D. **Manual Geofence Trigger (Testing)**

Add a **test geofence entry** feature in the reminder detail drawer:

```typescript
// Simulate geofence entry for testing
const testGeofenceEntry = async (locationId: string) => {
  const place = places.find((p) => p.id === locationId);
  if (!place) return;
  const reminders = tasks.filter((t) => t.placeId === locationId && !t.completed && t.dueDate <= today);
  if (reminders.length > 0) {
    sendPlaceNotificationPreview(place.name, reminders.map((r) => r.title), settings);
  }
};
```

### E. **Geofence Entry Logging**

Log geofence transitions for debugging:

```typescript
// In locationReminders.ts
console.log(`[Geofence] Entered ${place.name} at ${new Date().toISOString()}`);
console.log(`[Geofence] Unfinished reminders: ${unfinishedReminders.length}`);
console.log(`[Geofence] Sending notification...`);
```

### F. **Re-registration on App Launch**

Ensure geofences are re-registered every time the app starts:

```typescript
useEffect(() => {
  syncPlaceGeofences(places).catch(() => {});
}, [places]);
// Already implemented in TabLayout.tsx
```

### G. **Handle Geofence Removal on Location Delete**

When a location is deleted, ensure its geofence is also unregistered:

```typescript
removePlace: (placeId) => {
  // Remove from geofence manager
  Location.stopGeofencingAsync(placeId);
  // Remove from store
  set((state) => ({ places: state.places.filter(...), ... }));
}
```

---

## User Expectations & Communication

### What to Tell Users

- **Reminders are not push notifications.** They use local geofencing, which is less reliable than cloud-based location tracking.
- **Detection takes 1–2 minutes** after you actually arrive because of GPS stability and Android debouncing.
- **Battery optimization may delay notifications** if RoutineOS is not whitelisted.
- **Indoors, geofences may not work** because GPS signal is weak. Use larger radius (200–500m).
- **Test at home first** by manually entering the geofence area.

### In-App Messaging

Show this on the Reminders help page:

> **How Reminders Work:**
> 1. Save a location on the map.
> 2. Attach a reminder to that location.
> 3. When you arrive at that location, your phone detects it and shows the reminder.
>
> **For best accuracy:**
> - Allow location access at all times.
> - Whitelist RoutineOS in battery settings.
> - Use 100–200m radius for typical locations.
> - Outdoors works better than indoors.

---

## Testing Checklist

- [ ] User grants "Allow all the time" location permission.
- [ ] RoutineOS is added to battery optimizer whitelist.
- [ ] Device location service is enabled.
- [ ] Geofence radius is at least 100m.
- [ ] Test location is outdoors or in open area (not indoors).
- [ ] Enter geofence and wait 2–3 minutes.
- [ ] Notification appears (or use manual test feature).
- [ ] Completed reminders can be deleted, uncompleted reminders stay indefinitely.
- [ ] Completed reminders are removed only after the retention time set in Settings (10m, 30m, 1h, 1 day).

---

## Known Limitations

- **No real-time guarantee.** Geofencing is background monitoring, not push notifications.
- **Android-specific.** iOS requires a different Geofence API.
- **Power consumption.** Continuous GPS monitoring drains battery (typical: 2–5% per hour).
- **Manufacturer restrictions.** Oppo, Xiaomi, Samsung have aggressive battery optimizers that may block background tasks.

---

## References

- [Android Geofencing API](https://developer.android.com/training/location/geofencing)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Task Manager](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Android Battery Optimization](https://developer.android.com/topic/performance/power)

