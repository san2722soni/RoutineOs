import { AppIllustration } from "@/src/components/AppIllustration";
import { ConfirmModal } from "@/src/components/ConfirmModal";
import { PageShell } from "@/src/components/PageShell";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { categoryById } from "@/src/lib/categories";
import { fullDisplayDate } from "@/src/lib/date";
import { formatDuration } from "@/src/lib/youtube";
import type { ResourceItem } from "@/src/types";
import { Calendar, CheckCircle2, ChevronDown, Info, Layers, Trash2 } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BlockInfoModal } from "./BlockInfoModal";
import { PlanBlocks } from "./PlanBlocks";
import { PlanIntroDrawer } from "./PlanIntroDrawer";
import { usePlannerScreen } from "./usePlannerScreen";
const maxPlannedSeconds = 18 * 60 * 60;
export default function PlannerScreen() {
  const model = usePlannerScreen();
  const { router, categories, templates, theme, toast, tomorrow, plan, selectedTemplate, templateMenuOpen, setTemplateMenuOpen, pendingTemplateId, setPendingTemplateId, introOpen, setIntroOpen, lockStep, setLockStep, clearConfirmOpen, setClearConfirmOpen, deleteConfirmBlock, setDeleteConfirmBlock, infoBlock, setInfoBlock, canEdit, itemById, totalSeconds, locked, openConfirm, confirmLockStep, changeTemplate, applyTemplate, clearTomorrow, removeBlock } = model;
  return (
    <PageShell theme={theme} bottomPadding={170} keepKeyboardOpen>
      <ScreenHeader eyebrow="Plan Tomorrow" title="Plan" theme={theme} actions={
        <>
          <ScreenHelpButton
            title="Plan"
            intro="Plan turns a reusable routine into tomorrow's exact list."
            steps={[
              { title: "Choose routine", body: "The app auto-picks by weekday, but you can change it before finalizing." },
              { title: "Finish activities", body: "Check the fixed time, title and area. Choose videos, write a goal and notes, then finish each activity." },
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

      <PlanBlocks {...model} />
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
