import { appTheme } from "@/src/lib/theme";
import { Text, TouchableOpacity, View } from "react-native";


export function ReminderCard({ title, value, onMinus, onPlus, theme }: { title: string; value: number; onMinus: () => void; onPlus: () => void; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="flex-1 rounded-3xl border p-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
      <Text className="font-SatoshiBlack text-center text-xs" style={{ color: theme.mutedText }}>
        {title}
      </Text>
      <Text className="font-SpaceGroteskBold mt-2 text-center text-3xl" style={{ color: theme.primary }}>
        {value}
      </Text>
      <Text className="font-SatoshiBold text-center text-[11px]" style={{ color: theme.mutedText }}>
        minutes
      </Text>
      <View className="mt-3 flex-row justify-center gap-2">
        <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onMinus}>
          <Text className="font-SatoshiBlack text-lg" style={{ color: theme.text }}>
            -
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onPlus}>
          <Text className="font-SatoshiBlack text-lg" style={{ color: theme.text }}>
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
