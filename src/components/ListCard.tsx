import type { ReactNode } from "react";
import { View } from "react-native";
import type { appTheme } from "@/src/lib/theme";

export function ListCard({
  children,
  theme,
  borderColor,
  backgroundColor,
  padding = 4,
}: {
  children: ReactNode;
  theme: ReturnType<typeof appTheme>;
  borderColor?: string;
  backgroundColor?: string;
  padding?: number;
}) {
  return (
    <View
      className="rounded-3xl border"
      style={{
        backgroundColor: backgroundColor ?? theme.surface,
        borderColor: borderColor ?? theme.border,
        padding,
      }}
    >
      {children}
    </View>
  );
}
