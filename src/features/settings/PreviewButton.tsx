import { appTheme } from "@/src/lib/theme";
import { Bell } from "lucide-react-native";
import { Text, TouchableOpacity } from "react-native";


export function PreviewButton({ label, onPress, theme, disabled }: { label: string; onPress: () => void; theme: ReturnType<typeof appTheme>; disabled: boolean }) {
  return (
    <TouchableOpacity className="flex-grow flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} onPress={onPress} disabled={disabled}>
      <Bell size={15} color={disabled ? theme.mutedText : theme.primary} />
      <Text className="font-SatoshiBlack text-xs" style={{ color: disabled ? theme.mutedText : theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
