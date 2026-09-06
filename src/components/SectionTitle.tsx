import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { appTheme } from "@/src/lib/theme";

export function SectionTitle({
  icon: Icon,
  title,
  theme,
}: {
  icon: LucideIcon;
  title: string;
  theme: ReturnType<typeof appTheme>;
}) {
  return (
    <View className="mt-6 flex-row items-center gap-2 px-1">
      <Icon size={14} color={theme.primary} />
      <Text className="font-SatoshiBlack text-xs uppercase tracking-wider" style={{ color: theme.mutedText }}>
        {title}
      </Text>
    </View>
  );
}
