import { categoryById } from "@/src/lib/categories";
import { blockDurationSeconds, formatRange } from "@/src/lib/date";
import { appTheme } from "@/src/lib/theme";
import { formatDuration } from "@/src/lib/youtube";
import type { DailyPlanBlock, ResourceItem } from "@/src/types";
import { X } from "lucide-react-native";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { InfoRow } from "./InfoRow";
export function BlockInfoModal({ block, category, items, theme, onClose }: { block: DailyPlanBlock | null; category?: ReturnType<typeof categoryById>; items: ResourceItem[]; theme: ReturnType<typeof appTheme>; onClose: () => void }) {
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
