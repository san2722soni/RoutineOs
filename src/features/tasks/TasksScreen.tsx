import { useEffect, useRef, useState } from "react";
import {
  Modal,
  NativeModules,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Circle, Marker, type Region } from "react-native-maps";
import {
  ChevronDown,
  Compass,
  CalendarDays,
  HelpCircle,
  Info,
  LocateFixed,
  Home,
  MapPin,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { dateFromOffset } from "@/src/lib/date";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { AppIllustration } from "@/src/components/AppIllustration";
import { EmptyState } from "@/src/components/EmptyState";
import { PageShell } from "@/src/components/PageShell";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { ModalShell } from "@/src/components/ModalShell";
import { useToast } from "@/src/components/ToastProvider";
import {
  requestPlaceGeofencing,
  syncPlaceGeofences,
} from "@/src/lib/locationReminders";
import { reverseGeocode } from "@/src/lib/geocoding";

const defaultRegion: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

type NativePlaceResult = {
  id?: string;
  name?: string;
  address?: string;
  latitude: number;
  longitude: number;
};

type NativePlaceSuggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  description: string;
};

const nativePlaces = NativeModules.RoutinePlacesAutocomplete as {
  open: (initialQuery?: string) => Promise<NativePlaceResult>;
  search: (query: string, latitude?: number, longitude?: number) => Promise<NativePlaceSuggestion[]>;
  select: (placeId: string) => Promise<NativePlaceResult>;
} | undefined;

