import type { appTheme } from "@/src/lib/theme";
import type { LucideIcon } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type SegmentedTab<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

export function SegmentedTabs<T extends string>({
  items,
  activeId,
  onChange,
  theme,
}: {
  items: SegmentedTab<T>[];
  activeId: T;
  onChange: (id: T) => void;
  theme: ReturnType<typeof appTheme>;
}) {
  return (
    <View className="mt-5 flex-row rounded-3xl border p-1.5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      {items.map((item) => {
        const active = item.id === activeId;
        const Icon = item.icon;

        return (
          <TouchableOpacity
            key={item.id}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3"
            style={{ backgroundColor: active ? theme.accent : "transparent" }}
            onPress={() => onChange(item.id)}
          >
            <Icon size={15} color={active ? "#0B0D10" : theme.mutedText} />
            <Text className="font-SatoshiBlack text-[11px]" style={{ color: active ? "#0B0D10" : theme.mutedText }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
