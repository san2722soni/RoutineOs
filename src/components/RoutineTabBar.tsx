import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CalendarDays, CheckCircle2, Layers, ListChecks, Sliders } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Keyboard, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = {
  index: { label: "Today", icon: CheckCircle2 },
  planner: { label: "Plan", icon: CalendarDays },
  manage: { label: "Library", icon: Layers },
  tasks: { label: "Reminders", icon: ListChecks },
  settings: { label: "Settings", icon: Sliders },
};

export function RoutineTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const settings = useRoutineStore((store) => store.settings);
  const theme = appTheme(modeFromSetting(settings.themeMode));
  const dark = theme.mode === "dark";
  const visibleRoutes = state.routes.filter((route) => route.name in tabs);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom }}>
      <View
        className="flex-row items-stretch border-t px-1"
        style={{
          backgroundColor: dark ? "rgba(18,20,24,0.98)" : "rgba(255,255,255,0.98)",
          borderColor: theme.border,
          elevation: 10,
        }}
      >
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((item) => item.key === route.key);
          const active = state.index === index;
          const tab = tabs[route.name as keyof typeof tabs];
          const Icon = tab.icon;
          const color = active ? (dark ? "#0B0D10" : "#FFFFFF") : theme.mutedText;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              hitSlop={8}
              className="h-[64px] flex-1 items-center justify-center px-1"
              style={{
                backgroundColor: active ? (dark ? "#FFE2B8" : "#0F172A") : "transparent",
              }}
              onPress={() => navigation.navigate(route.name)}
            >
              <Icon size={active ? 20 : 18} color={color} strokeWidth={active ? 2.6 : 1.9} />
              <Text className="font-SatoshiBlack mt-1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color, fontSize: active ? 10.5 : 9 }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
