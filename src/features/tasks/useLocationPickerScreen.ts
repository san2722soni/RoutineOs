import { useToast } from "@/src/components/ToastProvider";
import { reverseGeocode } from "@/src/lib/geocoding";
import {
  requestPlaceGeofencing
} from "@/src/lib/locationReminders";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  NativeModules,
  Platform
} from "react-native";
import MapView, { type Region } from "react-native-maps";

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
export function useLocationPickerScreen({ mapOpen, onClose }: { mapOpen: boolean; onClose: () => void }) {
  const theme = appTheme(modeFromSetting(useRoutineStore((state) => state.settings.themeMode)));
  const toast = useToast();
  const places = useTaskStore((state) => state.places);
  const addPlace = useTaskStore((state) => state.addPlace);
  const [pinChosen, setPinChosen] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NativePlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>();
  const [pickedRegion, setPickedRegion] = useState<Region>(defaultRegion);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [savingPlace, setSavingPlace] = useState(false);
  const mapRef = useRef<MapView>(null);
  const selectedRegionRef = useRef<Region>(defaultRegion);
  const skipNextPlaceSearchRef = useRef(false);
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
  useEffect(() => {
    if (!mapOpen) return;
    setPinChosen(false);
    setPlaceName(""); setSearchQuery(""); setSuggestions([]); setSelectedAddress(undefined); setSelectedProviderId(undefined); setRadiusMeters(150);
    let cancelled = false;
    Location.requestForegroundPermissionsAsync().then(async (permission) => {
      setLocationAllowed(permission.granted);
      if (!permission.granted) return;
      const position = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 });
      if (!position || cancelled) return;
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
      setPinChosen(true);
      selectedRegionRef.current = next; setPickedRegion(next); mapRef.current?.animateToRegion(next, 350);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [mapOpen]);
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
      setPinChosen(true);
      setPinChosen(true);
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
      setPinChosen(true);
      setPinChosen(true);
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
      setPinChosen(true);
      setPinChosen(true);
      selectedRegionRef.current = nextRegion;
      setPickedRegion(nextRegion);
      setSelectedAddress(undefined);
      setSelectedProviderId(undefined);
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
    setPinChosen(true);
    selectedRegionRef.current = nextRegion;
    setPickedRegion(nextRegion);
    setSelectedAddress(undefined);
    setSelectedProviderId(undefined);
  };
  const savePlace = async () => {
    if (savingPlace) return;
    if (!pinChosen) { toast({ kind: "warning", title: "Choose a place", message: "Search for a location, tap the map or use your current position." }); return; }
    if (!placeName.trim()) { toast({ kind: "warning", title: "Name this location", message: "Add a short name such as Home or Supermarket." }); return; }
    if (places.length >= (Platform.OS === "ios" ? 20 : 100)) { toast({ kind: "warning", title: "Location limit reached", message: "Remove an unused location first." }); return; }
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
    onClose();
    try {
      const granted = await requestPlaceGeofencing([...places, place]);
      toast({
        kind: granted ? "success" : "warning",
        title: granted ? "Location saved" : "Location access needed",
        message: granted
          ? "Reminders are active for this location."
          : "Allow background location and notifications to receive reminders.",
      });
    } catch (error) {
      toast({ kind: "warning", title: "Location saved, alerts need attention", message: error instanceof Error ? error.message : "Open reminder status to enable alerts." });
    } finally {
      setSavingPlace(false);
    }
  };
  return { theme, places, placeName, setPlaceName, searchQuery, setSearchQuery, suggestions, searching, searchError, selectedAddress, pickedRegion, locationAllowed, radiusMeters, setRadiusMeters, savingPlace, mapRef, openNativeSearch, selectSuggestion, zoomMap, centerOnDevice, resetNorth, setManualPin, savePlace };
}
