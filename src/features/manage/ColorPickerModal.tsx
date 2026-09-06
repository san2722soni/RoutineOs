import { appTheme } from "@/src/lib/theme";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import ColorPicker, { HueSlider, Panel1, Preview } from "reanimated-color-picker";
export function ColorPickerModal({ visible, color, theme, onClose, onChange }: { visible: boolean; color: string; theme: ReturnType<typeof appTheme>; onClose: () => void; onChange: (color: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "#00000099" }}>
        <View className="rounded-t-[28px] border px-5 pb-8 pt-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <ColorPicker value={color} sliderThickness={22} thumbSize={26} onCompleteJS={(colors) => onChange(colors.hex)}>
            <Panel1 style={{ height: 180, borderRadius: 16, marginTop: 18 }} />
            <HueSlider style={{ height: 24, borderRadius: 12, marginTop: 18 }} />
            <Preview hideInitialColor colorFormat="hex" style={{ height: 44, borderRadius: 14, marginTop: 18 }} textStyle={{ fontWeight: "800" }} />
          </ColorPicker>
          <TouchableOpacity className="mt-5 h-12 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={onClose}>
            <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
