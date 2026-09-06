import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Check, CheckCircle2, ChevronDown, Clock, Info, Layers, Link2, Pencil, StickyNote, Trash2, X } from "lucide-react-native";
import { PageShell } from "@/src/components/PageShell";
import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, dateFromOffset, dateHasStarted, fullDisplayDate, formatRange, timeToMinutes } from "@/src/lib/date";
import { logActionError } from "@/src/lib/logger";
import { schedulePlansNotifications } from "@/src/lib/notifications";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { templateForDate } from "@/src/lib/templates";
import { formatDuration } from "@/src/lib/youtube";
import { useRoutineStore } from "@/src/store/routineStore";
import { useToast } from "@/src/components/ToastProvider";
import { ConfirmModal } from "@/src/components/ConfirmModal";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { TimePickerField } from "@/src/components/TimePickerField";
import { AppIllustration } from "@/src/components/AppIllustration";
import type { DailyPlanBlock, ResourceItem } from "@/src/types";

const maxPlannedSeconds = 18 * 60 * 60;
let planIntroShownThisLaunch = false;

export default function PlannerScreen() {
  const router = useRouter();
  const settings = useRoutineStore((state) => state.settings);
  const categories = useRoutineStore((state) => state.categories);
  const templates = useRoutineStore((state) => state.templates);
  const resources = useRoutineStore((state) => state.resources);
  const plans = useRoutineStore((state) => state.plans);
  const ensureDraftPlan = useRoutineStore((state) => state.ensureDraftPlan);
  const setPlanTemplate = useRoutineStore((state) => state.setPlanTemplate);
  const updatePlanBlock = useRoutineStore((state) => state.updatePlanBlock);
  const deletePlanBlock = useRoutineStore((state) => state.deletePlanBlock);
  const clearPlan = useRoutineStore((state) => state.clearPlan);
  const togglePlanResourceItem = useRoutineStore((state) => state.togglePlanResourceItem);
  const lockPlan = useRoutineStore((state) => state.lockPlan);
  const mode = modeFromSetting(settings.themeMode);
  const dark = mode === "dark";
  const theme = appTheme(mode);
  const toast = useToast();
  const tomorrow = dateFromOffset(1);
  const plan = plans[tomorrow];
  const selectedTemplate = plan?.templateId ? templates.find((template) => template.id === plan.templateId) ?? templateForDate(templates, tomorrow) : templateForDate(templates, tomorrow);
  const [finalizedBlocks, setFinalizedBlocks] = useState<Record<string, boolean>>({});
  const [openBlockIds, setOpenBlockIds] = useState<Record<string, boolean>>({});
  const [resourcePageByBlock, setResourcePageByBlock] = useState<Record<string, number>>({});
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [categoryMenuBlockId, setCategoryMenuBlockId] = useState<string | null>(null);
  const [lockStep, setLockStep] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteConfirmBlock, setDeleteConfirmBlock] = useState<DailyPlanBlock | null>(null);
  const [infoBlock, setInfoBlock] = useState<DailyPlanBlock | null>(null);
  const canEdit = !dateHasStarted(tomorrow) && plan?.status !== "locked";

  useEffect(() => {
    if (!useRoutineStore.getState().plans[tomorrow]) ensureDraftPlan(tomorrow);
  }, [ensureDraftPlan, tomorrow]);

  useFocusEffect(
    useCallback(() => {
      const current = useRoutineStore.getState().plans[tomorrow];
      if (!current || current.status !== "locked") ensureDraftPlan(tomorrow);
      if (!planIntroShownThisLaunch) {
        planIntroShownThisLaunch = true;
        setIntroOpen(true);
      }
    }, [ensureDraftPlan, tomorrow]),
  );

  useEffect(() => {
    if (!plan?.blocks.length) return;
    setFinalizedBlocks((current) => Object.fromEntries(plan.blocks.map((block) => [block.id, current[block.id] ?? false])));
    setOpenBlockIds((current) => Object.fromEntries(plan.blocks.map((block) => [block.id, current[block.id] ?? true])));
  }, [plan?.blocks]);

  const itemById = useMemo(() => new Map(resources.flatMap((resource) => resource.items).map((item) => [item.id, item])), [resources]);
  const totalSeconds = useMemo(() => (plan?.blocks ?? []).reduce((sum, block) => sum + blockDurationSeconds(block), 0), [plan?.blocks]);
  const allFinalized = Boolean(plan?.blocks.length) && plan.blocks.every((block) => finalizedBlocks[block.id]);
  const locked = plan?.status === "locked";

  const writeAllowed = () => {
    if (canEdit) return true;
    toast({ kind: "warning", title: "Plan unavailable", message: "This plan can't be changed after it has started." });
    return false;
  };

  const validate = () => {
    if (!plan?.blocks.length) return "Create or finalize a plan to get started.";
    if (totalSeconds > maxPlannedSeconds) return "Keep the day under 18 planned hours.";
    if (!allFinalized) return "Finish every block before finalizing the day.";
    const sorted = [...plan.blocks].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    if (sorted.some((block, index) => (index ? timeToMinutes(block.start) < timeToMinutes(sorted[index - 1].end) : false))) return "Plan blocks overlap. Fix the times first.";
    for (const block of plan.blocks) {
      if (!block.start || !block.end || !block.title.trim() || !block.goal.trim() || !block.categoryId || timeToMinutes(block.end) <= timeToMinutes(block.start)) return "Check block start and end time.";
      if (timeToMinutes(block.start) - settings.startReminderMinutes === timeToMinutes(block.end) - settings.endReminderMinutes) return "Start and end reminders cannot overlap.";
    }
    return "";
  };

  const openConfirm = () => {
    const error = validate();
    if (error) {
      toast({ kind: "error", title: error });
      return;
    }
    setLockStep(1);
  };

  const lockTomorrow = async () => {
    if (!writeAllowed()) return;
    const saved = lockPlan(tomorrow);
    if (!saved) return;
    setLockStep(0);
    try {
      await schedulePlansNotifications(Object.values({ ...plans, [tomorrow]: saved }), settings);
    } catch (error) {
      logActionError("lock tomorrow", error, { date: tomorrow });
    }
  };

  const confirmLockStep = () => {
    if (lockStep < 3) {
      setLockStep((step) => step + 1);
      return;
    }
    lockTomorrow();
  };

  const changeTemplate = (templateId: string) => {
    if (!writeAllowed()) return;
    if (plan?.blocks.length && templateId !== plan.templateId) {
      setPendingTemplateId(templateId);
      setTemplateMenuOpen(false);
      return;
    }
    applyTemplate(templateId);
  };

  const applyTemplate = (templateId: string) => {
    const nextPlan = setPlanTemplate(tomorrow, templateId);
    if (!nextPlan) return;
    setTemplateMenuOpen(false);
    setFinalizedBlocks(Object.fromEntries(nextPlan.blocks.map((block) => [block.id, false])));
    setOpenBlockIds(Object.fromEntries(nextPlan.blocks.map((block) => [block.id, true])));
  };

  const clearTomorrow = () => {
    clearPlan(tomorrow);
    setFinalizedBlocks({});
    setOpenBlockIds({});
    setClearConfirmOpen(false);
  };

  const removeBlock = () => {
    if (!deleteConfirmBlock) return;
    deletePlanBlock(tomorrow, deleteConfirmBlock.id);
    setDeleteConfirmBlock(null);
  };

  const updateBlock = (block: DailyPlanBlock, patch: Partial<DailyPlanBlock>) => {
    if (!writeAllowed()) return;
    updatePlanBlock(tomorrow, block.id, patch);
    setFinalizedBlocks((current) => ({ ...current, [block.id]: false }));
  };

  const toggleResource = (block: DailyPlanBlock, itemId: string) => {
    if (!writeAllowed()) return;
    togglePlanResourceItem(tomorrow, block.id, itemId);
    setFinalizedBlocks((current) => ({ ...current, [block.id]: false }));
  };

  return (
    <PageShell theme={theme} bottomPadding={170} keepKeyboardOpen>
      <ScreenHeader eyebrow="Plan Tomorrow" title="Plan" theme={theme} actions={
            <>
              <ScreenHelpButton
                title="Plan"
                intro="Plan turns a reusable routine into tomorrow's exact list."
                steps={[
                  { title: "Choose routine", body: "The app auto-picks by weekday, but you can change it before finalizing." },
                  { title: "Finish activities", body: "Fill time, title, area, videos, goal, and notes, then finish each activity." },
                  { title: "Finalize day", body: "After tomorrow starts, the plan becomes your history." },
                ]}
                illustration="screen-plan"
                theme={theme}
              />
              <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={() => router.push(`/template-editor?templateId=${selectedTemplate.id}`)}>
                <Layers size={17} color={theme.primary} />
              </TouchableOpacity>
            </>
          } />

          <View className="mt-5 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row flex-1 items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                  <Calendar size={21} color={theme.accent} />
                </View>
                <View className="flex-1">
                  <Text className="font-SatoshiMedium text-[11px]" style={{ color: theme.mutedText }}>
                    Planning Ahead
                  </Text>
                  <Text className="font-SpaceGroteskBold mt-1 text-sm" style={{ color: theme.text }}>
                    {fullDisplayDate(tomorrow)}
                  </Text>
                </View>
              </View>
              <Text className="font-SatoshiBlack rounded-full border px-3 py-1 text-[10px]" style={{ borderColor: totalSeconds > maxPlannedSeconds ? "#EF444455" : "#22C55E55", color: totalSeconds > maxPlannedSeconds ? "#EF4444" : "#22C55E", backgroundColor: totalSeconds > maxPlannedSeconds ? "#EF444422" : "#22C55E22" }}>
                {formatDuration(totalSeconds)} / 18:00:00
              </Text>
            </View>
            <View className="mt-4 border-t pt-3" style={{ borderTopColor: theme.border }}>
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <Text className="font-SatoshiMedium text-xs" style={{ color: theme.mutedText }}>
                    Routine for tomorrow
                  </Text>
                  <TouchableOpacity className="mt-2 flex-row items-center justify-between rounded-2xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setTemplateMenuOpen((value) => !value)} disabled={!canEdit}>
                    <Text className="font-SpaceGroteskBold text-base" style={{ color: theme.text }}>
                      {selectedTemplate.name}
                    </Text>
                    <ChevronDown size={16} color={theme.mutedText} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity accessibilityLabel="Routine auto-pick help" className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => toast({ kind: "info", title: "Routine selected", message: "You can change the routine before finalizing." })}>
                  <Info size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
              {templateMenuOpen && (
                <ScrollView className="mt-2 rounded-2xl border p-2" style={{ backgroundColor: theme.input, borderColor: theme.border, maxHeight: 260 }} nestedScrollEnabled>
                  {templates.map((template) => (
                    <TouchableOpacity key={template.id} className="rounded-xl px-3 py-3" style={{ backgroundColor: template.id === selectedTemplate.id ? theme.surfaceAlt : "transparent" }} onPress={() => changeTemplate(template.id)}>
                      <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                        {template.name}
                      </Text>
                      <Text className="font-SatoshiMedium mt-1 text-[10px]" style={{ color: theme.mutedText }}>
                        {template.blocks.length} activities - {template.dayRules.length ? "weekday match" : "manual"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {!templates.length && (
                    <Text className="font-SatoshiMedium px-3 py-2 text-xs" style={{ color: theme.mutedText }}>
                      Create a routine in Library first.
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>

          {locked && (
            <View className="mt-4 rounded-2xl border px-4 py-3" style={{ backgroundColor: "#22C55E22", borderColor: "#22C55E55" }}>
              <Text className="font-SatoshiBlack text-xs" style={{ color: "#22C55E" }}>
                Tomorrow is ready.
              </Text>
            </View>
          )}

          <View className="mt-5 gap-3">
            {(plan?.blocks ?? []).map((block, index) => {
              const category = categoryById(categories, block.categoryId);
              const items = resourcesForBlock(block, resources.flatMap((resource) => resource.items));
              const assigned = block.resourceItemIds.map((id) => itemById.get(id)).filter((item): item is ResourceItem => Boolean(item));
              const finalized = finalizedBlocks[block.id];
              const open = openBlockIds[block.id] ?? true;
              const compact = locked || (finalized && !open);
              const firstOpenIndex = Math.max(0, items.findIndex((item) => !item.completed));
              const page = resourcePageByBlock[block.id] ?? Math.floor((firstOpenIndex === -1 ? 0 : firstOpenIndex) / 5);
              const pageCount = Math.max(1, Math.ceil(items.length / 5));
              const safePage = Math.min(page, pageCount - 1);
              const visibleItems = items.slice(safePage * 5, safePage * 5 + 5);
              if (compact) {
                return (
                  <View key={block.id} className="rounded-2xl border p-4" style={{ backgroundColor: theme.surface, borderColor: finalized || locked ? "#22C55E66" : theme.border }}>
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="font-SatoshiBlack rounded-lg border px-2 py-1 text-[11px]" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.accent }}>
                            {formatRange(block)}
                          </Text>
                          <Text className="font-SatoshiBlack rounded-lg border px-2 py-1 text-[10px]" style={{ color: category.color, backgroundColor: `${category.color}22`, borderColor: `${category.color}55` }}>
                            {category.label}
                          </Text>
                        </View>
                        <Text className="font-SpaceGroteskBold mt-2 text-base" style={{ color: theme.text }}>
                          {block.title}
                        </Text>
                        <Text className="font-SatoshiMedium mt-1 text-xs" numberOfLines={2} style={{ color: theme.mutedText }}>
                          {block.goal || assigned[0]?.title || "No goal added."}
                        </Text>
                        {(finalized || locked) && (
                          <Text className="font-SatoshiBlack mt-2 text-[10px]" style={{ color: "#22C55E" }}>
                            Activity ready
                          </Text>
                        )}
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={() => setInfoBlock(block)}>
                          <Info size={14} color={theme.primary} />
                        </TouchableOpacity>
                        {!locked && (
                          <>
                          <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={() => setOpenBlockIds((current) => ({ ...current, [block.id]: true }))}>
                            <Pencil size={14} color={theme.text} />
                          </TouchableOpacity>
                          <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={() => setDeleteConfirmBlock(block)}>
                            <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                );
              }
              return (
                <View key={block.id} className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: finalized ? "#22C55E66" : theme.border }}>
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-row flex-1 flex-wrap items-center gap-2">
                      <View className="flex-row items-center gap-1 rounded-lg border px-2 py-1" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
                        <Clock size={12} color={theme.primary} />
                        <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.accent }}>
                          {formatRange(block)}
                        </Text>
                      </View>
                      <Text className="font-SatoshiBlack rounded-md border px-2 py-1 text-[9px] uppercase" style={{ color: category.color, backgroundColor: `${category.color}22`, borderColor: `${category.color}55` }}>
                        {category.label}
                      </Text>
                    </View>
                    <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                      #{index + 1}
                    </Text>
                  </View>

                  <View className="mt-3 flex-row gap-2">
                    <TimePickerField label="Start" value={block.start} theme={theme} disabled onChange={() => undefined} />
                    <TimePickerField label="End" value={block.end} theme={theme} disabled onChange={() => undefined} />
                  </View>

                  <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
                    Title
                  </Text>
                  <TextInput className="font-SatoshiBlack mt-1 rounded-xl border px-3 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} placeholderTextColor={theme.mutedText} value={block.title} editable={false} placeholder="Activity title" />

                  <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
                    Area
                  </Text>
                  <View className="mt-1 flex-row items-center justify-between rounded-xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                    <View className="flex-row items-center gap-2">
                      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                        {category.label}
                      </Text>
                    </View>
                    <ChevronDown size={15} color={theme.mutedText} />
                  </View>

                  <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: dark ? "#0B0D10" : "#F8FAFC", borderColor: theme.border }}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Link2 size={14} color={theme.primary} />
                        <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                          Videos in this block
                        </Text>
                      </View>
                      <Text className="font-SatoshiBold text-[10px]" style={{ color: theme.mutedText }}>
                        {assigned.length} selected
                      </Text>
                    </View>
                    <View className="mt-3 gap-2">
                      {visibleItems.map((item, itemIndex) => {
                        const selected = block.resourceItemIds.includes(item.id);
                        return (
                          <View key={item.id} className="flex-row items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: selected ? "#38BDF81A" : theme.surface, borderColor: selected ? theme.primary : theme.border }}>
                            <View className="h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surfaceAlt }}>
                              {selected ? (
                                <Check size={15} color="#0B0D10" />
                              ) : (
                                <Text className="font-SatoshiBlack text-[10px]" style={{ color: theme.mutedText }}>
                                  {safePage * 5 + itemIndex + 1}
                                </Text>
                              )}
                            </View>
                            <View className="flex-1">
                              <Text className="font-SatoshiBlack text-xs" numberOfLines={2} style={{ color: theme.text }}>
                                {item.title}
                              </Text>
                              <Text className="font-SatoshiMedium mt-1 text-[10px]" style={{ color: theme.mutedText }}>
                                {formatDuration(item.durationSeconds)}
                              </Text>
                            </View>
                        </View>
                        );
                      })}
                      {!items.length && (
                        <Text className="font-SatoshiMedium text-xs leading-5" style={{ color: theme.mutedText }}>
                          Add videos in Library first.
                        </Text>
                      )}
                    </View>
                    {items.length > 5 && (
                      <View className="mt-3 flex-row items-center justify-between">
                        <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }} disabled={safePage === 0} onPress={() => setResourcePageByBlock((current) => ({ ...current, [block.id]: Math.max(0, safePage - 1) }))}>
                          <Text className="font-SatoshiBlack text-xs" style={{ color: safePage === 0 ? theme.mutedText : theme.text }}>
                            Prev
                          </Text>
                        </TouchableOpacity>
                        <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                          {safePage + 1}/{pageCount}
                        </Text>
                        <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }} disabled={safePage >= pageCount - 1} onPress={() => setResourcePageByBlock((current) => ({ ...current, [block.id]: Math.min(pageCount - 1, safePage + 1) }))}>
                          <Text className="font-SatoshiBlack text-xs" style={{ color: safePage >= pageCount - 1 ? theme.mutedText : theme.text }}>
                            Next
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
                    Goal / Exact Output
                  </Text>
                  <TextInput className="font-SatoshiMedium mt-1 min-h-20 rounded-xl border px-3 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} placeholderTextColor={theme.mutedText} value={block.goal} editable={false} placeholder="e.g. Complete graph BFS videos + notes" multiline />

                  <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
                    Notes
                  </Text>
                  <View className="mt-1 flex-row gap-2 rounded-xl border px-3 py-2" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                    <StickyNote size={15} color={theme.mutedText} />
                    <TextInput className="font-SatoshiMedium flex-1 text-sm" style={{ color: theme.text, minHeight: 56 }} placeholderTextColor={theme.mutedText} value={block.notes ?? ""} editable={false} placeholder="Optional: links, page numbers, constraints..." multiline />
                  </View>

                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border"
                      style={{ backgroundColor: "#22C55E22", borderColor: "#22C55E55" }}
                      onPress={() => {
                        setFinalizedBlocks((current) => ({ ...current, [block.id]: true }));
                        setOpenBlockIds((current) => ({ ...current, [block.id]: false }));
                      }}
                      disabled={!canEdit}
                    >
                      <CheckCircle2 size={16} color="#22C55E" />
                      <Text className="font-SatoshiBlack text-xs" style={{ color: "#22C55E" }}>
                        Finalize Block
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-2xl border" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={() => setDeleteConfirmBlock(block)} disabled={!canEdit}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {!plan?.blocks.length && (
            <View className="mt-5 items-center rounded-3xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <AppIllustration name="empty-organize-files" size={140} />
              <Text className="font-SatoshiBlack mt-3 text-sm" style={{ color: theme.text }}>
                No routines yet.
              </Text>
              <Text className="font-SatoshiMedium mt-1 text-center text-xs" style={{ color: theme.mutedText }}>
                Create a routine in Library first.
              </Text>
            </View>
          )}

          {!!plan?.blocks.length && !locked && (
            <View className="mt-5 gap-3">
              <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-2xl px-4 py-4" style={{ backgroundColor: theme.accent }} onPress={openConfirm} disabled={!canEdit}>
                <CheckCircle2 size={18} color="#0B0D10" />
                <Text className="font-SatoshiBlack text-base" style={{ color: "#0B0D10" }}>
                  Finalize Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: "#EF44441A", borderColor: "#EF444455" }} onPress={() => setClearConfirmOpen(true)} disabled={!canEdit}>
                <Trash2 size={16} color="#EF4444" />
                <Text className="font-SatoshiBlack text-sm" style={{ color: "#EF4444" }}>
                  Clear Tomorrow Plan
                </Text>
              </TouchableOpacity>
            </View>
          )}
      <PlanIntroDrawer visible={introOpen} theme={theme} onClose={() => setIntroOpen(false)} />
      <ConfirmModal
        visible={lockStep > 0}
        stepLabel={`Step ${lockStep} of 3`}
        title={lockStep === 1 ? "Review the plan" : lockStep === 2 ? "This becomes your day" : "Finalize day?"}
        message={
          lockStep === 1
            ? `${plan?.blocks.length ?? 0} finalized blocks are ready for ${fullDisplayDate(tomorrow)}.`
            : lockStep === 2
              ? "After the day starts, this plan should not be edited. Today will only mark done or leave blocks not done."
              : "Finalize this as tomorrow's routine."
        }
        confirmLabel={lockStep === 3 ? "Finalize Day" : "Continue"}
        theme={theme}
        onCancel={() => setLockStep(0)}
        onConfirm={confirmLockStep}
      />
      <ConfirmModal
        visible={clearConfirmOpen}
        title="Clear tomorrow's plan?"
        message="This removes the current plan from this phone. Your routines and videos stay safe."
        confirmLabel="Clear Plan"
        danger
        theme={theme}
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={clearTomorrow}
      />
      <ConfirmModal
        visible={!!deleteConfirmBlock}
        title="Delete this activity?"
        message={deleteConfirmBlock ? `${deleteConfirmBlock.title} will be removed from tomorrow's plan.` : "This activity will be removed from tomorrow's plan."}
        confirmLabel="Delete Block"
        danger
        theme={theme}
        onCancel={() => setDeleteConfirmBlock(null)}
        onConfirm={removeBlock}
      />
      <ConfirmModal
        visible={!!pendingTemplateId}
        title="Switch routine?"
        message="Current draft block edits will be replaced by the selected routine."
        confirmLabel="Switch Routine"
        danger
        theme={theme}
        onCancel={() => setPendingTemplateId(null)}
        onConfirm={() => {
          if (pendingTemplateId) applyTemplate(pendingTemplateId);
          setPendingTemplateId(null);
        }}
      />
      <BlockInfoModal
        block={infoBlock}
        category={infoBlock ? categoryById(categories, infoBlock.categoryId) : undefined}
        items={infoBlock ? infoBlock.resourceItemIds.map((id) => itemById.get(id)).filter((item): item is ResourceItem => Boolean(item)) : []}
        theme={theme}
        onClose={() => setInfoBlock(null)}
      />
    </PageShell>
  );
}

