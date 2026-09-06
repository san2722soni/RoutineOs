# RoutineOS System Design

Status: `current-v1-local-first-with-automatic-backup-restore`

RoutineOS is a local-first routine execution app for people who plan tomorrow, execute today, and track progress honestly without needing Google OAuth or constant cloud dependency.

Core idea:

- Build reusable categories, templates, and resources in `Manage`.
- Convert a template into a locked daily plan in `Plan`.
- Execute the locked plan in `Today`.
- Calculate progress from planned vs completed work in `Progress`.
- Control personal behavior, notifications, and backup in `Settings`.
- First login shows a full-screen swipe onboarding flow.

## Product Rules

- The app has five main screens: `Today`, `Plan`, `Manage`, `Progress`, `Settings`.
- Local data is the source of truth in v1.
- Supabase is the cloud backup and recovery source, while local state keeps normal interaction instant.
- After device activation, the app restores cloud data before backup work begins. Pending local changes are preserved and synced only after the current device is validated.
- Every meaningful user action saves instantly on the phone.
- Cloud backup runs quietly later when internet is available and the device session is active.
- Planned daily work cannot exceed 18 hours, leaving at least 6 hours for sleep/rest.
- Progress is honesty-based: the user marks done/not done, and missed blocks auto-mark not done after their end time.

## Locations and Reminders

The Reminders screen has two views: `Locations` and `Reminders`.

- Locations provides a search field and an `Add location` action outside the location list.
- `Add location` opens a dedicated map screen with search at the top, a large interactive map, bottom-left map controls, a visible radius circle, and a compact radius/save action row.
- Google Places predictions are shown below the search field. Selecting a prediction clears the suggestions, moves the map to that location, fills its address, and keeps the selection active.
- Manual map movement updates the center coordinate and reverse-geocodes it when saved.
- Reminders provides only reminder search and `Add reminder` at the top. Creation and editing happen in a modal with multiline text, location selection, and a due-date choice.
- Completed reminders remain until the configured retention period. Uncompleted reminders remain until the user completes or deletes them.

### Location and Reminder APIs

1. **Google Places API** powers autocomplete predictions and selected place details: name, address, Place ID, latitude, and longitude.
2. **Google Maps SDK** through `react-native-maps` renders the map, camera movement, current location, center marker, and radius circle.
3. **Geocoding API** converts a manually moved map coordinate into a readable address when no Places result supplied one.

After a location is saved, Expo Location registers its Android geofence. An enter event reads unfinished local reminders for that location and schedules a local notification.

## Single-Device Account Ownership

RoutineOS intentionally allows one active device per account to avoid conflicting whole-snapshot edits.

- The database owns the device lock in `device_sessions` and `routineos_activate_device`.
- Activation serializes per user, removes the previous device session, and registers the current device.
- The Android native bridge uses `Settings.Secure.ANDROID_ID`, so uninstalling and reinstalling on the same phone normally keeps the same device identity.
- A different phone logging into the same account invalidates the old phone.
- The old phone detects revocation when it resumes or during its 60-second active check and signs out locally.
- After activation, the current device restores cloud data before normal backup work begins.
- Local changes are pushed only after the current device is validated as active.

This is a deliberate single-device policy, not multi-device synchronization. The server-side lock remains authoritative because the client must not be trusted to enforce account ownership by itself.

## Test Data

`supabase/seed_all_days_invictus.sql` is the primary Plan/Today test fixture for `invictusasw7@gmail.com`.

- It clears only that user's application rows.
- It creates study, work, fitness, recovery, and side-quest categories.
- It creates reusable resources and an all-days template.
- It creates seven daily plans from `current_date` through six days ahead.
- Today's plan is locked for Today testing; the remaining plans are drafts for Plan testing.

## Code Structure

Expo Router owns routes in `app/`. The real application code lives in `src/`.

