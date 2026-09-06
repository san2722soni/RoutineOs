import { useToast } from "@/src/components/ToastProvider";
import { blockDurationSeconds, dateFromOffset, dateHasStarted, timeToMinutes } from "@/src/lib/date";
import { logActionError } from "@/src/lib/logger";
import { schedulePlansNotifications } from "@/src/lib/notifications";
import { templateForDate } from "@/src/lib/templates";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import type { DailyPlanBlock } from "@/src/types";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
const maxPlannedSeconds = 18 * 60 * 60;
let planIntroShownThisLaunch = false;
export function usePlannerScreen() {
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
  return { router, categories, templates, resources, dark, theme, toast, tomorrow, plan, selectedTemplate, finalizedBlocks, setFinalizedBlocks, openBlockIds, setOpenBlockIds, resourcePageByBlock, setResourcePageByBlock, templateMenuOpen, setTemplateMenuOpen, pendingTemplateId, setPendingTemplateId, introOpen, setIntroOpen, lockStep, setLockStep, clearConfirmOpen, setClearConfirmOpen, deleteConfirmBlock, setDeleteConfirmBlock, infoBlock, setInfoBlock, canEdit, itemById, totalSeconds, locked, openConfirm, confirmLockStep, changeTemplate, applyTemplate, clearTomorrow, removeBlock, updateBlock, toggleResource };
}
