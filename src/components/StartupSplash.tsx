import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import ConfidentIllustration from "@/assets/confident.svg";
import RoutineOsMark from "@/assets/routineos-mark.svg";
import type { appTheme } from "@/src/lib/theme";

const message = "Own the day before it owns you.";

export function StartupSplash({ theme, onComplete }: { theme: ReturnType<typeof appTheme>; onComplete: () => void }) {
  const [visibleText, setVisibleText] = useState("");
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(illustrationOpacity, { toValue: 1, duration: 700, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    let index = 0;
    const typingTimer = setInterval(() => {
      index += 1;
      setVisibleText(message.slice(0, index));
      if (index >= message.length) {
        clearInterval(typingTimer);
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(cursorOpacity, { toValue: 0.15, duration: 430, useNativeDriver: true }),
            Animated.timing(cursorOpacity, { toValue: 1, duration: 430, useNativeDriver: true }),
          ]).start();
        }, 80);
      }
    }, 48);

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0.15, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    blink.start();

    const exitTimer = setTimeout(() => {
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, message.length * 48 + 1500);

    return () => {
      clearInterval(typingTimer);
      clearTimeout(exitTimer);
      blink.stop();
    };
  }, [cursorOpacity, exitOpacity, illustrationOpacity, onComplete, screenOpacity]);

  return (
    <Animated.View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: theme.background, opacity: Animated.multiply(screenOpacity, exitOpacity) }}>
      <Animated.View style={{ opacity: illustrationOpacity, transform: [{ scale: illustrationOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
        <ConfidentIllustration width={220} height={205} />
      </Animated.View>
      <View className="mt-6 items-center">
        <View className="mt-5 min-h-12 flex-row items-center justify-center">
          <Text className="font-SatoshiBlack text-center text-3xl leading-7" style={{ color: theme.text }}>
            {visibleText}
          </Text>
          <Animated.View className="ml-1 h-6 w-0.5" style={{ backgroundColor: theme.primary, opacity: cursorOpacity }} />
        </View>
      </View>
    </Animated.View>
  );
}
