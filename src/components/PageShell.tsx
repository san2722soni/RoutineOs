import type { ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from "react-native";
import { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { appTheme } from "@/src/lib/theme";

export function PageShell({
  children,
  theme,
  backgroundColor,
  contentPadding = 16,
  bottomPadding = 150,
  keepKeyboardOpen,
  fillContent = false,
}: {
  children: ReactNode;
  theme: ReturnType<typeof appTheme>;
  backgroundColor?: string;
  contentPadding?: number;
  bottomPadding?: number;
  keepKeyboardOpen?: boolean;
  fillContent?: boolean;
}) {
  const safeBackground = backgroundColor ?? theme.background;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: safeBackground }}>
      <StatusBar barStyle={theme.mode === "dark" ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: bottomPadding, ...(fillContent ? { flexGrow: 1 } : {}) }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            {...(keepKeyboardOpen ? { onScrollBeginDrag: undefined } : {})}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
