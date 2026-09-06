import { appTheme } from "@/src/lib/theme";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Clock } from "lucide-react-native";
import { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

function dateFromTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date;
}

function timeFromDate(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function TimePickerField({ label, value, theme, disabled, onChange }: { label: string; value: string; theme: ReturnType<typeof appTheme>; disabled?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  const change = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (selected) onChange(timeFromDate(selected));
  };

  return (
    <View className="flex-1">
      <Text className="font-SatoshiMedium text-[10px]" style={{ color: theme.mutedText }}>
        {label}
      </Text>
      <TouchableOpacity className="mt-1 flex-row items-center gap-2 rounded-xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }} onPress={() => !disabled && setOpen(true)} disabled={disabled}>
        <Clock size={14} color={theme.primary} />
        <Text className="font-SatoshiBlack text-sm" style={{ color: disabled ? theme.mutedText : theme.accent }}>
          {value || "00:00"}
        </Text>
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={dateFromTime(value)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={change}
        />
      )}
    </View>
  );
}
