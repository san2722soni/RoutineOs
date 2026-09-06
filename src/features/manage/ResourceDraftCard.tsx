import type { ResourceDraft } from "./useManageScreen";
import { IconCircleButton } from "@/src/components/IconCircleButton";
import { categoryById } from "@/src/lib/categories";
import { appTheme } from "@/src/lib/theme";
import type { Category, ResourceType } from "@/src/types";
import { ChevronDown, ListVideo, Video, X } from "lucide-react-native";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
const resourceTypes: { id: ResourceType; label: string; icon: typeof ListVideo }[] = [
  { id: "youtube-playlist", label: "Playlist", icon: ListVideo },
  { id: "youtube-video", label: "Video", icon: Video },
];
export function ResourceDraftCard({
  draft,
  categories,
  categoryOpen,
  theme,
  onClose,
  onToggleCategory,
  onChange,
  onSave,
}: {
  draft: ResourceDraft | null;
  categories: Category[];
  categoryOpen: boolean;
  theme: ReturnType<typeof appTheme>;
  onClose: () => void;
  onToggleCategory: () => void;
  onChange: (patch: Partial<ResourceDraft>) => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  const selected = categoryById(categories, draft.categoryId);

  return (
    <View className="rounded-3xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.primary }}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
            {draft.id ? "Edit video list" : "New video list"}
          </Text>
          <Text className="font-SatoshiMedium mt-1 text-xs leading-5" style={{ color: theme.mutedText }}>
            Pick where these videos belong.
          </Text>
        </View>
        <IconCircleButton
          icon={<X size={17} color={theme.text} />}
          onPress={onClose}
          theme={theme}
          backgroundColor={theme.input}
        />
      </View>

      <View className="mt-5 flex-row gap-2">
        {resourceTypes.map((type) => {
          const active = draft.type === type.id;
          const Icon = type.icon;
          return (
            <TouchableOpacity key={type.id} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3" style={{ backgroundColor: active ? theme.accent : theme.input, borderColor: active ? theme.accent : theme.border }} onPress={() => onChange({ type: type.id })}>
              <Icon size={15} color={active ? "#0B0D10" : theme.mutedText} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: active ? "#0B0D10" : theme.mutedText }}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="mt-4 rounded-2xl border px-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
        <TextInput className="font-SatoshiMedium py-4 text-sm" style={{ color: theme.text }} placeholderTextColor={theme.mutedText} value={draft.title} onChangeText={(title) => onChange({ title })} placeholder="Video list name" />
      </View>

      <TouchableOpacity className="mt-3 flex-row items-center justify-between rounded-2xl border px-4 py-4" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={onToggleCategory}>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
          <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
            {selected.label}
          </Text>
        </View>
        <ChevronDown size={16} color={theme.mutedText} />
      </TouchableOpacity>
      {categoryOpen && (
        <ScrollView className="mt-2 rounded-2xl border p-2" style={{ backgroundColor: theme.input, borderColor: theme.border, maxHeight: 244 }} nestedScrollEnabled>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              className="flex-row items-center gap-2 rounded-xl px-3 py-3"
              style={{ backgroundColor: draft.categoryId === category.id ? `${category.color}22` : "transparent" }}
              onPress={() => {
                onChange({ categoryId: category.id });
                onToggleCategory();
              }}
            >
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
              <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onSave}>
        <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
          Save
        </Text>
      </TouchableOpacity>
    </View>
  );
}
