import type { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import type { appTheme } from "@/src/lib/theme";

export function IconCircleButton({
  icon,
  onPress,
  theme,
  size = 10,
  backgroundColor,
  borderColor,
  tintColor,
  danger = false,
  disabled = false,
}: {
  icon: ReactNode;
  onPress: () => void;
  theme: ReturnType<typeof appTheme>;
  size?: number;
  backgroundColor?: string;
  borderColor?: string;
  tintColor?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      className="items-center justify-center rounded-full border"
      style={{
        width: size * 2.1,
        height: size * 2.1,
        backgroundColor: backgroundColor ?? theme.surfaceAlt,
        borderColor: borderColor ?? theme.border,
        opacity: disabled ? 0.6 : 1,
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {icon}
    </TouchableOpacity>
  );
}
