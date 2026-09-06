import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Atom, BookOpen, Calendar, Check, Clock, Dumbbell, FileText, HeartPulse, Link2, Sparkles, StickyNote, Target, X } from "lucide-react-native";
import { categoryById } from "@/src/lib/categories";
import { shareDailyReport } from "@/src/lib/dailyReport";
import { blockDurationSeconds, dateFromOffset, displayDate, formatRange, nowMinutes, timeToMinutes } from "@/src/lib/date";
import { logActionError } from "@/src/lib/logger";
import { schedulePlansNotifications, sendAutoNotDoneNotification } from "@/src/lib/notifications";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { formatDuration } from "@/src/lib/youtube";
import { useRoutineStore } from "@/src/store/routineStore";
import { useToast } from "@/src/components/ToastProvider";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { AppIllustration } from "@/src/components/AppIllustration";
import { PageShell } from "@/src/components/PageShell";
import type { DailyPlanBlock, PlanResourceItemSnapshot, ResourceItem } from "@/src/types";

const studyCategories = ["DSA", "JavaScript", "System Design", "Networking", "SQL"];
const fightCategories = ["Gym", "Karate", "Punching"];

function categoryMeta(label: string, dark: boolean, color: string) {
  if (studyCategories.includes(label)) return { icon: BookOpen, accent: color, bg: dark ? "#0C2737" : "#E0F2FE", text: dark ? "#7DD3FC" : "#075985" };
  if (label === "Physics") return { icon: Atom, accent: color, bg: dark ? "#2E2411" : "#FEF3C7", text: dark ? "#FBBF24" : "#92400E" };
  if (fightCategories.includes(label)) return { icon: Dumbbell, accent: color, bg: dark ? "#30151C" : "#FFE4E6", text: dark ? "#FDA4AF" : "#9F1239" };
  if (label === "Recovery") return { icon: HeartPulse, accent: color, bg: dark ? "#102A20" : "#D1FAE5", text: dark ? "#6EE7B7" : "#065F46" };
  return { icon: Sparkles, accent: color, bg: dark ? "#1C2140" : "#E0E7FF", text: dark ? "#A5B4FC" : "#3730A3" };
}

