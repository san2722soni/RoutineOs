# RoutineOS: short system guide

## Folder map

```text
RoutineOs/
  app/                    Expo Router route wrappers
  src/features/
    auth/                 OTP login and callbacks
    navigation/           App shell, device activation, guarded restore/backup
    today/                TodayScreen, useTodayScreen, block-details panel
    planner/              PlannerScreen, usePlannerScreen, PlanBlocks, drawers
    manage/               Library screen/hook, video cards, colour picker
    tasks/                Reminders screen/hook, map picker/hook, status, location math
    settings/             Settings screen/hook, reminder controls, watch help
    templates/            Reusable routine editor
  src/components/         Shared buttons, headers, empty states, drawers, toast, splash
  src/store/              Routine/task stores and routinePersistence normalization
  src/lib/sync/           Snapshot types, upload, download and user lookup
  src/lib/                Auth, location reminders, notifications, dates, API helpers
  native/android/         Source-controlled Kotlin Places bridge
  plugins/                Android key and Places bridge build integration
  supabase/schema.sql     Final schema + repeatable updates + backup RPC
  supabase/reset.sql      Explicit per-account data reset
  tests/                  Node regression checks, native/network boundaries mocked
Frontend/
  app/                    Landing page, metadata and responsive styles
  components/             Header, phone frame, parallax, button
  public/                 Real screenshots, local fonts and existing legal pages
```

## What changed

Large screens were split into feature hooks (state/actions) and view components (layout). Plan blocks, Today details, video cards, settings controls and drawers have separate files. Shared button padding, empty-state spacing, keyboard-aware modal scrolling and the offline banner are centralized. Theme objects are stable, preventing toast-dependent effects from restarting on ordinary renders. The startup animation uses React Native Animated and honors reduced motion.

The mobile layout and theme are retained, with the requested reminder, Plan editing and consistency changes. The website has a new dark grid design and restrained parallax; its main action stays on the showcase until `NEXT_PUBLIC_APP_DOWNLOAD_URL` is set.

## Place reminder lifecycle

1. Search through the native Places SDK or select a map pin. Panning/zooming the camera does not move the saved pin. Save the name, optional address, coordinates and radius (150 m default).
2. Attach a reminder to that place. There is no date, time or expiry. Completion stops future alerts; deletion removes it explicitly.
3. One root hook registers geofences after storage hydration and rechecks them when the app returns to the foreground. Registration is serialized, unchanged regions are not stopped/restarted, and all places monitor exit as well as entry.
4. On entry, the background task reads saved local tasks and posts a local notification. No Maps, Places, Supabase or other network request is made in the entry handler.
5. A persisted per-visit task list prevents duplicate alerts from an entry event and a foreground check arriving together. Exit clears that list. An unfinished task can alert again on the next visit.
6. Adding a reminder while already inside a place runs a current-location check. Poor GPS accuracy produces an actionable message. Test alert checks notification delivery independently of location.
7. Tapping a place notification opens Reminders, including from a cold launch.

**What likely broke the Home test:** the initial entry could occur before a reminder existed; adding a task did not trigger a nearby check; UTC due-date filtering could exclude today's reminder; notification/registration failures were swallowed; map camera movement could overwrite selected coordinates. Notification channel creation also happened after the permission request. These paths have been corrected.

## APIs and limits

| Capability | Used for | Connection |
| --- | --- | --- |
| Google Maps SDK | Map display and pin selection | Normally needed for map tiles |
| Places SDK for Android, New API | Search and place details; session tokens retained | Needed for search |
| Expo native reverse geocoder | Optional address label for a manual pin | Platform/provider dependent; failure does not prevent coordinate saving |
| Expo Location / OS geofences | Enter/exit detection | No application API call; OS location availability still matters |
| Expo Notifications | Local alerts | No internet required |
| Supabase | Authentication and backup | Needed for sign-in and cloud operations |

The old direct HTTP Geocoding API request was removed: it required another exposed key and did not control geofence delivery. Native geocoding already covers the label lookup. Maps and Places keys must match the Android package, signing SHA-1 and enabled APIs. The Kotlin source is now retained outside ignored generated folders and restored by `withPlacesBridge.js`.

Android supports up to 100 geofences; iOS supports 20. The app reports the limit instead of silently ignoring places. A fence checks entry into a radius, not exact coordinate equality. Background alerts may take minutes. Offline GPS/network positioning, device battery policies and indoor accuracy affect reliability. Force-stopping the app can prevent delivery until it is reopened. This is not an always-running GPS tracking service.

Sources: [Expo SDK 53 location](https://docs.expo.dev/versions/v53.0.0/sdk/location/), [Android geofencing and reliability](https://developer.android.com/develop/sensors-and-location/location/geofencing), [Places Autocomplete New](https://developers.google.com/maps/documentation/places/android-sdk/place-autocomplete).

## Backup and account safety

- Writes persist locally first and mark the snapshot pending.
- Deleted IDs are recorded locally and in `deleted_records`, so old cloud copies cannot revive them.
- Uploads merge timestamped records, filter deletions and call one SQL transaction. The RPC checks the active device/session under the same advisory lock used for device activation. A failed table write rolls back the whole upload.
- Downloads paginate tables, including deletion markers, so a long history is not cut off at the first page.
- In-flight uploads are serialized. Local state is marked synced only if its data references still match the snapshot captured before upload. Otherwise new changes remain pending.
- Automatic restore checks again after download that neither store changed. A late response cannot overwrite edits made while it was downloading.
- Sign-out attempts backup first and refuses to discard pending changes on failure. Forced device logout writes an account-scoped recovery copy before clearing local state; that account can recover it on return. A confirmed successful backup removes the recovery copy.

Apply `RoutineOs/supabase/schema.sql` to the existing Supabase project before testing backup. This task creates the SQL files; it does not run a live database reset. `reset.sql` requires a target user UUID and preserves the auth account and avatar objects. Clear local data too if intentionally starting over.

## Verification and next device test

The Node regression checks exercise immediate Home reminders, duplicate suppression, exit/re-entry, completed tasks, registration deduplication, legacy date migration, deletion filtering, upload races and failed sign-out. TypeScript and production builds provide separate compilation checks.

For a physical test: install the updated build, allow precise/all-time location and notifications, use Test alert, save Home, add an unfinished reminder, then move outside the radius and return with the app backgrounded. Repeat offline and after marking it done. Do not force-stop the app during a background delivery test. On phones with aggressive battery management, allow background activity for RoutineOS.

The connected phone's notification, precise-location and background-location permissions were already granted. No app installation, data reset or physical arrival test was performed after the request to leave verification to you.
