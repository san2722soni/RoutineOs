import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, formatRange } from "@/src/lib/date";
import { formatDuration } from "@/src/lib/youtube";
import { Check, Link2, StickyNote, Target, X } from "lucide-react-native";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { DetailCard } from "./DetailCard";
import { statusCopy } from "./status";
import { useTodayScreen } from "./useTodayScreen";
type Props = Pick<ReturnType<typeof useTodayScreen>, "categories" | "theme" | "selectedBlock" | "setSelectedBlock" | "blockItems">;
export function TodayBlockDetails({ categories, theme, selectedBlock, setSelectedBlock, blockItems }: Props) {
  return <>
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
  </>;
}
