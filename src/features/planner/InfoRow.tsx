import { appTheme } from "@/src/lib/theme";
import { Text, View } from "react-native";
export function InfoRow({ title, value, theme }: { title: string; value: string; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
        {title}
      </Text>
      <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.text }}>
        {value}
      </Text>
    </View>
  );
}