function dateLabel(value: string) {
  if (value === dateFromOffset(0)) return "Today";
  if (value === dateFromOffset(1)) return "Tomorrow";
  if (value === dateFromOffset(2)) return "Day after tomorrow";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TasksScreen() {
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
  const removeExpiredTasks = useTaskStore((state) => state.removeExpiredTasks);
  const [section, setSection] = useState<"locations" | "reminders">("locations");
  const [taskTitle, setTaskTitle] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [reminderFilter, setReminderFilter] = useState("");
  const [reminderModal, setReminderModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string>();
  const [taskDate, setTaskDate] = useState(dateFromOffset(0));
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NativePlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>();
  const [detailsPlaceId, setDetailsPlaceId] = useState<string | undefined>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [mapOpen, setMapOpen] = useState(false);
  const [pickedRegion, setPickedRegion] = useState<Region>(defaultRegion);
  const [placeMenuOpen, setPlaceMenuOpen] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [savingPlace, setSavingPlace] = useState(false);
  const [homeDrawerOpen, setHomeDrawerOpen] = useState(false);
  const mapRef = useRef<MapView>(null);
  const selectedRegionRef = useRef<Region>(defaultRegion);
  const skipNextPlaceSearchRef = useRef(false);

  useEffect(() => {
    removeExpiredTasks(settings.reminderRetentionMinutes);
  }, [removeExpiredTasks, settings.reminderRetentionMinutes]);

  useEffect(() => {
    syncPlaceGeofences(places).catch(() => undefined);
  }, [places]);

  useEffect(() => {
    if (skipNextPlaceSearchRef.current) {
      skipNextPlaceSearchRef.current = false;
      setSuggestions([]);
      setSearching(false);
      return;
    }
    if (!mapOpen || searchQuery.trim().length < 2 || !nativePlaces?.search) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearchError(false);
    const timer = setTimeout(() => {
      setSearching(true);
      nativePlaces.search(searchQuery, pickedRegion.latitude, pickedRegion.longitude).then((results) => {
        if (!cancelled) setSuggestions(results);
      }).catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setSearchError(true);
        }
      }).finally(() => {
        if (!cancelled) setSearching(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mapOpen, searchQuery, pickedRegion.latitude, pickedRegion.longitude]);

  const openMap = async () => {
    setSearchError(false);
    setSuggestions([]);
    setSelectedAddress(undefined);
    setSelectedProviderId(undefined);
    setRadiusMeters(100);
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationAllowed(permission.granted);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      selectedRegionRef.current = nextRegion;
      setPickedRegion(nextRegion);
    } catch {
      selectedRegionRef.current = defaultRegion;
      setPickedRegion(defaultRegion);
    }
    setMapOpen(true);
  };

  const openNativeSearch = async () => {
    if (!nativePlaces) {
      toast({ kind: "warning", title: "Search update required", message: "This installed app is older than the native Places search. Rebuild and reinstall RoutineOS." });
      return;
    }
    try {
      const result = await nativePlaces.open(searchQuery.trim());
      if (result.name && !placeName.trim()) setPlaceName(result.name);
      setSelectedAddress(result.address);
      setSelectedProviderId(result.id);
      const nextRegion = { latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
      selectedRegionRef.current = nextRegion;
      setPickedRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("cancel")) {
        toast({ kind: "warning", title: "Place search failed", message: error instanceof Error ? error.message : "Could not open Google Places search." });
      }
    }
  };

  const selectSuggestion = async (suggestion: NativePlaceSuggestion) => {
    if (!nativePlaces?.select) return;
    try {
      const result = await nativePlaces.select(suggestion.id);
      if (result.name) setPlaceName(result.name);
      skipNextPlaceSearchRef.current = true;
      setSearchQuery(result.name ?? suggestion.primaryText);
      setSelectedAddress(result.address ?? suggestion.secondaryText);
      setSelectedProviderId(result.id);
      setSuggestions([]);
      const nextRegion = { latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
      selectedRegionRef.current = nextRegion;
      setPickedRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch (error) {
      toast({ kind: "warning", title: "Place selection failed", message: error instanceof Error ? error.message : "Could not load this place." });
    }
  };

  const zoomMap = (factor: number) => {
    const current = selectedRegionRef.current;
    const nextRegion = {
      ...current,
      latitudeDelta: Math.max(
        0.001,
        Math.min(20, current.latitudeDelta * factor),
      ),
      longitudeDelta: Math.max(
        0.001,
        Math.min(20, current.longitudeDelta * factor),
      ),
    };
    selectedRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 220);
  };

  const centerOnDevice = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      selectedRegionRef.current = nextRegion;
      mapRef.current?.animateToRegion(nextRegion, 450);
    } catch {
      toast({
        kind: "warning",
        title: "Location unavailable",
        message: "Turn on device location and allow RoutineOS to access it.",
      });
    }
  };

  const resetNorth = () => {
    mapRef.current?.animateCamera({ heading: 0 }, { duration: 220 });
  };

  const setManualPin = (latitude: number, longitude: number) => {
    const nextRegion = { ...selectedRegionRef.current, latitude, longitude };
    selectedRegionRef.current = nextRegion;
    setPickedRegion(nextRegion);
    setPlaceName("");
    setSelectedAddress(undefined);
    setSelectedProviderId(undefined);
  };

  const savePlace = async () => {
    setSavingPlace(true);
    let address = selectedAddress;
    if (!address) {
      try {
        address = await reverseGeocode(selectedRegionRef.current.latitude, selectedRegionRef.current.longitude);
      } catch {
        address = undefined;
      }
    }
    const place = addPlace({
      name: placeName.trim() || selectedAddress?.split(",")[0]?.trim() || "Saved location",
      address,
      providerId: selectedProviderId,
      latitude: selectedRegionRef.current.latitude,
      longitude: selectedRegionRef.current.longitude,
      radiusMeters,
    });
    setPlaceName("");
    setSearchQuery("");
    setSelectedAddress(undefined);
    setSelectedProviderId(undefined);
    setMapOpen(false);
    try {
      const granted = await requestPlaceGeofencing([...places, place]);
      toast({
        kind: granted ? "success" : "warning",
          title: granted ? "Location saved" : "Location access needed",
        message: granted
          ? "Reminders are active for this location."
          : "Allow background location and notifications to receive reminders.",
      });
    } finally {
      setSavingPlace(false);
    }
  };

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
      const place = addPlace({ name: "Home", latitude: position.coords.latitude, longitude: position.coords.longitude, radiusMeters: 100, isHome: true });
      setHomePlace(place.id);
      setHomeDrawerOpen(false);
      toast({ kind: "success", title: "Home saved", message: "Your current location is now saved as home." });
    } catch {
      toast({ kind: "warning", title: "Location unavailable", message: "Move outdoors or turn on device location, then try again." });
    }
  };

  const openReminderEditor = (task?: (typeof tasks)[number]) => {
    setEditingTaskId(task?.id);
    setTaskTitle(task?.title ?? "");
    setSelectedPlaceId(task?.placeId);
    setTaskDate(task?.dueDate ?? dateFromOffset(0));
    setDateMenuOpen(false);
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
      updateTask(editingTaskId, { title: taskTitle, placeId: selectedPlaceId, dueDate: taskDate });
      toast({ kind: "success", title: "Reminder updated", message: "Your reminder changes are saved." });
    } else {
      addTask(taskTitle, selectedPlaceId, taskDate);
      toast({ kind: "success", title: "Reminder added", message: "You will be reminded at the selected place." });
    }
    setReminderModal(false);
    setTaskTitle("");
  };

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    toggleTask(taskId);
    if (task && !task.completed) {
      toast({ kind: "success", title: "Reminder completed", message: "It will be removed after your retention period." });
    }
  };

  const filteredPlaces = places.filter((place) => `${place.name} ${place.address ?? ""}`.toLowerCase().includes(locationFilter.toLowerCase()));
  const filteredTasks = tasks.filter((task) => task.title.toLowerCase().includes(reminderFilter.toLowerCase()));

  return (
    <PageShell theme={theme} bottomPadding={150}>
        <ScreenHeader
          eyebrow="Remember Later"
                    title="Reminders"
          theme={theme}
          actions={
            <View className="flex-row items-center gap-2">
              <TouchableOpacity accessibilityLabel="Save current location as home" className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={saveCurrentLocationAsHome}>
                <Home size={16} color={theme.primary} />
              </TouchableOpacity>
              <ScreenHelpButton
                title="Reminders"
                intro="Save places and attach reminders so important things are easier to remember."
                steps={[
                  { title: "Locations", body: "Save a location by choosing it on the map." },
                  { title: "Reminders", body: "Create a reminder and choose where it should appear." },
                  { title: "Alerts", body: "RoutineOS can notify you when you enter a saved place." },
                ]}
                illustration="reminder"
                theme={theme}
              />
            </View>
          }
        />
        <SegmentedTabs
          items={[
            { id: "locations", label: "Locations", icon: MapPin },
            { id: "reminders", label: "Reminders", icon: HelpCircle },
          ]}
          activeId={section}
          onChange={setSection}
          theme={theme}
        />
        {section === "locations" ? (
          <>
          <View className="mt-5 flex-row gap-2">
            <View className="flex-1 flex-row items-center rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <Search size={16} color={theme.mutedText} />
              <TextInput className="font-SatoshiMedium flex-1 px-2 py-3 text-sm" style={{ color: theme.text }} placeholder="Search locations" placeholderTextColor={theme.mutedText} value={locationFilter} onChangeText={setLocationFilter} />
            </View>
            <TouchableOpacity className="flex-row items-center justify-center gap-1 rounded-2xl px-3" style={{ backgroundColor: theme.accent }} onPress={() => { setPlaceName(""); openMap(); }}>
              <Plus size={16} color="#0B0D10" />
              <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>Add location</Text>
            </TouchableOpacity>
          </View>
            {!places.length && <View className="mt-5"><EmptyState title="No locations yet." body="Save a place once and attach reminders to it." illustration="location-search" theme={theme} /></View>}
            {!!places.length && !filteredPlaces.length && <View className="mt-5"><EmptyState title="No locations found with this name" body="Try a different location name or clear the search." illustration="location-search" theme={theme} /></View>}
            <View className="mt-5 gap-2">
                            {filteredPlaces.map((place) => (
                <View
                  key={place.id}
                  className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
                  style={{ backgroundColor: theme.input }}
                >
                  <TouchableOpacity className="flex-1 flex-row items-center gap-3" onPress={() => setDetailsPlaceId(place.id)}>
                    <MapPin size={16} color={theme.primary} />
                    <Text className="font-SatoshiBlack flex-1 text-sm" style={{ color: theme.text }}>
                      {place.name}
                    </Text>
                    <Info size={16} color={theme.mutedText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel={`Delete ${place.name}`}
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "#EF4444" }}
                    onPress={() => {
                      removePlace(place.id);
                      toast({ kind: "success", title: "Location deleted", message: "The location and linked reminders were removed." });
                    }}
                  >
                    <Trash2 size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View className="mt-5 flex-row gap-2">
              <View className="flex-1 flex-row items-center rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                <Search size={16} color={theme.mutedText} />
                <TextInput className="font-SatoshiMedium flex-1 px-2 py-3 text-sm" style={{ color: theme.text }} placeholder="Search reminders" placeholderTextColor={theme.mutedText} value={reminderFilter} onChangeText={setReminderFilter} />
              </View>
              <TouchableOpacity className="flex-row items-center justify-center gap-1 rounded-2xl px-3" style={{ backgroundColor: theme.accent }} onPress={() => openReminderEditor()}><Plus size={16} color="#0B0D10" /><Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>Add</Text></TouchableOpacity>
            </View>
            <View className="mt-4 gap-2">
              {!tasks.length && <View className="mt-5"><EmptyState title="No reminders yet." body="Add a reminder and choose where it should appear." illustration="task-home" theme={theme} /></View>}
              {!!tasks.length && !filteredTasks.length && <View className="mt-5"><EmptyState title="No reminders found with this name" body="Try a different reminder name or clear the search." illustration="task-home" theme={theme} /></View>}
                {filteredTasks.map((task) => {
                const place = places.find((item) => item.id === task.placeId);
                return (
                  <View
                    key={task.id}
                    className="flex-row items-center gap-3 rounded-2xl border px-3 py-3"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                    }}
                  >
                    <TouchableOpacity
                      className="h-6 w-6 items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: task.completed
                          ? theme.primary
                          : "transparent",
                        borderColor: task.completed
                          ? theme.primary
                          : theme.border,
                      }}
                      onPress={() => handleToggleTask(task.id)}
                    >
                      {task.completed ? (
                        <Text style={{ color: theme.primaryText }}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1"
                      onPress={() => openReminderEditor(task)}
                    >
                      <Text
                        className="font-SatoshiBlack text-sm"
                        style={{
                          color: task.completed ? theme.mutedText : theme.text,
                          textDecorationLine: task.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {task.title}
                      </Text>
                      <Text
                        className="font-SatoshiMedium mt-1 text-[11px]"
                        style={{ color: theme.mutedText }}
                      >
                        {place ? `At ${place.name} · ${dateLabel(task.dueDate)}` : "No location selected"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={`Delete task ${task.title}`}
                      className="h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#EF4444" }}
                      onPress={() => {
                        removeTask(task.id);
                        toast({ kind: "success", title: "Reminder deleted", message: "The reminder was removed." });
                      }}
                    >
                      <Trash2 size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      <ModalShell visible={reminderModal} title={editingTaskId ? "Edit reminder" : "New reminder"} subtitle="Choose the place where this should come back to you." theme={theme} onClose={() => setReminderModal(false)}>
            <TextInput multiline numberOfLines={3} textAlignVertical="top" className="font-SatoshiMedium mt-5 rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text, minHeight: 92 }} placeholder="What do you need to remember?" placeholderTextColor={theme.mutedText} value={taskTitle} onChangeText={setTaskTitle} />
            <TouchableOpacity className="mt-3 flex-row items-center justify-between rounded-2xl border px-4 py-4" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setPlaceMenuOpen((value) => !value)}><View className="flex-row items-center gap-2"><MapPin size={16} color={theme.primary} /><Text className="font-SatoshiBlack text-sm" style={{ color: selectedPlaceId ? theme.text : theme.mutedText }}>{places.find((place) => place.id === selectedPlaceId)?.name ?? "Choose a location"}</Text></View><ChevronDown size={16} color={theme.mutedText} /></TouchableOpacity>
            {placeMenuOpen && <View className="mt-2 rounded-2xl border p-2" style={{ backgroundColor: theme.input, borderColor: theme.border }}>{places.map((place) => <TouchableOpacity key={place.id} className="flex-row items-center gap-2 rounded-xl px-3 py-3" onPress={() => { setSelectedPlaceId(place.id); setPlaceMenuOpen(false); }}><MapPin size={14} color={theme.primary} /><Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>{place.name}</Text></TouchableOpacity>)}</View>}
            <TouchableOpacity className="mt-3 flex-row items-center justify-between rounded-2xl border px-4 py-4" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setDateMenuOpen((value) => !value)}><View className="flex-row items-center gap-2"><CalendarDays size={16} color={theme.primary} /><Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>{dateLabel(taskDate)}</Text></View><ChevronDown size={16} color={theme.mutedText} /></TouchableOpacity>
            {dateMenuOpen && <View className="mt-2 flex-row gap-2">{[0, 1, 2].map((offset) => <TouchableOpacity key={offset} className="flex-1 items-center rounded-xl border py-3" style={{ backgroundColor: taskDate === dateFromOffset(offset) ? theme.primary : theme.input, borderColor: theme.border }} onPress={() => { setTaskDate(dateFromOffset(offset)); setDateMenuOpen(false); }}><Text className="font-SatoshiBlack text-xs" style={{ color: taskDate === dateFromOffset(offset) ? theme.primaryText : theme.mutedText }}>{dateLabel(dateFromOffset(offset))}</Text></TouchableOpacity>)}</View>}
            <TouchableOpacity className="mt-5 items-center rounded-2xl py-4" style={{ backgroundColor: theme.accent }} onPress={saveReminder}><Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>{editingTaskId ? "Save changes" : "Add reminder"}</Text></TouchableOpacity>
      </ModalShell>
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
      >
        <SafeAreaView
          className="flex-1"
          style={{ backgroundColor: theme.background }}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text
              className="font-SpaceGroteskBold text-xl"
              style={{ color: theme.text }}
            >
              Add location
            </Text>
            <TouchableOpacity
              accessibilityLabel="Close map"
              onPress={() => setMapOpen(false)}
            >
              <X size={20} color={theme.mutedText} />
            </TouchableOpacity>
          </View>
          <View className="absolute left-4 right-4 top-[68px] z-10">
            <View
              className="flex-row items-center rounded-2xl border px-3"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <MapPin size={16} color={theme.primary} />
              <TextInput
                className="font-SatoshiMedium flex-1 px-3 py-4 text-sm"
                style={{ color: theme.text }}
                placeholder="Search locations and addresses"
                placeholderTextColor={theme.mutedText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => suggestions[0] ? selectSuggestion(suggestions[0]) : openNativeSearch()}
                returnKeyType="search"
                accessibilityLabel="Search places with Google"
              />
              <TouchableOpacity accessibilityLabel="Search locations" onPress={openNativeSearch}>
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.primary }}>
                Search
              </Text>
              </TouchableOpacity>
            </View>
            {(searching || searchError || suggestions.length > 0) && (
              <View className="mt-2 overflow-hidden rounded-2xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                {searching && <View className="items-center py-3"><ActivityIndicator color={theme.primary} /></View>}
                {!searching && searchError && <Text className="px-4 py-3 text-xs" style={{ color: theme.error }}>Search is unavailable. Check your connection and try again.</Text>}
                {!searching && !searchError && !suggestions.length && <Text className="px-4 py-3 text-xs" style={{ color: theme.mutedText }}>No places found. Try a nearby address or landmark.</Text>}
                {suggestions.map((suggestion) => (
                  <TouchableOpacity key={suggestion.id} className="border-b px-4 py-3" style={{ borderBottomColor: theme.border }} onPress={() => selectSuggestion(suggestion)}>
                    <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>{suggestion.primaryText}</Text>
                    <Text className="font-SatoshiMedium mt-1 text-xs" style={{ color: theme.mutedText }}>{suggestion.secondaryText}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View className="absolute bottom-36 left-4 z-10 gap-2">
            <View
              className="overflow-hidden rounded-2xl border"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Zoom in"
                className="h-11 w-11 items-center justify-center"
                onPress={() => zoomMap(0.65)}
              >
                <Plus size={19} color={theme.text} />
              </TouchableOpacity>
              <View
                className="h-px"
                style={{ backgroundColor: theme.border }}
              />
              <TouchableOpacity
                accessibilityLabel="Zoom out"
                className="h-11 w-11 items-center justify-center"
                onPress={() => zoomMap(1.5)}
              >
                <Minus size={19} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityLabel="Center on current location"
              className="h-11 w-11 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              onPress={centerOnDevice}
            >
              <LocateFixed size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Reset map north"
              className="h-11 w-11 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              onPress={resetNorth}
            >
              <Compass size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
          <MapView
            ref={mapRef}
            provider="google"
            style={{ flex: 1 }}
            initialRegion={pickedRegion}
            onRegionChangeComplete={(region) => {
              selectedRegionRef.current = region;
              setPickedRegion(region);
            }}
            onPress={(event) => setManualPin(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
            showsUserLocation={locationAllowed}
            showsMyLocationButton={locationAllowed}
            zoomControlEnabled
            showsCompass
            toolbarEnabled
            zoomEnabled
            scrollEnabled
            rotateEnabled
            pitchEnabled
            zoomTapEnabled
            loadingEnabled
            loadingIndicatorColor={theme.primary}
          >
            <Circle center={pickedRegion} radius={radiusMeters} fillColor={`${theme.primary}22`} strokeColor={theme.primary} strokeWidth={2} />
            <Marker
              coordinate={pickedRegion}
              anchor={{ x: 0.5, y: 1 }}
              draggable
              onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setManualPin(latitude, longitude);
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full border-2" style={{ backgroundColor: theme.surface, borderColor: theme.primary, elevation: 5 }}>
                <MapPin size={20} color={theme.primary} fill={theme.primary} />
              </View>
            </Marker>
          </MapView>
          <View
            className="border-t px-4 py-2"
            style={{
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            }}
          >
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>Radius {radiusMeters}m</Text>
                <Text className="font-SatoshiMedium mt-0.5 text-[10px]" style={{ color: theme.mutedText }} numberOfLines={1}>{selectedAddress ?? "Search or move the map pin"}</Text>
              </View>
              <View className="flex-row gap-1">
              {[50, 100, 200, 500].map((radius) => (
                <TouchableOpacity
                  key={radius}
                  className="items-center rounded-lg border px-2 py-1.5"
                  style={{ backgroundColor: radiusMeters === radius ? theme.primary : theme.input, borderColor: radiusMeters === radius ? theme.primary : theme.border }}
                  onPress={() => setRadiusMeters(radius)}
                >
                  <Text className="font-SatoshiBlack text-[10px]" style={{ color: radiusMeters === radius ? theme.primaryText : theme.mutedText }}>{radius}</Text>
                </TouchableOpacity>
              ))}
              </View>
            <TouchableOpacity
              className="items-center rounded-xl px-3 py-2.5"
              style={{ backgroundColor: theme.accent, opacity: savingPlace ? 0.55 : 1 }}
              onPress={savePlace}
              disabled={savingPlace}
            >
              <Text
                className="font-SatoshiBlack text-xs"
                style={{ color: "#0B0D10" }}
              >
                {savingPlace ? "Saving location..." : "Save location"}
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      <ModalShell visible={Boolean(detailsPlaceId)} title={places.find((item) => item.id === detailsPlaceId)?.name ?? "Location details"} subtitle="Saved location details" theme={theme} onClose={() => setDetailsPlaceId(undefined)}>
            {(() => {
              const place = places.find((item) => item.id === detailsPlaceId);
              if (!place) return null;
              return <>
                <AppIllustration name="you-here" size={120} style={{ alignSelf: "center", marginTop: 8 }} />
                <Text className="font-SatoshiMedium mt-3 text-sm" style={{ color: theme.mutedText }}>{place.address ?? "Address unavailable"}</Text>
                <Text className="font-SatoshiMedium mt-4 text-xs" style={{ color: theme.text }}>Latitude {place.latitude.toFixed(6)}</Text>
                <Text className="font-SatoshiMedium mt-1 text-xs" style={{ color: theme.text }}>Longitude {place.longitude.toFixed(6)}</Text>
                <Text className="font-SatoshiMedium mt-1 text-xs" style={{ color: theme.text }}>Geofence radius {place.radiusMeters}m</Text>
                <Text className="font-SatoshiMedium mt-1 text-xs" style={{ color: theme.mutedText }}>{tasks.filter((task) => task.placeId === place.id && !task.completed).length} active reminders linked</Text>
                {place.providerId ? <Text className="font-SatoshiMedium mt-1 text-xs" style={{ color: theme.mutedText }}>Google Place ID saved</Text> : null}
              </>;
            })()}
      </ModalShell>
      <ModalShell visible={homeDrawerOpen} title="Save home location" subtitle="RoutineOS can remind you when you leave home and keep home available as a saved place." theme={theme} onClose={() => setHomeDrawerOpen(false)}>
        <View className="mt-5 rounded-2xl border p-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.primary}22` }}>
              <Home size={20} color={theme.primary} />
            </View>
            <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.mutedText }}>
              Your current GPS position will be saved as Home. You can still edit the radius later from the saved location.
            </Text>
          </View>
        </View>
        <TouchableOpacity className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl px-4" style={{ backgroundColor: theme.accent }} onPress={confirmSaveCurrentLocationAsHome}>
          <Home size={16} color="#0B0D10" />
          <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>Save current location</Text>
        </TouchableOpacity>
      </ModalShell>
    </PageShell>
  );
}
