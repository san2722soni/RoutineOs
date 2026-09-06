import { useToast } from "@/src/components/ToastProvider";
import { shareDailyReport } from "@/src/lib/dailyReport";
import { dateFromOffset, nowMinutes, timeToMinutes } from "@/src/lib/date";
import { logActionError } from "@/src/lib/logger";
import { schedulePlansNotifications, sendAutoNotDoneNotification } from "@/src/lib/notifications";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import type { DailyPlanBlock, PlanResourceItemSnapshot, ResourceItem } from "@/src/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
export function useTodayScreen() {
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
  return { router, settings, categories, dark, theme, today, plan, blocks, selectedBlock, setSelectedBlock, reporting, activeBlock, doneCount, progress, allDone, lockToday, markBlock, blockItems, blockCanBeMarked, generateReport };
}
