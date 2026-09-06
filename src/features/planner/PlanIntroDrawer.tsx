import { AppIllustration } from "@/src/components/AppIllustration";
import { appTheme } from "@/src/lib/theme";
import { X } from "lucide-react-native";
import { Modal, Text, TouchableOpacity, View } from "react-native";
export function PlanIntroDrawer({ visible, theme, onClose }: { visible: boolean; theme: ReturnType<typeof appTheme>; onClose: () => void }) {
  const steps = [
    "Choose the routine for tomorrow.",
    "Choose videos and write the goal and notes. Times, titles and areas come from your routine.",
    "Finish every block after checking it.",
    "Review the full tomorrow plan once.",
    "Finalize tomorrow with the 3-step confirmation.",
    "After the day starts, treat it as your history.",
    "Clear only before finalizing or before the day starts.",
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
        <View className="max-h-[84%] rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
          <AppIllustration name="onboarding-planning" size={136} style={{ alignSelf: "center", marginBottom: 14 }} />
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
                Tomorrow planning flow
              </Text>
              <Text className="font-SpaceGroteskBold mt-1 text-2xl" style={{ color: theme.text }}>
                Plan carefully, then lock
              </Text>
              <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.mutedText }}>
                This page turns your routine into tomorrow&apos;s exact plan.
              </Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onClose}>
              <X size={16} color={theme.mutedText} />
            </TouchableOpacity>
          </View>

          <View className="mt-5 gap-3">
            {steps.map((step, index) => (
              <View key={step} className="flex-row gap-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent }}>
                  <Text className="font-SatoshiBlack text-xs" style={{ color: "#0B0D10" }}>
                    {index + 1}
                  </Text>
                </View>
                <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.text }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onClose}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Understood
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
