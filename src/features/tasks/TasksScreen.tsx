import { AppIllustration } from "@/src/components/AppIllustration";
import { EmptyState } from "@/src/components/EmptyState";
import { ModalShell } from "@/src/components/ModalShell";
import { PageShell } from "@/src/components/PageShell";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import {
  ChevronDown,
  HelpCircle,
  Home,
  Info,
  MapPin,
  Plus,
  Search,
  Trash2
} from "lucide-react-native";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LocationPicker } from "./LocationPicker";


import { useTasksScreen } from "./useTasksScreen";
export default function TasksScreen() {
  const { theme, toast, places, tasks, removePlace, removeTask, section, setSection, taskTitle, setTaskTitle, locationFilter, setLocationFilter, reminderFilter, setReminderFilter, reminderModal, setReminderModal, editingTaskId, detailsPlaceId, setDetailsPlaceId, selectedPlaceId, setSelectedPlaceId, placeMenuOpen, setPlaceMenuOpen, mapOpen, setMapOpen, homeDrawerOpen, setHomeDrawerOpen, saveCurrentLocationAsHome, confirmSaveCurrentLocationAsHome, openReminderEditor, saveReminder, handleToggleTask, filteredPlaces, filteredTasks } = useTasksScreen();
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
            <TouchableOpacity className="flex-row items-center justify-center gap-1 rounded-2xl px-3" style={{ backgroundColor: theme.accent }} onPress={() => setMapOpen(true)}>
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
                      {place ? `At ${place.name} ·` : "No location selected"}
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
        <TouchableOpacity className="mt-5 items-center rounded-2xl py-4" style={{ backgroundColor: theme.accent }} onPress={saveReminder}><Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>{editingTaskId ? "Save changes" : "Add reminder"}</Text></TouchableOpacity>
      </ModalShell>
      <LocationPicker mapOpen={mapOpen} onClose={() => setMapOpen(false)} />
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
      <ModalShell visible={homeDrawerOpen} title="Save home location" subtitle="Save your current position and attach reminders to Home." theme={theme} onClose={() => setHomeDrawerOpen(false)}>
        <View className="mt-5 rounded-2xl border p-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.primary}22` }}>
              <Home size={20} color={theme.primary} />
            </View>
            <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.mutedText }}>
              Your current GPS position will be saved as Home. Reminders will alert within 150 metres of this position.
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
