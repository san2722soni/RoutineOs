import { appTheme } from "@/src/lib/theme";
import { Text, TouchableOpacity, View } from "react-native";

export function AreaOption({ label, active, color, theme, onPress }: { label: string; active: boolean; color: string; theme: ReturnType<typeof appTheme>; onPress: () => void }) {
  return (
    <TouchableOpacity className="flex-row items-center gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: active ? `${color}22` : "transparent" }} onPress={onPress}>
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-SatoshiBlack text-xs" style={{ color: theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}