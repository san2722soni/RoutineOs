import type { appTheme } from "@/src/lib/theme";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

export function ActionButton({
  label,
  onPress,
  theme,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof appTheme>;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = {
    primary: { bg: theme.accent, text: "#0B0D10" },
    secondary: { bg: theme.surfaceAlt, text: theme.text },
    danger: { bg: "#EF44441A", text: "#EF4444" },
  }[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className="flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3"
      style={{ backgroundColor: colors.bg, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, opacity: disabled || loading ? 0.6 : 1 }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : icon}
      <Text className="font-SatoshiBlack text-sm" style={{ color: colors.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
