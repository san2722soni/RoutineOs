# RoutineOS UI/UX Changes

Status: `active-final-polish`

## Backup

- Remove manual `Restore backup` button.
- Keep only `Backup now`.
- Restore backup runs after device activation. Pending local changes are preserved; otherwise the cloud snapshot restores before normal backup begins.
- Auto backup stays background-only:
  - local changes set `pendingPush`
  - when internet is available, wait about 5 minutes
  - push local snapshot to Supabase
  - show global success toast only when automatic backup succeeds
- Background backup failures retry quietly.

## Notifications

- Do not request notification permission on app load.
- If notification permission is not granted, show a warning badge near the top of every signed-in screen.
- Settings can still request permission through an enable/test action.
- Watch help stays as an info modal.

## Manage

- Tab order stays `Today | Plan | Manage | Progress | Settings`.
- In Manage, search and new action row uses `75% / 25%` width.
- Empty states should appear for templates, categories, and resources.
- Dismiss keyboard when tapping add/new/save/fetch/clear actions.
- Category delete is blocked if used by templates, resources, or plans.
- Resource delete/clear is blocked if attached to a plan block.
- Template delete is blocked if used by any plan.
- Category names remain unique case-insensitively.
- Resource links must validate as YouTube links before save/fetch:
  - playlist resource requires a YouTube URL with playlist `list`
  - video resource requires a YouTube URL with video id
  - wrong site or wrong type shows a correction toast
- Resource clear must clear visible input state too.
- Dropdowns should scroll internally when more than 5 options exist.

## Template Editor

- New templates show `New Template`.
- Existing templates show `Edit Template`.
- Time rules:
  - end must be after start
  - blocks cannot overlap
  - total planned time cannot cross 18 hours
  - validation copy should say: `Set time limits correctly. Planned time should not cross 18 hours.`
- Category dropdown scrolls internally when long.

## Plan

- On every visit, ensure tomorrow draft is created from the template for tomorrow's weekday unless tomorrow is already locked.
- Changing template after editing shows a confirmation modal because current draft block changes will be replaced.
- Template dropdown scrolls internally when long.
- Resource item pagination should start near the first unfinished item.
- Resource items show a clear selectable marker.
- After finalizing a block, collapse it and label it done.
- Lock remains 3-step confirmation.

## Today

- Today cards should show time, title, category, selected resources, notes, and goal when present.
- Active Now follows real time.
- Drawer/details view should not have a Done button, so future blocks cannot be bypassed from details.
- Main timeline/card should have `Mark Done` and `Not Done`.
- If a block expires untouched, default it to `not-done`; user can honestly mark done later from the timeline.
- When all blocks are completed, show:
  - completion message
  - `Plan tomorrow`
  - `Today performance PDF report`

## Progress

- Category filter should be a dropdown, not horizontal tags.
- Graph starts from the first locked-plan date/user-start date.
- Task count remains default metric; duration remains available.

## Later Features

- PDF daily report:
  - use `expo-print` plus `expo-sharing`
  - generate live from Today/local store
  - no need to store PDFs
- LeetCode tracker:
  - v1 manual import/search: title, URL, difficulty, tags
  - attach questions to Plan
  - Today marks solved/attempted/skipped
  - later explore unofficial GraphQL/profile stats