```txt
app/
  _layout.tsx                  route wrapper
  login.tsx                    route wrapper
  template-editor.tsx          route wrapper
  auth/callback.tsx            route wrapper
  (tabs)/
    _layout.tsx                route wrapper
    index.tsx                  Today route wrapper
    planner.tsx                Plan route wrapper
    progress.tsx               Progress route wrapper
    manage.tsx                 Manage route wrapper
    settings.tsx               Settings route wrapper

src/
  components/
    AppIllustration.tsx
    ConfirmModal.tsx
    OnboardingModal.tsx
    RoutineTabBar.tsx
    NotificationPermissionBanner.tsx
    ScreenHelpButton.tsx
    TimePickerField.tsx
    ToastProvider.tsx
  features/
    auth/
    today/
    planner/
    progress/
    manage/
    settings/
    templates/
    navigation/
  hooks/
    useOnlineStatus.ts
  lib/
    auth.ts
    categories.ts
    date.ts
    env.ts
    logger.ts
    notifications.ts
    profile.ts
    progress.ts
    pushLocalSnapshot.ts
    supabase.ts
    supabaseSync.ts
    templates.ts
    theme.ts
    youtube.ts
  store/
    routineStore.ts
  types.ts

supabase/
  schema.sql

assets/
  empty/                       empty-state illustrations
  info_modals/                 help/drawer illustrations
  onboarding/                  first-run onboarding illustrations
  screen_specific/             one illustration per main screen
  routineos-logo.png           app/logo asset
```

Reason:

- `app/` stays thin because Expo Router needs file-based routes.
- `src/features/` keeps screens grouped by product area.
- `src/lib/` keeps service/helper code out of screens.
- `src/store/` owns app state and local persistence.
- `assets/` stores local illustration files so the app does not depend on remote image loading.

## Illustration System

RoutineOS uses local SVG illustrations for explanation, onboarding, and empty states.

Rules:

- Import SVGs through `src/components/AppIllustration.tsx`.
- Do not import raw SVG asset paths directly inside screens.
- Use illustrations in onboarding, empty states, and screen help drawers.
- Avoid illustrations inside normal populated data cards, timelines, and forms.
- Keep the core app UI productive and calm; illustrations support clarity, not decoration.
- Onboarding is a four-page swipe flow after first login.
- Screen help drawers use the top visual area for an illustration, then show short guidance points.

Implementation:

- `react-native-svg` renders SVGs.
- `react-native-svg-transformer` lets Metro import `.svg` files as React components.
- `metro.config.js` treats `.svg` as source files.
- `src/types/svg.d.ts` provides TypeScript support for `.svg` imports.
- Screens should use `AppIllustration` names, not raw SVG imports.

## Screen Contracts

## Today

Purpose:

- Execute the locked plan for the current date.

Reads:

- `plans[today]`
- `categories`
- `resources`
- `settings`

Writes:

- block status
- resource item completion
- execution events

Rules:

- Shows only locked current-date plan.
- Active block follows real device time.
- User can mark a block `done` or `not-done`.
- If a pending block ends and user did not mark it, app marks it `not-done`.
- User can later change an auto `not-done` block to `done`.
- If no plan exists, user can lock today from template.

## Plan

Purpose:

- Prepare tomorrow's locked plan from the active template.

Reads:

- templates
- categories
- resources
- tomorrow plan draft

Writes:

- `plans[tomorrow]`

Rules:

- Blocks come from templates.
- Plan edits fill title, goal, notes, category, time, and optional resource items.
- Template duration cannot exceed 18 planned hours.
- Locking tomorrow uses confirmation.
- After the target date starts, that plan becomes execution data.

## Progress

Purpose:

- Show analytics from actual plan/resource execution.

Reads:

- plans
- resources
- execution events
- categories

Writes:

- nothing

Rules:

- Read-only screen.
- Main graph compares planned work vs completed work.
- Supports week/month range.
- Supports all-category and category filtering.
- YouTube playlist/video progress uses `durationSeconds`.
- If no resource is assigned, use block duration.

## Manage

Purpose:

- Central management area for reusable app building blocks.

Owns CRUD for:

