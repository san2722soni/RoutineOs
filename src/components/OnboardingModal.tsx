import { useRef, useState } from "react";
import { Modal, ScrollView, StatusBar, Text, TouchableOpacity, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { AppIllustration, type IllustrationName } from "@/src/components/AppIllustration";
import { appTheme } from "@/src/lib/theme";

const slides: { title: string; body: string; illustration: IllustrationName }[] = [
  {
    title: "Build your system once",
    body: "Create areas, routines, and videos in Library so your day is not rebuilt from zero every morning.",
    illustration: "onboarding-planning",
  },
  {
    title: "Commit tomorrow",
    body: "Plan the exact blocks, review them properly, then finalize tomorrow.",
    illustration: "onboarding-calendar",
  },
  {
    title: "Execute with reminders",
    body: "Today follows real time. Your phone and watch reminders keep the next block visible.",
    illustration: "onboarding-schedule",
  },
  {
    title: "Remember what matters",
    body: "Save a task for later and attach it to a place so it is easier to remember when you go there.",
    illustration: "onboarding-reminders",
  },
];

export function OnboardingModal({
  visible,
  theme,
  onDone,
}: {
  visible: boolean;
  theme: ReturnType<typeof appTheme>;
  onDone: () => void;
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === slides.length - 1;

  const updateIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal visible={visible} animationType="fade">
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar barStyle={theme.mode === "dark" ? "light-content" : "dark-content"} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-5 pt-2">
            <Text className="font-SatoshiBlack text-[11px] uppercase tracking-wider" style={{ color: theme.primary }}>
              RoutineOS setup
            </Text>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full border" style={{ backgroundColor: theme.surface, borderColor: theme.border }} onPress={onDone}>
              <X size={16} color={theme.mutedText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            ref={scrollRef}
            onMomentumScrollEnd={updateIndex}
            scrollEventThrottle={16}
          >
            {slides.map((slide) => (
              <View key={slide.title} className="justify-center px-6 pb-24" style={{ width }}>
                <AppIllustration name={slide.illustration} size={250} style={{ alignSelf: "center" }} />
                <Text className="font-SpaceGroteskBold mt-10 text-center text-[34px] leading-[40px]" style={{ color: theme.text }}>
                  {slide.title}
                </Text>
                <Text className="font-SatoshiMedium mt-4 text-center text-base leading-6" style={{ color: theme.mutedText }}>
                  {slide.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t px-5 py-5" style={{ backgroundColor: theme.background, borderTopColor: theme.border }}>
            <View className="flex-row gap-2">
              {slides.map((_, dot) => (
                <View key={dot} className="h-2 rounded-full" style={{ width: dot === index ? 24 : 8, backgroundColor: dot === index ? theme.primary : theme.border }} />
              ))}
            </View>
            <TouchableOpacity
              className="rounded-2xl px-5 py-3"
              style={{ backgroundColor: theme.accent }}
              onPress={() => {
                if (last) onDone();
                else {
                  const next = index + 1;
                  setIndex(next);
                  scrollRef.current?.scrollTo({ x: next * width, animated: true });
                }
              }}
            >
              <Text className="font-SatoshiBlack text-sm" style={{ color: "#0B0D10" }}>
                {last ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
