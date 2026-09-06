# RoutineOS Structure Backup

Snapshot date: 2026-08-29

This file captures the current default app structure before clearing/reworking DB data.

## Core Flow

1. Settings creates the base structure.
2. Resources stores category-wise learning resources/playlists.
3. Plan builds tomorrow from templates and resources.
4. Today executes the locked plan.
5. Progress reads completed resource/video data and shows analytics.

## Screens

| Screen | Role | Main Data |
|---|---|---|
| Today | Execute locked daily plan | `plans[date].blocks`, assigned videos |
| Plan | Build and lock tomorrow | templates, categories, resources |
| Resources | Create/fetch playlist resources | `goals`, `playlistItems` |
| Progress | Read-only progress analytics | completed playlist durations |
| Settings | Profile, templates, categories, sync, notifications | settings, categories, templates |

## Categories

| ID | Label | Color |
|---|---|---|
| `dsa` | DSA | `#38BDF8` |
| `physics` | Physics | `#F59E0B` |
| `javascript` | JavaScript | `#38BDF8` |
| `system-design` | System Design | `#818CF8` |
| `networking` | Networking | `#2DD4BF` |
| `sql` | SQL | `#94A3B8` |
| `gym` | Gym | `#FB7185` |
| `karate` | Karate | `#FB7185` |
| `punching` | Punching | `#FB7185` |
| `recovery` | Recovery | `#34D399` |
| `side-quest` | Side Quest | `#FFE2B8` |
| `other` | Other | `#94A3B8` |

## Default Resources / Goals

| ID | Title | Category | Target | Done | Unit | Deadline |
|---|---|---|---:|---:|---|---|
| `physics` | NIOS Physics | Physics | 8 | 0 | chapters | 2026-09-22 |
| `dsa` | DSA Apna College | DSA | 144 | 14 | videos | - |
| `js` | JS Domination | JavaScript | 8 | 2 | hours | - |
| `sys` | System Design | System Design | 14 | 0 | videos | - |
| `net` | Networking | Networking | 20 | 0 | videos | - |
| `sql` | SQL Apna College | SQL | 3 | 1 | hours | - |

## Built-In Templates

### `open_evening`

Name: Mon / Thu / Fri

Description: Deep study, physics mastery and open evening work.

| Block ID | Time | Category | Label | Required |
|---|---|---|---|---|
| `dsa` | 05:00-09:00 | DSA | DSA videos and approach notes | yes |
| `tech` | 09:00-13:00 | JavaScript | JS / System Design / SQL / Networking | yes |
| `lunch` | 13:00-14:00 | Recovery | Lunch and rest | yes |
| `physics` | 14:00-17:00 | Physics | NIOS Physics study | yes |
| `gym` | 17:00-17:40 | Gym | Gym or rest on Monday | no |
| `free` | 17:40-20:00 | Side Quest | Free time / gaming / movies | no |
| `punching` | 20:00-20:30 | Punching | Punching bag practice | yes |
| `unwind` | 20:30-22:30 | Recovery | Dinner / shows / unwind | yes |

### `evening_dojo`

Name: Tue / Sat Karate

Description: Study sprint, low-volume gym and evening karate.

| Block ID | Time | Category | Label | Required |
|---|---|---|---|---|
| `dsa` | 05:00-09:00 | DSA | DSA videos and approach notes | yes |
| `tech` | 09:00-13:00 | JavaScript | JS / System Design / SQL / Networking | yes |
| `lunch` | 13:00-14:00 | Recovery | Lunch and rest | yes |
| `physics` | 14:00-17:00 | Physics | NIOS Physics study | yes |
| `gym` | 17:00-17:40 | Gym | Low-volume gym | yes |
| `karate` | 18:00-20:00 | Karate | Karate class | yes |
| `punching` | 20:00-20:30 | Punching | Punching bag practice | yes |
| `unwind` | 20:30-22:30 | Recovery | Dinner / shows / unwind | yes |

### `early_dojo`

Name: Wed Karate

Description: Midweek study, physics, early dojo and recovery.

| Block ID | Time | Category | Label | Required |
|---|---|---|---|---|
| `dsa` | 05:00-09:00 | DSA | DSA videos and approach notes | yes |
| `tech` | 09:00-13:00 | JavaScript | JS / System Design / SQL / Networking | yes |
| `lunch` | 13:00-14:00 | Recovery | Lunch and rest | yes |
| `physics` | 14:00-16:30 | Physics | NIOS Physics study | yes |
| `prep` | 16:30-17:00 | Recovery | Travel / prep for dojo | yes |
| `karate` | 17:00-19:00 | Karate | Karate class | yes |
| `dinner` | 19:00-20:00 | Recovery | Dinner and recovery | yes |
| `punching` | 20:00-20:30 | Punching | Punching bag practice | yes |
| `unwind` | 20:30-22:30 | Recovery | Light review / unwind | yes |

