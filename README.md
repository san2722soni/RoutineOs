# RoutineOS

RoutineOS is a local-first routine execution app for real life: build reusable work blocks, plan tomorrow, execute today, and keep honest progress without needing constant cloud dependency.

## Why it exists

Most productivity apps treat planning as a dashboard problem. RoutineOS treats it like a personal operating system:

- reusable building blocks for study, work, fitness, and recovery
- a daily plan that is locked before the day begins
- a focused execution layer for what is actually happening right now
- progress tracking based on the real work done, not fake completion noise

## Product model

RoutineOS follows a simple lifecycle:

1. Manage reusable categories, templates, resources, and content blocks.
2. Plan a day from a selected template and lock it.
3. Execute the locked plan in Today.
4. Review progress and pattern drift in Progress.
5. Keep settings, reminders, and cloud backup under user control.

## Core app stack

- Expo SDK 53 + React Native + TypeScript
- Expo Router file-based navigation
- NativeWind and Tailwind-based styling
- Zustand state management with AsyncStorage persistence
- Supabase for auth, backup, restore, and device validation
- Expo Notifications + Location for reminders and geofencing
- Google Places / Maps + Geocoding for saved locations and reminder triggers

## Main app areas

- app/: route shells and navigation wrappers
- src/features/auth/: login, OTP, and callback flows
- src/features/manage/: categories, templates, resources, and library editing
- src/features/planner/: tomorrow planning and lock workflow
- src/features/today/: current-day execution and completion tracking
- src/features/progress/: analytics and completion review
- src/features/settings/: profile, reminders, theme, and backup settings
- src/features/navigation/: tab root and session orchestration
- src/lib/: app services such as sync, auth, notifications, and data helpers
- src/store/: local state and persistence layer

## System rules

- Local data is the source of truth for day-to-day use.
- Writes save first on-device, then sync to Supabase when the device is active and online.
- The app restores cloud state when a user reactivates a device.
- A single active device is enforced per account for safe ownership and snapshot control.
- Plans are capped at 18 planned hours to leave space for sleep and recovery.
- Missed or expired blocks auto-transition to not-done after their end time passes.
- Reminders and geofences fire locally first and respect retention settings.

## Location + reminder flow

RoutineOS includes a separate reminder/location system with geofencing support:

- Search and save named places using Google Places + Maps
- Save reminder tasks tied to a location and due date
- Trigger reminders when the user reaches a saved place
- Retain completed or uncompleted reminders based on user retention settings

This is implemented through:

- Google Places API for autocomplete and place metadata
- react-native-maps for map rendering and radius editing
- Expo Location geofencing for enter/exit triggers
- local notifications for reminder delivery and preview flow

## Data model

```txt
profiles
categories
routine_templates
resources
daily_plans
execution_events
device_sessions
saved_places
reminder_tasks
```

## Setup

### 1) Install dependencies

```bash
cd RoutineOs
npm install
```

### 2) Start the app

```bash
npm start
```

For Android:

```bash
npm run android
```

### 3) Create Supabase schema

Run the schema in:

- supabase/schema.sql

For the current Plan/Today test account, run:

- supabase/seed_all_days_invictus.sql

The seed looks up `invictusasw7@gmail.com`, clears only that user's application rows, creates categories/resources/templates, and creates seven daily plans. Today is locked and the following six days are drafts for Plan testing.

### 4) Validate the app

```bash
npm run typecheck
npm run lint
```

## QA and test data

The repo includes realistic SQL seed scripts for testing user flows:

- supabase/seed_all_days_invictus.sql
- supabase/seed_full_test_anand.sql
- supabase/seed_thursday_test.sql
- supabase/seed_realistic_test_data.sql

Each script expects an existing Supabase auth user for the target email and then fills in categories, resources, templates, plans, and reminder-like execution content so the app can be exercised end-to-end.

### Geofence debugging

Use a real Android build, not Expo Go. After saving a location, confirm the app grants foreground and background location permission, notification permission is enabled, and the device battery setting allows RoutineOS to run unrestricted. The app logs geofence registration and background events with the `[Geofence]` prefix. A 50m radius is sensitive to GPS drift; use 100m-200m for the first test.

```powershell
adb logcat -c
adb logcat -s ReactNativeJS
```

Then leave the saved circle and re-enter it. Android may deliver the event after a delay; if no `[Geofence]` event appears, the issue is permission, battery policy, or Android location delivery rather than Supabase backup.

## Product notes

This app is deliberately designed as a focused MVP for routine execution rather than a generic social productivity tool. The priority is:

- clarity over complexity
- local-first reliability over constant sync noise
- honest progress over perfectionist dashboards
- one disciplined flow: plan, execute, review, repeat

## Landing page

A lightweight marketing/portfolio landing page for RoutineOS is included in the frontend folder:

- frontend/
  - Next.js + Tailwind app
  - shadcn-inspired design system
  - product landing page and CTA sections

## License

This project is built for personal product/portfolio use and is not intended as a public SaaS product without review.
