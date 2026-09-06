# RoutineOS Product Mechanism

## Core idea

This app is not just a to-do list. It is a place-aware execution system.

The user can create a saved place, like a gym, office, supermarket, library, or home, by choosing a location on a map. The app stores:

- place name
- latitude
- longitude
- radius (for example 50m or 100m)

Then the user creates tasks and assigns them to that place. Example:

- Gym -> "Do shoulder workout"
- Supermarket -> "Buy conditioner and notebook"
- Library -> "Read 20 pages"

## Actual mechanism right now

The real flow is:

1. User opens the Places screen.
2. User taps a place on the map or moves the pin to the exact location.
3. User saves the place with a name and radius.
4. User creates a task and selects that saved place.
5. The app registers a geofence with the phone OS.
6. When the phone enters that geofence area, the OS wakes up the app in the background.
7. The app checks unfinished tasks for that place.
8. The app sends a local notification to remind the user.

This is the key point:

- The app does not require the user to physically visit and save the location first.
- The user selects the place from a map and saves the coordinates.
- The actual reminder is triggered later by geofencing, when the phone enters the saved radius.

## Why this is useful

It turns location into a trigger for action.

Instead of a normal reminder that only rings at a time, the app can remind you when you are actually near the place where the task matters.

Examples:

- "When I am near the gym, remind me to do my workout"
- "When I am near the supermarket, remind me to buy groceries"
- "When I am near the library, remind me to study"

## Technical model

- Place = name + coordinates + radius
- Task = title + completion status + linked place
- Geofence = boundary created from the place coordinates and radius
- Trigger = OS detects entry into geofence
- Reminder = app reads incomplete tasks for that place and shows notification

## Product message

This is not a generic routine app. It is a location-aware productivity system that helps users act at the right place, not just at the right time.

That is the real value: place-based reminders tied to real tasks, with the phone automatically detecting when the user is nearby.
