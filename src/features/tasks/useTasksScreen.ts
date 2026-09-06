import { useToast } from "@/src/components/ToastProvider";
import { checkNearbyReminders, requestPlaceGeofencing } from "@/src/lib/locationReminders";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";


export function useTasksScreen() {
  const settings = useRoutineStore((state) => state.settings);
  const theme = appTheme(modeFromSetting(settings.themeMode));
  const toast = useToast();
  const places = useTaskStore((state) => state.places);
  const tasks = useTaskStore((state) => state.tasks);
  const addPlace = useTaskStore((state) => state.addPlace);
  const setHomePlace = useTaskStore((state) => state.setHomePlace);
  const removePlace = useTaskStore((state) => state.removePlace);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const removeTask = useTaskStore((state) => state.removeTask);
  const params = useLocalSearchParams<{ placeId?: string }>();
  const [section, setSection] = useState<"locations" | "reminders">("locations");
  const [taskTitle, setTaskTitle] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [reminderFilter, setReminderFilter] = useState("");
  const [reminderModal, setReminderModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string>();
  const [detailsPlaceId, setDetailsPlaceId] = useState<string>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [placeMenuOpen, setPlaceMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [homeDrawerOpen, setHomeDrawerOpen] = useState(false);
  useEffect(() => { if (params.placeId !== undefined) setSection("reminders"); }, [params.placeId]);
  const saveCurrentLocationAsHome = () => {
    setHomeDrawerOpen(true);
  };
  const confirmSaveCurrentLocationAsHome = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      toast({ kind: "warning", title: "Location access needed", message: "Allow location access to save your current place as home." });
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const place = addPlace({ name: "Home", latitude: position.coords.latitude, longitude: position.coords.longitude, radiusMeters: 150, isHome: true });
      setHomePlace(place.id);
      await requestPlaceGeofencing(useTaskStore.getState().places);
      setHomeDrawerOpen(false);
      toast({ kind: "success", title: "Home saved", message: "Your current location is now saved as home." });
    } catch {
      toast({ kind: "warning", title: "Location unavailable", message: "Move outdoors or turn on device location, then try again." });
    }
  };
  const openReminderEditor = (task?: (typeof tasks)[number]) => {
    setPlaceMenuOpen(false);
    setEditingTaskId(task?.id);
    setTaskTitle(task?.title ?? "");
    setSelectedPlaceId(task?.placeId);
    setReminderModal(true);
  };
  const saveReminder = () => {
    if (!taskTitle.trim()) {
      toast({ kind: "warning", title: "Add a reminder", message: "Write what you want to remember." });
      return;
    }
    if (!selectedPlaceId) {
      toast({ kind: "warning", title: "Choose a location", message: "Select where this reminder should appear." });
      return;
    }
    if (editingTaskId) {
      updateTask(editingTaskId, { title: taskTitle, placeId: selectedPlaceId });
      toast({ kind: "success", title: "Reminder updated", message: "Your reminder changes are saved." });
    } else {
      addTask(taskTitle, selectedPlaceId);
      toast({ kind: "success", title: "Reminder added", message: "You will be reminded at the selected place." });
    }
    setReminderModal(false);
    setTaskTitle("");
    checkNearbyReminders().catch((error) => toast({ kind: "warning", title: "Reminder saved", message: error.message }));
  };
  const handleToggleTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    toggleTask(taskId);
    if (task && !task.completed) {
      toast({ kind: "success", title: "Reminder completed", message: "Done. This reminder will no longer alert you." });
    }
  };
  const filteredPlaces = places.filter((place) => `${place.name} ${place.address ?? ""}`.toLowerCase().includes(locationFilter.toLowerCase()));
  const filteredTasks = tasks.filter((task) => task.title.toLowerCase().includes(reminderFilter.toLowerCase()));
  return { theme, toast, places, tasks, removePlace, removeTask, section, setSection, taskTitle, setTaskTitle, locationFilter, setLocationFilter, reminderFilter, setReminderFilter, reminderModal, setReminderModal, editingTaskId, detailsPlaceId, setDetailsPlaceId, selectedPlaceId, setSelectedPlaceId, placeMenuOpen, setPlaceMenuOpen, mapOpen, setMapOpen, homeDrawerOpen, setHomeDrawerOpen, saveCurrentLocationAsHome, confirmSaveCurrentLocationAsHome, openReminderEditor, saveReminder, handleToggleTask, filteredPlaces, filteredTasks };
}
