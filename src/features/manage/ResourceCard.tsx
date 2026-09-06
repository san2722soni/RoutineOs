import { IconCircleButton } from "@/src/components/IconCircleButton";
import { ModalShell } from "@/src/components/ModalShell";
import { SmallIconAction } from "@/src/components/SmallIconAction";
import { appTheme } from "@/src/lib/theme";
import { formatDuration } from "@/src/lib/youtube";
import type { Resource } from "@/src/types";
import { Copy, Eraser, Info, Link, Pencil, RefreshCw, Save, Trash2, Video } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
export function ResourceCard({
  resource,
  theme,
  categoryLabel,
  open,
  page,
  loading,
  urlValue,
  chunkValue,
  onToggle,
  onEdit,
  onUrlChange,
  onChunkChange,
  onSave,
  onCopy,
  onFetch,
  onDelete,
  onClear,
  onPage,
}: {
  resource: Resource;
  theme: ReturnType<typeof appTheme>;
  categoryLabel: string;
  open: boolean;
  page: number;
  loading: boolean;
  urlValue: string;
  chunkValue: string;
  onToggle: () => void;
  onEdit: () => void;
  onUrlChange: (value: string) => void;
  onChunkChange: (value: string) => void;
  onSave: () => void;
  onCopy: () => void;
  onFetch: () => void;
  onDelete: () => void;
  onClear: () => void;
  onPage: (page: number) => void;
}) {
  const [chunkInfoOpen, setChunkInfoOpen] = useState(false);
  const pageCount = Math.max(1, Math.ceil(resource.items.length / 5));
  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = resource.items.slice(safePage * 5, safePage * 5 + 5);
  const typeLabel = resource.type === "youtube-video" ? "Video chunks" : "Playlist";

  return (
    <View className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-SpaceGroteskBold text-lg" style={{ color: theme.text }}>
            {resource.title}
          </Text>
          <Text className="font-SatoshiBold mt-1 text-xs" style={{ color: theme.mutedText }}>
            {categoryLabel} - {resource.items.length} items - {typeLabel}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconCircleButton
            icon={<Copy size={14} color={theme.mutedText} />}
            onPress={onCopy}
            theme={theme}
          />
          <IconCircleButton
            icon={<Link size={14} color={theme.text} />}
            onPress={onToggle}
            theme={theme}
          />
          <IconCircleButton
            icon={<Pencil size={14} color={theme.text} />}
            onPress={onEdit}
            theme={theme}
          />
          <IconCircleButton
            icon={<Trash2 size={14} color="#EF4444" />}
            onPress={onDelete}
            theme={theme}
            backgroundColor="#EF44441A"
            borderColor="#EF444455"
          />
        </View>
      </View>

      {open && (
        <View className="mt-4">
          <View className="flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
            <Link size={15} color={theme.mutedText} />
            <TextInput className="font-SatoshiMedium flex-1 py-3 text-xs" style={{ color: theme.text }} placeholderTextColor={theme.mutedText} value={urlValue} onChangeText={onUrlChange} placeholder="Paste YouTube link" autoCapitalize="none" autoCorrect={false} />
          </View>

          {resource.type === "youtube-video" && (
            <View className="mt-3 flex-row items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <Video size={15} color={theme.mutedText} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                Chunk minutes
              </Text>
              <TextInput className="font-SatoshiBlack flex-1 py-3 text-xs" style={{ color: theme.text }} keyboardType="number-pad" value={chunkValue} onChangeText={onChunkChange} />
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceAlt }} onPress={() => setChunkInfoOpen(true)}>
                <Info size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-3 flex-row gap-2">
            <SmallIconAction label="Save" icon={<Save size={13} color={theme.text} />} onPress={onSave} theme={theme} />
            <SmallIconAction label="Copy" icon={<Copy size={13} color={theme.text} />} onPress={onCopy} theme={theme} />
            <SmallIconAction
              label="Load Videos"
              icon={loading ? <ActivityIndicator size="small" color={theme.primary} /> : <RefreshCw size={13} color={theme.primary} />}
              onPress={onFetch}
              theme={theme}
              tintColor={theme.primary}
            />
            <SmallIconAction
              label="Remove Videos"
              icon={<Eraser size={13} color="#F59E0B" />}
              onPress={onClear}
              theme={theme}
              backgroundColor="#F59E0B1A"
              borderColor="#F59E0B55"
              tintColor="#F59E0B"
            />
          </View>

          <View className="mt-3 gap-2">
            {visibleItems.map((item, index) => (
              <View key={item.id} className="flex-row gap-3 rounded-2xl p-3" style={{ backgroundColor: theme.input }}>
                <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                  <Text className="font-SatoshiBlack text-[10px]" style={{ color: theme.mutedText }}>
                    {safePage * 5 + index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-SatoshiBlack text-sm" numberOfLines={2} style={{ color: item.completed ? theme.mutedText : theme.text }}>
                    {item.title}
                  </Text>
                  <Text className="font-SatoshiBold mt-1 text-[11px]" style={{ color: theme.mutedText }}>
                    {formatDuration(item.durationSeconds)} {item.completed ? "- completed" : ""}
                  </Text>
                </View>
              </View>
            ))}
            {!visibleItems.length && (
              <Text className="font-SatoshiMedium rounded-2xl p-3 text-xs leading-5" style={{ backgroundColor: theme.input, color: theme.mutedText }}>
                Save a link, then fetch to load items here.
              </Text>
            )}
          </View>

          {resource.items.length > 5 && (
            <View className="mt-3 flex-row items-center justify-between">
              <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }} disabled={safePage === 0} onPress={() => onPage(Math.max(0, safePage - 1))}>
                <Text className="font-SatoshiBlack text-xs" style={{ color: safePage === 0 ? theme.mutedText : theme.text }}>
                  Prev
                </Text>
              </TouchableOpacity>
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.mutedText }}>
                {safePage + 1}/{pageCount}
              </Text>
              <TouchableOpacity className="rounded-xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }} disabled={safePage >= pageCount - 1} onPress={() => onPage(Math.min(pageCount - 1, safePage + 1))}>
                <Text className="font-SatoshiBlack text-xs" style={{ color: safePage >= pageCount - 1 ? theme.mutedText : theme.text }}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ModalShell
            visible={chunkInfoOpen}
            title="Chunk minutes"
            subtitle="A long video becomes smaller checklist items. Example: a 6 hour video with 30 minutes creates 12 chunks for planning."
            theme={theme}
            onClose={() => setChunkInfoOpen(false)}
          >
            <View className="pt-4" />
          </ModalShell>
        </View>
      )}
    </View>
  );
}