function PlanIntroDrawer({ visible, theme, onClose }: { visible: boolean; theme: ReturnType<typeof appTheme>; onClose: () => void }) {
  const steps = [
    "Choose the routine for tomorrow.",
    "Fill each block: time, title, area, videos, goal, and notes.",
    "Finish every block after checking it.",
    "Review the full tomorrow plan once.",
    "Finalize tomorrow with the 3-step confirmation.",
    "After the day starts, treat it as your history.",
    "Clear only before finalizing or before the day starts.",
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
        <View className="max-h-[84%] rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
          <AppIllustration name="onboarding-planning" size={136} style={{ alignSelf: "center", marginBottom: 14 }} />
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
                Tomorrow planning flow
              </Text>
              <Text className="font-SpaceGroteskBold mt-1 text-2xl" style={{ color: theme.text }}>
                Plan carefully, then lock
              </Text>
              <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.mutedText }}>
                This page turns your routine into tomorrow&apos;s exact plan.
              </Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onClose}>
              <X size={16} color={theme.mutedText} />
            </TouchableOpacity>
          </View>

          <View className="mt-5 gap-3">
            {steps.map((step, index) => (
              <View key={step} className="flex-row gap-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent }}>
                  <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                    {index + 1}
                  </Text>
                </View>
                <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.text }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onClose}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Understood
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function BlockInfoModal({ block, category, items, theme, onClose }: { block: DailyPlanBlock | null; category?: ReturnType<typeof categoryById>; items: ResourceItem[]; theme: ReturnType<typeof appTheme>; onClose: () => void }) {
  return (
    <Modal visible={!!block} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
        {block && (
          <View className="max-h-[84%] rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
                  {formatRange(block)}
                </Text>
                <Text className="font-SpaceGroteskBold mt-1 text-2xl leading-7" style={{ color: theme.text }}>
                  {block.title}
                </Text>
                <Text className="font-SatoshiBold mt-1 text-xs" style={{ color: category?.color ?? theme.primary }}>
                  {category?.label ?? "Uncategorized"}
                </Text>
              </View>
              <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onClose}>
                <X size={16} color={theme.mutedText} />
              </TouchableOpacity>
            </View>
            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <InfoRow title="Goal" value={block.goal || "No goal added."} theme={theme} />
              {!!block.notes?.trim() && <InfoRow title="Notes" value={block.notes} theme={theme} />}
              <InfoRow title="Duration" value={formatDuration(blockDurationSeconds(block))} theme={theme} />
              <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
                  Videos in this block
                </Text>
                <View className="mt-2 gap-2">
                  {items.map((item, index) => (
                    <View key={item.id} className="flex-row gap-3 rounded-xl p-3" style={{ backgroundColor: theme.input }}>
                      <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                        {index + 1}
                      </Text>
                      <View className="flex-1">
                        <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                          {item.title}
                        </Text>
                        <Text className="font-SatoshiMedium mt-1 text-[10px]" style={{ color: theme.mutedText }}>
                          {formatDuration(item.durationSeconds)}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {!items.length && (
                    <Text className="font-SatoshiMedium text-xs" style={{ color: theme.mutedText }}>
                      No videos have been added to this block yet.
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

function InfoRow({ title, value, theme }: { title: string; value: string; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
        {title}
      </Text>
      <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.text }}>
        {value}
      </Text>
    </View>
  );
}

function resourcesForBlock(block: DailyPlanBlock, items: ResourceItem[]) {
  return items.filter((item) => item.completed === false || block.resourceItemIds.includes(item.id)).filter((item) => item.resourceId && itemMatchesCategory(item, block.categoryId));
}

function itemMatchesCategory(item: ResourceItem, categoryId: string) {
  const resource = useRoutineStore.getState().resources.find((entry) => entry.id === item.resourceId);
  return resource?.categoryId === categoryId;
}
