import { Switch, Text, View } from "react-native";
import type { appTheme } from "@/src/lib/theme";

export function SettingRow({
  title,
  description,
  value,
  theme,
  onValueChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  theme: ReturnType<typeof appTheme>;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-1 pr-4">
        <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
          {title}
        </Text>
        {!!description && (
          <Text className="font-SatoshiMedium mt-1 text-[11px] leading-4" style={{ color: theme.mutedText }}>
            {description}
          </Text>
        )}
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor="#ffffff" trackColor={{ false: "#475569", true: theme.primary }} />
    </View>
  );
}
