import { AreaOption } from "@/src/components/AreaOption";
import { NotificationPermissionBanner } from "@/src/components/NotificationPermissionBanner";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { TimePickerField } from "@/src/components/TimePickerField";
import { useToast } from "@/src/components/ToastProvider";
import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, timeToMinutes } from "@/src/lib/date";
import { templateForDate } from "@/src/lib/templates";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { formatDuration } from "@/src/lib/youtube";
import { useRoutineStore } from "@/src/store/routineStore";
import type { RoutineTemplate, TemplateBlock } from "@/src/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, ChevronDown, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TemplateEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string; isNew?: string }>();
  const settings = useRoutineStore((state) => state.settings);
  const categories = useRoutineStore((state) => state.categories);
  const templates = useRoutineStore((state) => state.templates);
  const plans = useRoutineStore((state) => state.plans);
  const saveTemplate = useRoutineStore((state) => state.saveTemplate);
  const setPlanTemplate = useRoutineStore((state) => state.setPlanTemplate);
  const deleteTemplate = useRoutineStore((state) => state.deleteTemplate);
  const mode = modeFromSetting(settings.themeMode);
  const dark = mode === "dark";
  const theme = appTheme(mode);
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const sourceTemplate = templates.find((template) => template.id === params.templateId) ?? templateForDate(templates, new Date().toISOString().slice(0, 10));
  const editingExisting = params.isNew !== "1" && templates.some((template) => template.id === params.templateId);
  const [draft, setDraft] = useState<RoutineTemplate>(() => ({ ...sourceTemplate, blocks: sourceTemplate.blocks.map((block) => ({ ...block })), dayRules: [...sourceTemplate.dayRules] }));
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);
  const formScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => formScrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => subscription.remove();
  }, []);

  const totalSeconds = useMemo(() => draft.blocks.reduce((total, block) => total + blockDurationSeconds(block), 0), [draft.blocks]);

  const updateBlock = (index: number, patch: Partial<TemplateBlock>) => {
    setDraft((current) => ({ ...current, blocks: current.blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)) }));
  };

  const addBlock = () => {
    Keyboard.dismiss();
    setDraft((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        {
          id: `block-${Date.now()}-${current.blocks.length + 1}`,
          start: "21:00",
          end: "21:30",
          categoryId: categories[0]?.id,
          label: "New focused block",
        },
      ],
    }));
  };

  const removeBlock = (index: number) => {
    setDraft((current) => (current.blocks.length <= 1 ? current : { ...current, blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index) }));
  };

  const toggleDay = (day: number) => {
    setDraft((current) => ({
      ...current,
      dayRules: current.dayRules.includes(day) ? current.dayRules.filter((item) => item !== day) : [...current.dayRules, day].sort(),
    }));
  };

  const save = async () => {
    Keyboard.dismiss();
    const error = validateTemplateDraft(draft, totalSeconds);
    if (error) {
      toast({ kind: "error", title: error.title, message: error.message });
      return;
    }
    const updated = { ...draft, name: draft.name.trim(), description: draft.description?.trim() };
    saveTemplate(updated);
    Object.values(plans).forEach((plan) => {
      if (plan.templateId === updated.id && plan.status !== "locked") setPlanTemplate(plan.date, updated.id);
    });
    toast({ kind: "success", title: "Routine saved", message: "Your routine and editable plans are updated." });
    router.back();
  };

  const removeTemplate = () => {
    if (Object.values(plans).some((plan) => plan.templateId === draft.id)) {
      toast({ kind: "warning", title: "Routine is in use", message: "This routine is used by a plan. Edit it now, or delete it after the plan no longer uses it." });
      return;
    }
    deleteTemplate(draft.id);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-between pt-2">
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={() => router.back()}>
              <ArrowLeft size={20} color={theme.text} />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <ScreenHelpButton
                title="Routine"
                intro="Routines are reusable day blueprints. Plan uses them to create tomorrow's editable blocks."
                steps={[
                  { title: "Active days", body: "Choose which weekdays this routine should load for." },
                  { title: "Activities", body: "Each activity needs a time range, an area, and a label. Plan fills the exact goal later." },
                  { title: "18 hour rule", body: "The routine cannot exceed 18 planned hours." },
                ]}
                illustration="info-guide"
                theme={theme}
              />
              <TouchableOpacity className="flex-row items-center gap-2 rounded-full border px-4 py-3" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={removeTemplate}>
                <Trash2 size={16} color="#EF4444" />
                <Text className="font-SatoshiBlack text-xs" style={{ color: "#EF4444" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-5 flex-row items-end justify-between border-b pb-4" style={{ borderBottomColor: theme.border }}>
            <View>
              <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
                {editingExisting ? "Routine Setup" : "New Routine"}
              </Text>
              <Text className="font-SpaceGroteskBold mt-1 text-3xl" style={{ color: theme.text }}>
                {editingExisting ? "Edit Routine" : "New Routine"}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <ScrollView ref={formScrollRef} className="flex-1" contentContainerStyle={{ paddingVertical: 16, paddingBottom: Math.max(insets.bottom, 12) + 180 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                Routine Name
              </Text>
              <TextInput className="font-SatoshiBlack mt-2 rounded-xl border px-4 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} placeholderTextColor={theme.mutedText} value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />

              <Text className="font-SatoshiBlack mt-4 text-xs" style={{ color: theme.mutedText }}>
                Description
              </Text>
              <TextInput className="font-SatoshiMedium mt-2 rounded-xl border px-4 py-3 text-xs" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.mutedText }} placeholderTextColor={theme.mutedText} value={draft.description ?? ""} onChangeText={(description) => setDraft((current) => ({ ...current, description }))} />

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                  Active Days
                </Text>
                <Text className="font-SatoshiBlack text-xs" style={{ color: totalSeconds > 18 * 60 * 60 ? "#EF4444" : theme.primary }}>
                  {formatDuration(totalSeconds)} / 18:00:00
                </Text>
              </View>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {dayNames.map((day, index) => {
                  const selected = draft.dayRules.includes(index);
                  return (
                    <TouchableOpacity key={day} className="rounded-xl px-3 py-2" style={{ backgroundColor: selected ? theme.primary : theme.surfaceAlt }} onPress={() => toggleDay(index)}>
                      <Text className="font-SatoshiBlack text-xs" style={{ color: selected ? theme.primaryText : theme.mutedText }}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="mt-5 flex-row items-center justify-between">
                <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                  Activities ({draft.blocks.length})
                </Text>
                <TouchableOpacity className="flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: theme.surfaceAlt }} onPress={addBlock}>
                  <Plus size={15} color={theme.primary} />
                  <Text className="font-SatoshiBlack text-xs" style={{ color: theme.primary }}>
                    Add Activity
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-3 gap-3">
                {draft.blocks.map((block, index) => {
                  const category = categoryById(categories, block.categoryId);
                  return (
                    <View key={`${block.id}-${index}`} className="rounded-2xl border p-3" style={{ backgroundColor: dark ? "#1A1D24" : "#F8FAFC", borderColor: theme.border }}>
                      <View className="flex-row items-center justify-between">
                        <Text className="font-SatoshiBlack rounded-lg px-2 py-1 text-[10px] uppercase" style={{ backgroundColor: theme.surfaceAlt, color: theme.mutedText }}>
                          Activity #{index + 1}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <View className="rounded-lg border px-2 py-1" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                            <Text className="font-SatoshiBlack text-xs" style={{ color: category.color }}>
                              {category.label}
                            </Text>
                          </View>
                          <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border, opacity: draft.blocks.length <= 1 ? 0.5 : 1 }} disabled={draft.blocks.length <= 1} onPress={() => removeBlock(index)}>
                            <Trash2 size={17} color={draft.blocks.length <= 1 ? theme.mutedText : "#EF4444"} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View className="mt-3 flex-row gap-2">
                        <TimePickerField label="Start" value={block.start} theme={theme} onChange={(start) => updateBlock(index, { start })} />
                        <TimePickerField label="End" value={block.end} theme={theme} onChange={(end) => updateBlock(index, { end })} />
                      </View>

                      <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
                        Activity Title
                      </Text>
                      <TextInput className="font-SatoshiBlack mt-1 rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} placeholder="Activity title..." placeholderTextColor={theme.mutedText} value={block.label} onChangeText={(label) => updateBlock(index, { label })} />

                      <TouchableOpacity className="mt-3 flex-row items-center justify-between rounded-xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setOpenCategoryIndex((current) => (current === index ? null : index))}>
                        <View className="flex-row items-center gap-2">
                          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                            {category.label}
                          </Text>
                        </View>
                        <ChevronDown size={15} color={theme.mutedText} />
                      </TouchableOpacity>
                      {openCategoryIndex === index && (
                        <ScrollView className="mt-2 rounded-xl border p-2" style={{ backgroundColor: theme.input, borderColor: theme.border, maxHeight: 244 }} nestedScrollEnabled>
                          {categories.map((item) => (
                            <AreaOption
                              key={item.id}
                              label={item.label}
                              active={draft.blocks[index].categoryId === item.id}
                              color={item.color}
                              theme={theme}
                              onPress={() => {
                                updateBlock(index, { categoryId: item.id });
                                setOpenCategoryIndex(null);
                              }}
                            />
                          ))}
                        </ScrollView>
                      )}

                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t px-4 pt-3" style={{ borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 12) }}>
            <TouchableOpacity className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: theme.surfaceAlt }} onPress={() => router.back()}>
              <Text className="font-SatoshiBlack text-center text-xs" style={{ color: theme.mutedText }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: theme.accent }} onPress={save}>
              <Check size={16} color="#0B0D10" />
              <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                Save Routine
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <NotificationPermissionBanner />
    </SafeAreaView>
  );
}

function blockName(block: TemplateBlock, index: number) {
  return `Block #${index + 1}${block.label.trim() ? ` (${block.label.trim()})` : ""}`;
}

function validateTemplateDraft(draft: RoutineTemplate, totalSeconds: number) {
  if (!draft.name.trim()) return { title: "Missing name", message: "Enter a name first." };
  if (!draft.dayRules.length) return { title: "Choose at least one active day.", message: "Select the day or days when this routine should be available." };

  for (const [index, block] of draft.blocks.entries()) {
    const name = blockName(block, index);
    if (!block.label.trim()) return { title: `${name} needs a title.` };
    if (!block.categoryId) return { title: `${name} needs an area.` };
    if (!block.start || !block.end) return { title: `${name} needs start and end time.` };
    if (timeToMinutes(block.end) <= timeToMinutes(block.start)) return { title: `${name} has wrong time.`, message: "End time must be after start time." };
  }

  const indexed = draft.blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => timeToMinutes(a.block.start) - timeToMinutes(b.block.start));
  for (let index = 1;index < indexed.length;index += 1) {
    const previous = indexed[index - 1];
    const current = indexed[index];
    if (timeToMinutes(current.block.start) < timeToMinutes(previous.block.end)) {
      return {
        title: `Activity #${current.index + 1} timing needs attention.`,
        message: `Activity #${current.index + 1} overlaps Activity #${previous.index + 1}. Set it to start at or after Activity #${previous.index + 1} ends.`,
      };
    }
  }

  if (totalSeconds > 18 * 60 * 60) {
    return {
      title: "Set time limits correctly.",
      message: `Planned time is ${formatDuration(totalSeconds)}. It should not cross 18:00:00.`,
    };
  }

  return null;
}