- templates
- categories
- resources

Templates:

- Create, edit, delete.
- Open `template-editor`.
- Template blocks define start, end, label, category.

Categories:

- Create, edit, delete.
- Case-insensitive duplicate names are blocked.
- User chooses one color per category.
- Used across resources, templates, plans, today, and progress.

Resources:

- Belong to one category.
- Type is either `youtube-playlist` or `youtube-video`.
- One playlist and one video resource can exist per category.
- Playlist fetches video items from YouTube.
- Single video can be split into chunks using `chunkMinutes`.
- All fetched/chunked items store duration in seconds.
- Creating/editing a resource uses one modal for title, type, and category.
- Resource cards own link save/copy/fetch/clear actions.

## Settings

Purpose:

- Personal app behavior and backup controls.

Owns:

- profile name
- profile photo
- theme mode
- notification sound
- start/end reminder offsets
- watch notification note
- manual backup
- sign out

Rules:

- No template/category/resource editing here.
- Notifications are core behavior and stay available.
- Backup is push-first after the active device is validated. Restore runs after device activation; pending local changes are preserved and synced instead of being overwritten.
- Sign out clears Supabase session and RoutineOS local data.

## Data Model

## Zustand Store

`src/store/routineStore.ts` is the live source of truth while the app is open.

```ts
type RoutineState = {
  settings: Settings;
  categories: Category[];
  templates: RoutineTemplate[];
  resources: Resource[];
  resourceItems: ResourceItem[];
  plans: Record<string, DailyPlan>;
  executionEvents: ExecutionEvent[];
  sync: SyncState;
};
```

Local writes use `localWrite(...)`, which updates state and marks backup pending.

```txt
user action -> Zustand set(...) -> sync.pendingPush = true
```

Onboarding writes:

```txt
first signed-in app load
  -> OnboardingModal
  -> settings.onboardingCompleted = true
  -> backup later
```

## AsyncStorage

Zustand persist stores the same state on the phone under:

```txt
routineos-store
```

Flow:

```txt
Zustand memory -> AsyncStorage JSON -> reload app -> hydrate Zustand
```

Why old data came back earlier:

- Android Auto Backup can restore app data after reinstall.
- V1 now disables Android backup with `allowBackup: false`.
- Sign out also clears `routineos-store`.

## Supabase

Supabase is backup-only in v1.

Tables:

- `profiles`
- `categories`
- `routine_templates`
- `resources`
- `daily_plans`
- `execution_events`

Storage:

- bucket: `avatars`
- path: `avatars/{userId}/avatar.jpg`
- upload uses upsert, so changing photo replaces the old avatar path.

Backup flow:

```txt
local write
  -> pendingPush = true
  -> NetInfo detects internet
  -> wait about 5 minutes
  -> pushLocalSnapshot()
  -> Supabase upsert/delete snapshot rows
  -> markSynced()
```

Manual backup:

```txt
Settings -> Backup now -> pushLocalSnapshot()
```

Restore:

- Fresh login with empty local data pulls once from Supabase for that signed-in user.
- There is no manual restore button, because it could overwrite current phone state.
- There is no live merge sync in v1.
- Cloud is safety backup, not collaboration sync.

## Internet Detection

`src/hooks/useOnlineStatus.ts` uses:

- `@react-native-community/netinfo`
- Supabase `HEAD` ping fallback

This detects:

- Wi-Fi/mobile connection
- internet reachability
- backend reachability

## Security

Authentication:

- Supabase Auth email OTP.
- No Google OAuth needed for app login.
- Supabase auth session is stored by `supabase-js`.

Database protection:

- Row Level Security is enabled for all app tables.
- Policies allow each user to access only their own rows.
- `profiles.id = auth.uid()`.
- Other tables use `user_id = auth.uid()`.

Storage protection:

- avatar objects are scoped to the signed-in user's folder.
- public bucket is used for simple image display.

Client keys:

- app uses Supabase publishable key.
- service role/secret keys must never ship in the mobile app.

## Notifications

