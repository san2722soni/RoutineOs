import type { ReactNode } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import type { appTheme } from "@/src/lib/theme";
import { IconCircleButton } from "@/src/components/IconCircleButton";
import { X } from "lucide-react-native";

export function ModalShell({
  visible,
  title,
  subtitle,
  theme,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  theme: ReturnType<typeof appTheme>;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
        <View className="rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
                {title}
              </Text>
              {!!subtitle && (
                <Text className="font-SatoshiMedium mt-2 text-sm leading-5" style={{ color: theme.mutedText }}>
                  {subtitle}
                </Text>
              )}
            </View>
            <IconCircleButton
              icon={<X size={17} color={theme.text} />}
              onPress={onClose}
              theme={theme}
              backgroundColor={theme.input}
            />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
