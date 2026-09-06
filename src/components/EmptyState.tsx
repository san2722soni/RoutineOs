import { Text, View } from "react-native";
import { AppIllustration, type IllustrationName } from "@/src/components/AppIllustration";
import { appTheme } from "@/src/lib/theme";

export function EmptyState({ title, body, illustration, theme }: { title: string; body: string; illustration: IllustrationName; theme: ReturnType<typeof appTheme> }) {
  return (
    <View className="items-center rounded-3xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      <AppIllustration name={illustration} size={132} />
      <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
        {title}
      </Text>
      <Text className="font-SatoshiMedium mt-1 text-center text-xs" style={{ color: theme.mutedText }}>
        {body}
      </Text>
    </View>
  );
}