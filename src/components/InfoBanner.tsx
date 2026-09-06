import { Text, View } from "react-native";
import type { appTheme } from "@/src/lib/theme";

export function InfoBanner({
  title,
  body,
  theme,
  accent = "warning",
}: {
  title: string;
  body: string;
  theme: ReturnType<typeof appTheme>;
  accent?: "warning" | "primary" | "danger";
}) {
  const palette = {
    warning: { bg: "#F59E0B22", border: "#F59E0B55", text: theme.text, muted: theme.mutedText },
    primary: { bg: "#38BDF822", border: "#38BDF855", text: theme.text, muted: theme.mutedText },
    danger: { bg: "#EF44441A", border: "#EF444455", text: theme.text, muted: theme.mutedText },
  }[accent];

  return (
    <View className="mt-4 rounded-2xl border px-4 py-3" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
      <Text className="font-SatoshiBlack text-xs" style={{ color: palette.text }}>
        {title}
      </Text>
      <Text className="font-SatoshiMedium mt-1 text-[11px]" style={{ color: palette.muted }}>
        {body}
      </Text>
    </View>
  );
}