### `morning_dojo`

Name: Sunday

Description: Morning dojo, weekly reset and lighter focused work.

| Block ID | Time | Category | Label | Required |
|---|---|---|---|---|
| `review` | 05:00-06:30 | Physics | Rest / light review | no |
| `prep` | 06:30-07:00 | Recovery | Karate prep | yes |
| `karate` | 07:00-10:00 | Karate | Karate class | yes |
| `tech` | 10:00-13:00 | DSA | Break / tech | no |
| `lunch` | 13:00-14:00 | Recovery | Lunch and rest | yes |
| `physics` | 14:00-17:00 | Physics | NIOS Physics study | yes |
| `free` | 17:00-20:00 | Side Quest | Free time / gaming | no |
| `punching` | 20:00-20:30 | Punching | Punching bag practice | yes |
| `unwind` | 20:30-22:30 | Recovery | Dinner / shows / unwind | yes |

## Auto Template Logic

| Day | Template |
|---|---|
| Sunday | `morning_dojo` |
| Tuesday | `evening_dojo` |
| Wednesday | `early_dojo` |
| Saturday | `evening_dojo` |
| Monday / Thursday / Friday | `open_evening` |

## Default Block Targets

| Block ID | Target |
|---|---|
| `dsa` | Binary search videos 15-20 + one-page approach notes |
| `tech` | JS async/await deep dive + 1 system design video + SQL recap |
| `lunch` | Lunch, hydration, 20 min eyes-off rest |
| `physics` | NIOS Physics: Laws of Motion numericals + formulas |
| `gym` | Low-volume strength: two exercises, two failure sets |
| `free` | Metal Gear Solid 5 or one episode only |
| `punching` | 30 min punching bag: jab-cross-hook rounds |
| `unwind` | Dinner, light review, sleep by 10:30 PM |
| `prep` | Bag, water, wraps, travel prep |
| `karate` | Karate class: kata, stretching, sparring focus |
| `dinner` | Dinner and recovery |
| `review` | Physics formula revision and weekly planning notes |

## Data Types

### `CategoryDefinition`

- `id`
- `label`
- `color`

### `RoutineTemplate`

- `id`
- `name`
- `description`
- `blocks`

### `TemplateBlock`

- `id`
- `start`
- `end`
- `category`
- `label`
- `required`

### `DailyPlan`

- `date`
- `templateId`
- `sourceText`
- `blocks`
- `didText`
- `missedText`
- `tomorrowText`
- `locked`
- `updatedAt`

### `TimeBlock`

- `id`
- `date`
- `templateBlockId`
- `start`
- `end`
- `title`
- `label`
- `target`
- `notes`
- `category`
- `status`
- `notificationId`

### `Goal / Resource`

- `id`
- `title`
- `category`
- `target`
- `done`
- `unit`
- `deadline`
- `playlistUrl`
- `playlistItems`
- `totalDurationSeconds`
- `completedDurationSeconds`

### `PlaylistItem`

- `id`
- `title`
- `durationSeconds`
- `duration`
- `completed`
- `completedAt`
- `url`
- `assignedBlockId`

## Current Storage Model

Local:

- Zustand store persisted to AsyncStorage key: `routineos-store`

Cloud:

- Supabase `profiles`
- Supabase `daily_plans`
- Supabase `routine_templates`
- Supabase `goals`
- Supabase Storage bucket: `avatars`

## Important Current Rules

- Resources are grouped by category.
- Progress should only read completed data.
- Today is the only normal place to mark videos/blocks done.
- Plan assigns resources/videos to tomorrow blocks.
- Notifications are scheduled when plans are locked or reminders are rescheduled.
- Total time blocks in a day should not exceed 24 hours.

## Finalized Design Decisions

### Profile Image Storage

- Store one avatar file in Supabase Storage at `avatars/{userId}/avatar.jpg`.
- On every profile photo change, upload to the same path with `upsert: true`.
- Do not keep old avatar copies in storage.
- Resize/compress the selected image to roughly the profile display size before upload.
- Store the remote URL in `settings.avatarUrl`.
- Keep the selected local image URI while editing so the UI updates instantly.
- Offline display order: cached/local image if available, then `avatarUrl`, then initials.
- Initials are generated from the display name, for example `Aswin Anand` -> `AA`.
