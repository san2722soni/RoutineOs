import {
  Compass,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  X
} from "lucide-react-native";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocationPickerScreen } from "./useLocationPickerScreen";
export function LocationPicker({ mapOpen, onClose }: { mapOpen: boolean; onClose: () => void }) {
  const { theme, placeName, setPlaceName, searchQuery, setSearchQuery, suggestions, searching, searchError, selectedAddress, pickedRegion, locationAllowed, radiusMeters, setRadiusMeters, savingPlace, mapRef, openNativeSearch, selectSuggestion, zoomMap, centerOnDevice, resetNorth, setManualPin, savePlace } = useLocationPickerScreen({ mapOpen, onClose });
  return (
    <Modal
      visible={mapOpen}
      animationType="slide"
      onRequestClose={() => onClose()}
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
            onPress={() => onClose()}
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
            // Camera movement is independent of the saved pin.
            void region;
          }}
          onPress={(event) => setManualPin(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
          showsUserLocation={locationAllowed}
          showsMyLocationButton={false}
          zoomControlEnabled={false}
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
          <TextInput accessibilityLabel="Location name" placeholder="Name this place, e.g. Supermarket" placeholderTextColor={theme.mutedText} value={placeName} onChangeText={setPlaceName} className="font-SatoshiMedium mb-3 rounded-xl border px-4 py-3 text-sm" style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.input }} />
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>Radius {radiusMeters}m</Text>
              <Text className="font-SatoshiMedium mt-0.5 text-[10px]" style={{ color: theme.mutedText }} numberOfLines={1}>{selectedAddress ?? "Tap the map or drag the pin to choose the place"}</Text>
            </View>
            <View className="flex-row gap-1">
              {[100, 150, 250, 500].map((radius) => (
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
  );
}
