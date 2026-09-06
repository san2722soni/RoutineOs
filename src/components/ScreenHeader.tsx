import { appTheme } from "@/src/lib/theme";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function ScreenHeader({ eyebrow, title, actions, theme }: { eyebrow: string; title: string; actions?: ReactNode; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="flex-row items-center justify-between pt-2">
      <View>
        <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
          {eyebrow}
        </Text>
        <Text className="font-SpaceGroteskBold mt-1 text-3xl" style={{ color: theme.text }}>
          {title}
        </Text>
      </View>
      {actions ? <View className="flex-row items-center gap-2">{actions}</View> : null}
    </View>
  );
}