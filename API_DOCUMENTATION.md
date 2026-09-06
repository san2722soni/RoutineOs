# RoutineOS Location Reminder APIs

## API Responsibilities

| Capability | API or module | Role |
| --- | --- | --- |
| Location suggestions | Google Places SDK, native `RoutinePlacesAutocomplete.search()` | Returns live place predictions while the user types. |
| Place details | Google Places SDK, native `RoutinePlacesAutocomplete.select()` | Resolves a prediction to name, address, Place ID, latitude, and longitude. |
| Map display | Google Maps SDK through `react-native-maps` | Renders the map, marker, camera movement, zoom, and current-device position. |
| Manual pin address | Geocoding API through `reverseGeocode()` | Converts a manually positioned map pin into a readable address. |
| Arrival detection | Android Geofencing API through Expo Location | Monitors saved coordinates and radius in the background. |
| Reminder alerts | Expo Notifications through `locationReminders.ts` | Sends a local notification when an active reminder matches a geofence entry. |
| Cloud persistence | Supabase | Syncs saved locations, reminders, due dates, and settings. |

## The Three Location APIs

### Google Places API

Used for human-friendly location search. The native Android module calls Places autocomplete while the user types, then fetches details after a prediction is selected. The details response provides the place name, formatted address, Google Place ID, latitude, and longitude.

### Google Maps SDK

Used through `react-native-maps` for the dedicated Add Location screen. It renders the map, moves the camera after a Places selection, shows the device position when permission is available, and displays the selected geofence radius as a circle around the center marker.

### Google Geocoding API

Used when the user moves the map manually rather than selecting a Places prediction. The selected latitude and longitude are reverse-geocoded into a readable address before saving. If reverse geocoding is unavailable, the location still saves with its coordinates.

## User Flow

```text
Search text
  -> Google Places prediction
  -> User selects prediction
  -> Place details return coordinates and address
  -> Map camera moves to the selected coordinates
  -> User adjusts the pin and radius if needed
  -> Reverse geocoding fills an address when the pin was moved manually
  -> Location is saved locally and synced to Supabase
  -> Reminder is attached to the saved location
  -> Android geofence is registered
  -> User enters the radius
  -> Active reminders are loaded locally
  -> Local notification is fired
```

## Places Search

`PlacesAutocompleteModule.kt` owns the Android bridge. It maintains a Places session token so predictions and the selected place belong to the same billing session.

- `search(query)` returns prediction IDs and display text.
- `select(placeId)` calls `FetchPlaceRequest` and returns the complete place record.
- Search suggestions are debounced in the screen before the native call.
- The app keeps the Google Place ID when available so a location can be identified consistently.

## Maps

`TasksScreen.tsx` uses `react-native-maps` with the Google provider.

- The map starts at the current device location when permission is available.
- Search selection animates the camera to the selected place.
- The center marker represents the saved coordinate.
- Moving the map updates the coordinate used by the save action.
- Radius options are 50m, 100m, 200m, and 500m.
- The location guide recommends 100m–200m for typical urban use because GPS accuracy changes indoors and around tall buildings.

## Reverse Geocoding

When the user saves a manually positioned pin without a selected Places result, `reverseGeocode(latitude, longitude)` requests a readable address. If the request fails, the coordinate is still saved and the UI displays `Address unavailable`.

## Geofencing and Notifications

`requestPlaceGeofencing()` registers saved locations with Android. `syncPlaceGeofences()` re-registers the current location set when the app state or saved locations change.

On an enter event:

1. The background task identifies the saved location.
2. It reads uncompleted reminders attached to that location.
3. It applies due-date and completion rules.
4. It sends a local notification.
5. Completion remains a user action; uncompleted reminders are not automatically removed.

The reminder retention setting applies only to completed reminders. A completed reminder is removed after the configured retention period; an uncompleted reminder stays until the user completes or deletes it.

## Data Ownership

- Zustand and AsyncStorage provide the immediate offline experience.
- Supabase is used for backup and cross-session persistence.
- Geofence registration is refreshed from the current local location list.
- Notification delivery should not wait for a network request; local data is the first source for an arrival alert.

## Failure Handling

- Missing foreground location permission: the map falls back to a default region and explains why current location is unavailable.
- Missing background permission: the location can still be saved, but the user is told that background access is needed for arrival alerts.
- Places search failure: the search panel displays a retryable error state.
- No predictions: the search panel suggests trying an address or landmark.
- Notification permission failure: the preview and geofence setup return a warning instead of silently failing.
- Offline use: saved locations and reminders remain available locally; cloud sync resumes when connectivity returns.

## Operational Limits

Google APIs, Android background execution, battery optimization, and GPS conditions all affect timing. See [GEOFENCE_ACCURACY_GUIDE.md](GEOFENCE_ACCURACY_GUIDE.md) for radius guidance, permission checks, manufacturer restrictions, and a device testing checklist.
