import ConfidentIllustration from "@/assets/confident.svg";
import type { appTheme } from "@/src/lib/theme";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";

const message = "Own the day before it owns you.";
export function StartupSplash({ theme, onComplete }: { theme: ReturnType<typeof appTheme>; onComplete: () => void }) {
  const [text, setText] = useState("");
  const reveal = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const cursor = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let cancelled = false;
    let typing: ReturnType<typeof setInterval> | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(cursor, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(cursor, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]));
    const start = (reduced: boolean) => {
      if (cancelled) return;
      Animated.timing(reveal, { toValue: 1, duration: reduced ? 0 : 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      if (reduced) setText(message);
      else {
        blink.start();
        timers.push(setTimeout(() => {
          let index = 0;
          typing = setInterval(() => {
            setText(message.slice(0, ++index));
            if (index === message.length) clearInterval(typing);
          }, 42);
        }, 500));
      }
      timers.push(setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: reduced ? 0 : 450, useNativeDriver: true }).start(({ finished }) => { if (finished && !cancelled) onComplete(); });
      }, reduced ? 700 : 500 + message.length * 42 + 650));
    };
    AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(false));
    return () => { cancelled = true; timers.forEach(clearTimeout); clearInterval(typing); blink.stop(); reveal.stopAnimation(); opacity.stopAnimation(); };
  }, [cursor, onComplete, opacity, reveal]);
  return <Animated.View accessibilityLabel={message} className="flex-1 items-center justify-center px-8" style={{ backgroundColor: theme.background, opacity }}>
    <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
      <ConfidentIllustration width={220} height={205} />
    </Animated.View>
    <View className="mt-9 items-center" style={{ width: "100%", maxWidth: 310, minHeight: 88 }}>
      <Text accessible={false} className="font-SatoshiBlack text-center text-2xl leading-8" style={{ color: theme.text }}>{text}<Text style={{ color: theme.primary }}> </Text></Text>
      <Animated.View style={{ opacity: cursor, height: 3, width: 22, borderRadius: 2, backgroundColor: theme.primary, marginTop: 18 }} />
    </View>
  </Animated.View>;
}