Purpose:

- phone reminders that can be forwarded to the user's watch by the watch companion app.

Types:

- block start reminder
- block end reminder
- auto not-done reminder
- test notification

Rules:

- Notifications schedule from locked plans.
- Start and end reminders should not fire at the same minute.
- Notification tap opens the app.
- End reminder can expose action buttons like `Done`.
- Watch UI is controlled by Android/watch app, not by RoutineOS.

## Toast Rules

Use toast only when the user cannot directly see the result or needs correction.

Allowed:

- validation error
- login OTP sent/failed
- YouTube fetch loading result
- internet needed for fetch/backup
- cloud backup result
- notification tap context
- auto not-done background event

Avoid:

- category edited
- category deleted
- template edited
- resource edited
- normal visible UI actions

Reason:

- On phone, too many toasts feel noisy.
- Visible UI changes do not need a toast.

## YouTube Integration

Purpose:

- turn pasted YouTube links into local resource items.

Flow:

```txt
paste playlist/video link
  -> detect type
  -> call YouTube Data API
  -> normalize title/url/durationSeconds
  -> save items locally
  -> backup later
```

Playlist:

- fetches videos and shows paginated items.

Video:

- fetches one video duration.
- splits into chunks using user-selected `chunkMinutes`.

## Progress Math

Unit:

- seconds

Daily planned:

- sum selected resource item durations when assigned
- otherwise use block duration

Daily completed:

- sum completed resource item durations when assigned
- otherwise use completed block duration

Percentage:

```txt
completed / planned
```

Filters:

- all categories
- one category
- optional resource filter

## Reset / Fresh Start

Phone:

- Settings -> Sign Out clears Supabase session and RoutineOS local store.
- Android app data clear/uninstall should remove local state.
- Android Auto Backup is disabled to prevent restore surprises.

Supabase SQL reset:

```sql
drop table if exists
  public.execution_events,
  public.daily_plans,
  public.resources,
  public.routine_templates,
  public.categories,
  public.profiles
cascade;

-- Optional auth reset:
-- Prefer Supabase Dashboard -> Authentication -> Users -> Delete users.
-- If SQL permissions allow it, this is enough because auth rows cascade.
delete from auth.users;

select pg_notify('pgrst', 'reload schema');
```

Then run:

```txt
supabase/schema.sql
```

Storage reset:

- Do not delete `storage.objects` with SQL.
- Use Supabase Dashboard Storage UI or Storage API to empty the `avatars` bucket.

## Excalidraw Diagram Checklist

Your diagram already has the main idea. Add these missing blocks:

- `Zustand Store` with slices: settings/categories/templates/resources/plans/events/sync.
- `AsyncStorage key: routineos-store`.
- `Supabase Auth session storage` as separate from RoutineOS store.
- `NetInfo / Internet Detection`.
- `5-minute debounce backup worker`.
- `RLS policies` between app and Supabase tables.
- `Notifications Scheduler` connected to locked plans.
- `Expo Router app/ wrappers` and `src/features` structure.
- `YouTube API -> local resources -> backup later`.
- `Restore only when fresh empty login` as a clear rule.
- `Reset flow`: sign out, clear local store, DB reset, storage bucket reset.

Recommended diagram shape:

```txt
Screens
  -> Zustand Store
  -> AsyncStorage
  -> Backup Worker
  -> Supabase Tables

Auth
  -> Supabase Auth
  -> Supabase session AsyncStorage
  -> Fresh empty login restore

Locked Plans
  -> Notification Scheduler
  -> Phone/Watch notifications

YouTube API
  -> Manage Resources
  -> Zustand Store
```

## Known V1 Tradeoffs

- Backup is snapshot-based, not true multi-device sync.
- No cloud merge conflict resolution.
- Resource items are stored as JSON inside `resources`.
- Template blocks are stored as JSON inside `routine_templates`.
- Report/PDF is generated later from raw local data, not stored now.

These are intentional v1 choices to keep the app simple while the product shape is still moving.
