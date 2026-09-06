import type { appTheme } from "@/src/lib/theme";
import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export function SmallIconAction({
  label,
  icon,
  onPress,
  theme,
  backgroundColor,
  tintColor,
  borderColor,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  theme: ReturnType<typeof appTheme>;
  backgroundColor?: string;
  tintColor?: string;
  borderColor?: string;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      className="min-h-12 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 py-3"
      style={{
        minHeight: 64, paddingHorizontal: 10, paddingVertical: 12, flexBasis: 0, flexGrow: 1, opacity: disabled ? 0.5 : 1,
        backgroundColor: backgroundColor ?? theme.surfaceAlt,
        borderColor: borderColor ?? theme.border,
      }}
      onPress={onPress}
    >
      <View className="items-center justify-center">{icon}</View>
      <Text className="font-SatoshiBlack text-center text-[10px] leading-4" style={{ color: tintColor ?? theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
