import { appTheme } from "@/src/lib/theme";
import { AlertTriangle, X } from "lucide-react-native";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  danger,
  stepLabel,
  theme,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  stepLabel?: string;
  theme: ReturnType<typeof appTheme>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const color = danger ? "#EF4444" : theme.accent;
  const textColor = danger ? "#FFFFFF" : "#0B0D10";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
        <View className="w-full rounded-3xl border p-5" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              {!!stepLabel && (
                <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: danger ? "#FCA5A5" : theme.primary }}>
                  {stepLabel}
                </Text>
              )}
              <Text className="font-SpaceGroteskBold mt-1 text-2xl" style={{ color: theme.text }}>
                {title}
              </Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close" className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onCancel}>
              <X size={17} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View className="mt-4 flex-row gap-3 rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <AlertTriangle size={17} color={danger ? "#EF4444" : theme.primary} />
            <Text className="font-SatoshiMedium flex-1 text-sm leading-5" style={{ color: theme.mutedText }}>
              {message}
            </Text>
          </View>
          <View className="mt-5 flex-row gap-2">
            <TouchableOpacity className="h-12 flex-1 items-center justify-center rounded-2xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onCancel}>
              <Text className="font-SatoshiBlack text-sm" style={{ color: theme.mutedText }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="h-12 flex-1 items-center justify-center rounded-2xl" style={{ backgroundColor: color }} onPress={onConfirm}>
              <Text className="font-SatoshiBlack text-sm" style={{ color: textColor }}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
