import { AppIllustration, type IllustrationName } from "@/src/components/AppIllustration";
import { appTheme } from "@/src/lib/theme";
import { HelpCircle, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

type HelpStep = {
  title: string;
  body: string;
};

export function ScreenHelpButton({
  title,
  intro,
  steps,
  theme,
  illustration,
}: {
  title: string;
  intro: string;
  steps: HelpStep[];
  theme: ReturnType<typeof appTheme>;
  illustration?: IllustrationName;
}) {
  const [open, setOpen] = useState(false);
  const art = illustration ?? helpIllustration(title);

  return (
    <>
      <TouchableOpacity accessibilityLabel={`${title} help`} className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={() => setOpen(true)}>
        <HelpCircle size={18} color={theme.mutedText} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
          <View className="max-h-[86%] rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="h-52 items-center justify-center">
              <AppIllustration name={art} size={190} />
            </View>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
                  {title}
                </Text>
                <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.mutedText }}>
                  {intro}
                </Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close help" className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => setOpen(false)}>
                <X size={17} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View className="mt-5 gap-3">
              {steps.map((step, index) => (
                <View key={`${step.title}-${index}`} className="flex-row gap-3">
                  <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent }}>
                    <Text className="font-SatoshiBlack text-[11px]" style={{ color: "#0B0D10" }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                      {step.title}
                    </Text>
                    <Text className="font-SatoshiMedium mt-1 text-xs leading-5" style={{ color: theme.mutedText }}>
                      {step.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function helpIllustration(title: string): IllustrationName {
  const key = title.toLowerCase();
  if (key.includes("today")) return "screen-today";
  if (key.includes("plan")) return "screen-plan";
  if (key.includes("manage")) return "screen-manage";
  if (key.includes("settings")) return "screen-settings";
  if (key.includes("template")) return "info-guide";
  return "info-questions";
}
