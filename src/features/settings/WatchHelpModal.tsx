import { AppIllustration } from "@/src/components/AppIllustration";
import { appTheme } from "@/src/lib/theme";
import { X } from "lucide-react-native";
import { Modal, Text, TouchableOpacity, View } from "react-native";


export function WatchHelpModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: ReturnType<typeof appTheme> }) {
  const steps = [
    "Open your smart watch companion app.",
    "Go to notification or app alerts settings.",
    "Allow phone notification access if Android asks.",
    "Turn on Other apps or RoutineOS.",
    "Keep RoutineOS notifications enabled in Android app settings.",
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
        <View className="rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <AppIllustration name="info-questions" size={124} style={{ alignSelf: "center", marginBottom: 14 }} />
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
                Enable watch alerts
              </Text>
              <Text className="font-SatoshiMedium mt-2 text-xs leading-5" style={{ color: theme.mutedText }}>
                Your watch only mirrors phone notifications. RoutineOS cannot directly control the watch UI.
              </Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={onClose}>
              <X size={17} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View className="mt-5 gap-3">
            {steps.map((step, index) => (
              <View key={step} className="flex-row gap-3 rounded-2xl border p-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
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
        </View>
      </View>
    </Modal>
  );
}
