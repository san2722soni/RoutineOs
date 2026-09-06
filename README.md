# RoutineOS mobile

**Build once. Lock the day. Show up.**

RoutineOS is a local-first execution app built with Expo SDK 53, React 19, React Native 0.79, TypeScript, Zustand and Supabase.

## Features

- Reusable routines, areas and YouTube resources.
- Tomorrow's plan with fixed times, titles and areas; editable goals, notes and video selection before locking.
- Today execution, done/skipped states and PDF day reports.
- Place reminders that remain until completed, with no dates or automatic expiry.
- Local persistence, transactional cloud backup, deletion tracking and protection for unsynced work.
- Consistent shared buttons, empty states, toast styling and drawers; animated startup with reduced-motion support.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in your keys.
3. Apply [`supabase/schema.sql`](supabase/schema.sql) in Supabase SQL Editor **before using backup with this version**. It updates existing tables and adds the atomic backup RPC/deletion table.
4. Configure email OTP and your `myapp://auth/callback` redirect in Supabase Auth.
5. Use an Android JDK supported by the installed Gradle/Android plugin, Android SDK and a connected phone.
6. Run `npm run android`. For a newly generated native project, use `npx expo prebuild --platform android` first. The Places bridge is copied by the config plugin.

The existing `android/` directory is generated and ignored. Keep native bridge changes in `native/android/` and build plugins in `plugins/` so they survive regeneration.

## Google setup

Enable Maps SDK for Android and Places API (New). Restrict the keys to your app's package (`com.anonymous.RoutineOs`) and the signing certificate SHA-1, with the matching API restrictions. Debug and release signing certificates may differ.

- Maps displays the map and pin.
- Places SDK (New) handles search and place details through the Kotlin bridge, with autocomplete session tokens.
- Native reverse geocoding supplies an optional address label. No separate HTTP Geocoding API key is needed by the app anymore.
- Expo Location / Android location services monitor geofences. Google Places is not called to detect an arrival.

The current native Places bridge is Android-specific. iOS can use map pin selection but needs an iOS Places integration for equivalent autocomplete.

## Reminder testing

Open Reminders and use **Enable reminders**. Allow precise location, location **all the time**, and notifications. Use **Test alert** to check delivery independently of GPS. Save your current position as Home and add a reminder; the nearby check should notify when the phone gets an accurate fix. Leave the radius and return to test background entry. Mark the task done and verify that later visits do not notify for it.

Default radius: 150 m. Background alerts may be delayed by Android. Indoor accuracy, battery restrictions, location services and force-stopping affect delivery; offline arrival detection is not guaranteed on every phone. See the [design guide](SYSTEM_DESIGN.md) for sources and the test checklist.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Expo development server |
| `npm run android` | Build/install Android app |
| `npm run typecheck` | TypeScript check |
| `npm test` | Native-boundary-mocked reminder and backup regression checks using Node's test runner |
| `npm run lint` | Expo ESLint |

[`supabase/reset.sql`](supabase/reset.sql) resets one explicitly selected account's application data. It preserves the auth account and stored avatar files. Do not run it as a migration. Reset local app data as well to avoid uploading old local changes again.

## Personal routine seed

See [PERSONAL_ROUTINE.md](PERSONAL_ROUTINE.md) for the September-December 2026 timetable, account-specific load instructions and data-preservation rules. Run [seed_personal_routine.sql](supabase/seed_personal_routine.sql) only after the current schema. It preloads areas, actual YouTube lessons, templates and locked dated plans; no live database was changed during generation.
