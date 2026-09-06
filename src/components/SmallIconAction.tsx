import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { appTheme } from "@/src/lib/theme";

export function SmallIconAction({
  label,
  icon,
  onPress,
  theme,
  backgroundColor,
  tintColor,
  borderColor,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  theme: ReturnType<typeof appTheme>;
  backgroundColor?: string;
  tintColor?: string;
  borderColor?: string;
}) {
  return (
    <TouchableOpacity
      className="min-h-12 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 py-3"
      style={{
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
