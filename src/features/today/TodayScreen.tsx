import { AppIllustration } from "@/src/components/AppIllustration";
import { PageShell } from "@/src/components/PageShell";
import { ScreenHelpButton } from "@/src/components/ScreenHelpButton";
import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, displayDate, formatRange } from "@/src/lib/date";
import { formatDuration } from "@/src/lib/youtube";
import { Calendar, Check, Clock, FileText, Sparkles, X } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { categoryMeta } from "./categoryMeta";
import { statusColor, statusCopy } from "./status";
import { TodayBlockDetails } from "./TodayBlockDetails";
import { useTodayScreen } from "./useTodayScreen";
export default function TodayScreen() {
  const model = useTodayScreen();
  const { router, settings, categories, dark, theme, today, blocks, setSelectedBlock, reporting, activeBlock, doneCount, progress, allDone, lockToday, markBlock, blockItems, blockCanBeMarked, generateReport } = model;
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
      <TodayBlockDetails {...model} />
    </PageShell>
  );
}
