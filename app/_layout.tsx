import "@/global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Inter
    "Inter-Regular": require("../assets/fonts/inter/Inter-Regular.otf"),
    "Inter-Bold": require("../assets/fonts/inter/Inter-Bold.otf"),
    "Inter-Black": require("../assets/fonts/inter/Inter-Black.otf"),
    "Inter-Medium": require("../assets/fonts/inter/Inter-Medium.otf"),
    "Inter-Light-BETA": require("../assets/fonts/inter/Inter-Light-BETA.otf"),
    "Inter-ExtraBold": require("../assets/fonts/inter/Inter-ExtraBold.otf"),
    "Inter-ExtraLight": require("../assets/fonts/inter/Inter-ExtraLight-BETA.otf"),
    "Inter-SemiBold": require("../assets/fonts/inter/Inter-SemiBold.otf"),
    "Inter-Thin-BETA": require("../assets/fonts/inter/Inter-Thin-BETA.otf"),
  
    // Satoshi
    "Satoshi-Regular": require("../assets/fonts/satoshi/Satoshi-Regular.otf"),
    "Satoshi-Bold": require("../assets/fonts/satoshi/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/satoshi/Satoshi-Black.otf"),
    "Satoshi-Medium": require("../assets/fonts/satoshi/Satoshi-Medium.otf"),
    "Satoshi-Light": require("../assets/fonts/satoshi/Satoshi-Light.otf"),
    "Satoshi-Italic": require("../assets/fonts/satoshi/Satoshi-Italic.otf"),
    "Satoshi-MediumItalic": require("../assets/fonts/satoshi/Satoshi-MediumItalic.otf"),
  
    // Space Grotesk
    "SpaceGrotesk-Regular": require("../assets/fonts/space-grotesk/SpaceGrotesk-Regular.otf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/space-grotesk/SpaceGrotesk-Bold.otf"),
    "SpaceGrotesk-Medium": require("../assets/fonts/space-grotesk/SpaceGrotesk-Medium.otf"),
    "SpaceGrotesk-Light": require("../assets/fonts/space-grotesk/SpaceGrotesk-Light.otf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/space-grotesk/SpaceGrotesk-SemiBold.otf"),
  });
  

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