export default function TodayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reminderKind?: string; reminderTitle?: string; reminderMinutes?: string; notificationAction?: string }>();
  const settings = useRoutineStore((state) => state.settings);
  const categories = useRoutineStore((state) => state.categories);
  const resources = useRoutineStore((state) => state.resources);
  const plans = useRoutineStore((state) => state.plans);
  const lockTodayFromTemplate = useRoutineStore((state) => state.lockTodayFromTemplate);
  const setBlockStatus = useRoutineStore((state) => state.setBlockStatus);
  const markExpiredBlocksNotDone = useRoutineStore((state) => state.markExpiredBlocksNotDone);
  const mode = modeFromSetting(settings.themeMode);
  const dark = mode === "dark";
  const theme = appTheme(mode);
  const toast = useToast();
  const today = dateFromOffset(0);
  const plan = plans[today];
  const blocks = useMemo(() => (plan?.status === "locked" ? plan.blocks : []), [plan]);
  const [tick, setTick] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<DailyPlanBlock | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const expiredBlocks = markExpiredBlocksNotDone(today);
    if (!expiredBlocks.length) return;
    const firstBlock = expiredBlocks[0];
    toast({
      kind: "warning",
      title: "Missed block",
      message: "This block has ended. Mark it complete if you finished it.",
    });
    if (firstBlock) sendAutoNotDoneNotification(firstBlock, today, settings).catch((error) => logActionError("auto not done notification", error, { blockId: firstBlock.id }));
  }, [markExpiredBlocksNotDone, settings, tick, today, toast]);

  useEffect(() => {
    if (!params.reminderKind || !params.reminderTitle) return;
    if (params.notificationAction === "done") {
      toast({ kind: "success", title: "Task completed", message: "Nice work. This task is complete." });
      return;
    }
    const title = params.reminderKind === "end" ? "Wrapping up" : "Coming up";
    const message =
      params.reminderKind === "end"
        ? `${params.reminderTitle} is ending soon.`
        : `${params.reminderTitle} is ready.`;
    toast({ kind: "info", title, message });
  }, [params.notificationAction, params.reminderKind, params.reminderMinutes, params.reminderTitle, toast]);

  const activeBlock = useMemo(() => {
    const minute = nowMinutes() + tick * 0;
    return blocks.find((block) => timeToMinutes(block.start) <= minute && timeToMinutes(block.end) > minute) ?? blocks.find((block) => timeToMinutes(block.start) > minute) ?? blocks[blocks.length - 1];
  }, [blocks, tick]);

  const itemById = useMemo(() => new Map(resources.flatMap((resource) => resource.items).map((item) => [item.id, item])), [resources]);
  const doneCount = blocks.filter((block) => block.status === "done").length;
  const progress = blocks.length ? Math.round((doneCount / blocks.length) * 100) : 0;
  const allDone = Boolean(blocks.length) && doneCount === blocks.length;

  const lockToday = async () => {
    const saved = lockTodayFromTemplate(today);
    try {
      await schedulePlansNotifications(Object.values({ ...plans, [today]: saved }), settings);
    } catch (error) {
      logActionError("lock today", error);
    }
  };

  const markBlock = (blockId: string, status: "done" | "not-done") => {
    setBlockStatus(today, blockId, status);
    const nextBlock = useRoutineStore.getState().plans[today]?.blocks.find((block) => block.id === blockId) ?? null;
    setSelectedBlock(nextBlock);
    toast({ kind: status === "done" ? "success" : "info", title: status === "done" ? "Activity completed" : "Activity skipped", message: status === "done" ? "Nice work. This activity is marked done." : "This activity is marked skipped." });
  };

  const blockItems = (block: DailyPlanBlock): (PlanResourceItemSnapshot | ResourceItem)[] => {
    if (block.resourceItems?.length) return block.resourceItems;
    return block.resourceItemIds.map((id) => itemById.get(id)).filter((item): item is ResourceItem => Boolean(item));
  };
  const blockCanBeMarked = (block: DailyPlanBlock) => timeToMinutes(block.start) <= nowMinutes();

  const generateReport = async () => {
    if (!plan) return;
    setReporting(true);
    try {
      await shareDailyReport(plan, categories, settings);
    } catch (error) {
      logActionError("daily pdf report", error, { date: today });
      toast({ kind: "error", title: "Save failed", message: "We couldn't save that change. Please try again." });
    } finally {
      setReporting(false);
    }
  };

  if (!blocks.length || !activeBlock) {
    return (
      <PageShell theme={theme} bottomPadding={24} fillContent>
        <View className="flex-1 items-center justify-center px-6 pb-24">
          <AppIllustration name="empty-tasks" size={170} />
          <Text className="font-SpaceGroteskBold mt-5 text-center text-2xl" style={{ color: theme.text }}>
            Nothing planned for today.
          </Text>
          <Text className="font-SatoshiMedium mt-2 max-w-xs text-center text-sm leading-5" style={{ color: theme.mutedText }}>
            Create or finalize a plan to get started.
          </Text>
          <TouchableOpacity className="mt-6 w-full max-w-xs flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4" style={{ backgroundColor: theme.accent }} onPress={lockToday}>
            <Sparkles size={17} color="#0B0D10" />
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Start Today Plan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-3 w-full max-w-xs rounded-2xl border px-5 py-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }} onPress={() => router.push("/planner")}>
            <Text className="font-SatoshiBlack text-center text-sm" style={{ color: theme.text }}>
              Plan Tomorrow
            </Text>
          </TouchableOpacity>
        </View>
      </PageShell>
    );
  }

  const activeCategory = categoryById(categories, activeBlock.categoryId);
  const activeMeta = categoryMeta(activeCategory.label, dark, activeCategory.color);
  const ActiveIcon = activeMeta.icon;

  return (
    <PageShell theme={theme} bottomPadding={116}>
        <View className="flex-row items-center justify-between pt-2">
          <View>
            <Text className="font-SatoshiMedium text-xs" style={{ color: theme.mutedText }}>
              Hello {settings.displayName || "there"}
            </Text>
            <Text className="font-SpaceGroteskBold mt-1 text-2xl" style={{ color: theme.text }}>
              Today
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1 rounded-full border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Calendar size={13} color={theme.primary} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                {displayDate(today)}
              </Text>
            </View>
            <ScreenHelpButton
              title="Today"
              intro="Today is your routine in progress. It shows the finalized plan for the real date and follows real time."
              steps={[
                { title: "Active block", body: "The highlighted block is based on current time, not on button clicks." },
                { title: "Complete", body: "Tap Complete when you honestly finished. If you forget, the block becomes skipped after it ends." },
                { title: "Details", body: "Tap any timeline block to see the full goal, notes, area, and videos." },
              ]}
              illustration="screen-today"
              theme={theme}
            />
          </View>
        </View>

        <TouchableOpacity className="mt-5 rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: allDone ? theme.border : activeMeta.accent }} onPress={() => !allDone && setSelectedBlock(activeBlock)} disabled={allDone}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
              <Text className="font-SatoshiBlack text-[11px] uppercase" style={{ color: theme.primary }}>
                {allDone ? "All done" : "Active Now"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
              <Clock size={12} color={theme.primary} />
              <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.accent }}>
                {allDone ? "No activities left" : formatRange(activeBlock)}
              </Text>
            </View>
          </View>
          <Text className="font-SpaceGroteskBold mt-4 text-xl leading-6" style={{ color: theme.text }}>
            {allDone ? "All activities are complete." : activeBlock.title}
          </Text>
          <Text className="font-SatoshiMedium mt-2 text-sm leading-5" numberOfLines={2} style={{ color: theme.mutedText }}>
            {allDone ? "There are no activities left for today." : activeBlock.goal}
          </Text>
          {!allDone && <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-SatoshiBold text-xs" style={{ color: theme.mutedText }}>
              {formatDuration(blockDurationSeconds(activeBlock))}
            </Text>
            <View className="flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: activeMeta.bg }}>
              <ActiveIcon size={14} color={activeMeta.text} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: activeMeta.text }}>
                {activeCategory.label}
              </Text>
            </View>
          </View>}
          {!!blockItems(activeBlock).length && (
            <Text className="font-SatoshiBold mt-3 text-[11px]" style={{ color: activeMeta.text }}>
              {blockItems(activeBlock).length} video{blockItems(activeBlock).length === 1 ? "" : "s"} in this block
            </Text>
          )}
          <View className="mt-4 flex-row items-center justify-between rounded-2xl border p-3" style={{ backgroundColor: theme.input, borderColor: activeBlock.status === "done" ? "#22C55E66" : activeBlock.status === "not-done" ? "#F59E0B66" : theme.border }}>
            <View className="flex-1 pr-3">
              <Text className="font-SatoshiBlack text-xs" style={{ color: statusColor(activeBlock.status, theme.mutedText) }}>
                {statusCopy(activeBlock.status)}
              </Text>
              <Text className="font-SatoshiMedium mt-1 text-[11px]" numberOfLines={2} style={{ color: theme.mutedText }}>
                {activeBlock.goal || "No goal added."}
              </Text>
            </View>
            {!allDone && blockCanBeMarked(activeBlock) ? (
              <View className="flex-row gap-2">
                <TouchableOpacity accessibilityLabel="Complete active block" className="h-11 w-11 items-center justify-center rounded-full border" style={{ backgroundColor: "#22C55E22", borderColor: "#22C55E66" }} onPress={() => markBlock(activeBlock.id, "done")}>
                  <X size={18} color="#22C55E" />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Skip active block" className="h-11 w-11 items-center justify-center rounded-full border" style={{ backgroundColor: "#F59E0B22", borderColor: "#F59E0B66" }} onPress={() => markBlock(activeBlock.id, "not-done")}>
                  <Check size={18} color="#F59E0B" />
                </TouchableOpacity>
              </View>
            ) : !allDone ? (
              <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.mutedText }}>
                Starts later
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <View className="mt-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Clock size={15} color={theme.primary} />
            <Text className="font-SatoshiBlack text-xs uppercase" style={{ color: theme.mutedText }}>
              Timeline
            </Text>
          </View>
          <Text className="font-SatoshiBlack text-xs" style={{ color: theme.primary }}>
            {doneCount}/{blocks.length} done ({progress}%)
          </Text>
        </View>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
          <View className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: theme.primary }} />
        </View>

        <View className="mt-4">
          {blocks.map((block, index) => {
            const category = categoryById(categories, block.categoryId);
            const meta = categoryMeta(category.label, dark, category.color);
            const Icon = meta.icon;
            const active = block.id === activeBlock.id;
            const complete = block.status === "done";
            return (
              <TouchableOpacity key={block.id} className="flex-row gap-3" activeOpacity={0.78} onPress={() => setSelectedBlock(block)}>
                <View className="items-center">
                  <View className="h-7 w-7 items-center justify-center rounded-full border-2" style={{ borderColor: complete ? "#22C55E" : active ? theme.primary : theme.border, backgroundColor: complete ? "#22C55E" : active ? theme.primary : theme.surface }}>
                    <Text className="font-SatoshiBlack text-[10px]" style={{ color: complete || active ? "#0B0D10" : theme.mutedText }}>
                      {index + 1}
                    </Text>
                  </View>
                  {index < blocks.length - 1 && <View className="w-px flex-1" style={{ backgroundColor: complete ? "#22C55E66" : theme.border }} />}
                </View>
                <View className="mb-3 flex-1 rounded-2xl border p-3" style={{ backgroundColor: active ? theme.surface : dark ? "#101216" : "#ffffff", borderColor: active ? meta.accent : theme.border }}>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.accent }}>
                      {formatRange(block)}
                    </Text>
                    <View className="flex-row items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: meta.bg }}>
                      <Icon size={11} color={meta.text} />
                      <Text className="font-SatoshiBlack text-[9px]" style={{ color: meta.text }}>
                        {category.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-SatoshiBlack mt-2 text-sm leading-5" style={{ color: complete ? theme.mutedText : theme.text }}>
                    {block.title}
                  </Text>
                  <Text className="font-SatoshiMedium mt-1 text-xs leading-4" numberOfLines={2} style={{ color: theme.mutedText }}>
                    {block.goal}
                  </Text>
                  {!!block.notes?.trim() && (
                    <Text className="font-SatoshiMedium mt-1 text-[11px] leading-4" numberOfLines={1} style={{ color: theme.mutedText }}>
                      Note: {block.notes}
                    </Text>
                  )}
                  {!!blockItems(block).length && (
                    <Text className="font-SatoshiBold mt-1 text-[11px]" numberOfLines={1} style={{ color: meta.text }}>
                      {blockItems(block).length} video{blockItems(block).length === 1 ? "" : "s"} in this block
                    </Text>
                  )}
                  <View className="mt-3 flex-row items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ backgroundColor: theme.input, borderColor: block.status === "done" ? "#22C55E55" : block.status === "not-done" ? "#F59E0B55" : theme.border }}>
                    <View className="flex-1">
                      <Text className="font-SatoshiBlack text-[11px]" style={{ color: statusColor(block.status, theme.mutedText) }}>
                        {statusCopy(block.status)}
                      </Text>
                      <Text className="font-SatoshiMedium mt-1 text-[10px]" style={{ color: theme.mutedText }}>
                        {formatDuration(blockDurationSeconds(block))} planned
                      </Text>
                    </View>
                    <Text className="font-SatoshiBlack text-[10px]" style={{ color: meta.text }}>
                      Details
                    </Text>
                  </View>
                  {blockCanBeMarked(block) && (
                    <View className="mt-3 flex-row justify-end gap-2">
                      <TouchableOpacity accessibilityLabel={`Complete ${block.title}`} className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: "#22C55E22", borderColor: "#22C55E66" }} onPress={() => markBlock(block.id, "done")}>
                        <X size={17} color="#22C55E" />
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityLabel={`Skip ${block.title}`} className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: "#F59E0B22", borderColor: "#F59E0B66" }} onPress={() => markBlock(block.id, "not-done")}>
                        <Check size={17} color="#F59E0B" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {allDone && (
          <View className="mt-5 items-center rounded-3xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <AppIllustration name="info-learning" size={128} />
            <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
              Nice one, today is complete.
            </Text>
            <Text className="font-SatoshiMedium mt-2 text-center text-xs leading-5" style={{ color: theme.mutedText }}>
              You finished all locked blocks for the day.
            </Text>
            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: theme.accent }} onPress={() => router.push("/planner")}>
                <Text className="font-SatoshiBlack text-center text-xs" style={{ color: "#0B0D10" }}>
                  Plan tomorrow
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-3 py-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={generateReport} disabled={reporting}>
                {reporting ? <ActivityIndicator size="small" color={theme.primary} /> : <FileText size={15} color={theme.primary} />}
                <Text className="font-SatoshiBlack text-center text-xs" style={{ color: theme.text }}>
                  PDF report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      <Modal visible={!!selectedBlock} transparent animationType="slide" onRequestClose={() => setSelectedBlock(null)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
          {selectedBlock && (
            <View className="max-h-[86%] rounded-t-[28px] border px-4 pt-4" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
                    Block Details
                  </Text>
                  <Text className="font-SpaceGroteskBold mt-1 text-2xl leading-7" style={{ color: theme.text }}>
                    {selectedBlock.title}
                  </Text>
                  <Text className="font-SatoshiBold mt-1 text-xs" style={{ color: theme.mutedText }}>
                    {formatRange(selectedBlock)} - {categoryById(categories, selectedBlock.categoryId).label}
                  </Text>
                </View>
                <TouchableOpacity accessibilityLabel="Close block details" className="h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: theme.border, backgroundColor: theme.surface }} onPress={() => setSelectedBlock(null)}>
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView className="mt-4" contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
                <View className="rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
                      Status
                    </Text>
                    <Text className="font-SatoshiBlack text-xs" style={{ color: selectedBlock.status === "done" ? "#22C55E" : selectedBlock.status === "not-done" ? "#F59E0B" : theme.mutedText }}>
                      {statusCopy(selectedBlock.status)}
                    </Text>
                  </View>
                  <Text className="font-SatoshiMedium mt-2 text-xs" style={{ color: theme.mutedText }}>
                    Duration: {formatDuration(blockDurationSeconds(selectedBlock))}
                  </Text>
                </View>
                <DetailCard icon={Target} title="Goal" text={selectedBlock.goal} theme={theme} />

                {!!selectedBlock.notes?.trim() && <DetailCard icon={StickyNote} title="Notes" text={selectedBlock.notes} theme={theme} />}

                <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Link2 size={14} color={theme.primary} />
                      <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                        Videos in this block
                      </Text>
                    </View>
                    <Text className="font-SatoshiBold text-[10px]" style={{ color: theme.mutedText }}>
                      read only
                    </Text>
                  </View>
                  <View className="mt-3 gap-2">
                    {blockItems(selectedBlock).map((item, index) => (
                      <View key={item.id} className="flex-row items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: theme.input, borderColor: selectedBlock.status === "done" ? "#22C55E66" : theme.border }}>
                        <View className="h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: selectedBlock.status === "done" ? "#22C55E" : theme.border, backgroundColor: selectedBlock.status === "done" ? "#22C55E" : theme.surfaceAlt }}>
                          {selectedBlock.status === "done" ? (
                            <Check size={15} color="#0B0D10" />
                          ) : (
                            <Text className="font-SatoshiBlack text-[10px]" style={{ color: theme.mutedText }}>
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="font-SatoshiBlack text-sm" numberOfLines={2} style={{ color: selectedBlock.status === "done" ? theme.mutedText : theme.text }}>
                            {item.title}
                          </Text>
                          <Text className="font-SatoshiMedium mt-1 text-[10px]" style={{ color: theme.mutedText }}>
                            {formatDuration(item.durationSeconds)}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {!blockItems(selectedBlock).length && (
                      <Text className="font-SatoshiMedium text-xs leading-5" style={{ color: theme.mutedText }}>
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
    </PageShell>
  );
}

function DetailCard({ icon: Icon, title, text, theme }: { icon: typeof Target; title: string; text: string; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <View className="flex-row items-center gap-2">
        <Icon size={14} color={theme.primary} />
        <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
          {title}
        </Text>
      </View>
      <Text className="font-SatoshiBlack mt-2 text-sm leading-5" style={{ color: theme.text }}>
        {text}
      </Text>
    </View>
  );
}

function statusCopy(status: DailyPlanBlock["status"]) {
  if (status === "done") return "Marked as done";
  if (status === "not-done") return "Skipped";
  return "Ready to mark";
}

function statusColor(status: DailyPlanBlock["status"], fallback: string) {
  if (status === "done") return "#22C55E";
  if (status === "not-done") return "#F59E0B";
  return fallback;
}
