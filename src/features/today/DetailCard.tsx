import { appTheme } from "@/src/lib/theme";
import { Target } from "lucide-react-native";
import { Text, View } from "react-native";
export function DetailCard({ icon: Icon, title, text, theme }: { icon: typeof Target; title: string; text: string; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="mt-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <View className="flex-row items-center gap-2">
        <Icon size={14} color={theme.primary} />
        <Text className="font-SatoshiBlack text-[10px] uppercase" style={{ color: theme.primary }}>
          {title}
        </Text>
      </View>
      <Text className="font-SatoshiBlack mt-2 text-sm leading-5" style={{ color: theme.text }}>
        {text}
      </Text>
    </View>
  );
}
