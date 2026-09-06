import { TimePickerField } from "@/src/components/TimePickerField";
import { categoryById } from "@/src/lib/categories";
import { formatRange } from "@/src/lib/date";
import { formatDuration } from "@/src/lib/youtube";
import type { ResourceItem } from "@/src/types";
import { Check, CheckCircle2, ChevronDown, Clock, Info, Link2, Pencil, StickyNote, Trash2 } from "lucide-react-native";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { resourcesForBlock } from "./resources";
import { usePlannerScreen } from "./usePlannerScreen";
type Props = Pick<ReturnType<typeof usePlannerScreen>, "categories" | "resources" | "dark" | "theme" | "plan" | "finalizedBlocks" | "setFinalizedBlocks" | "openBlockIds" | "setOpenBlockIds" | "resourcePageByBlock" | "setResourcePageByBlock" | "setDeleteConfirmBlock" | "setInfoBlock" | "canEdit" | "itemById" | "locked" | "updateBlock" | "toggleResource">;
export function PlanBlocks({ categories, resources, dark, theme, plan, finalizedBlocks, setFinalizedBlocks, openBlockIds, setOpenBlockIds, resourcePageByBlock, setResourcePageByBlock, setDeleteConfirmBlock, setInfoBlock, canEdit, itemById, locked, updateBlock, toggleResource }: Props) {
  return <>
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
                    <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: !canEdit }} disabled={!canEdit} onPress={() => toggleResource(block, item.id)} key={item.id} className="flex-row items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: selected ? "#38BDF81A" : theme.surface, borderColor: selected ? theme.primary : theme.border }}>
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
                    </TouchableOpacity>
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
            <TextInput className="font-SatoshiMedium mt-1 min-h-20 rounded-xl border px-3 py-3 text-sm" style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text }} placeholderTextColor={theme.mutedText} value={block.goal} editable={canEdit} onChangeText={(goal) => updateBlock(block, { goal })} placeholder="e.g. Complete graph BFS videos + notes" multiline />

            <Text className="font-SatoshiMedium mt-3 text-[10px]" style={{ color: theme.mutedText }}>
              Notes
            </Text>
            <View className="mt-1 flex-row gap-2 rounded-xl border px-3 py-2" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <StickyNote size={15} color={theme.mutedText} />
              <TextInput className="font-SatoshiMedium flex-1 text-sm" style={{ color: theme.text, minHeight: 56 }} placeholderTextColor={theme.mutedText} value={block.notes ?? ""} editable={canEdit} onChangeText={(notes) => updateBlock(block, { notes })} placeholder="Optional: links, page numbers, constraints..." multiline />
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

  </>;
}
