import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSupabaseSession } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { useToast } from "@/src/components/ToastProvider";
import { errorMessage, logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string }>();
  const settings = useRoutineStore((state) => state.settings);
  const theme = appTheme(modeFromSetting(settings.themeMode));
  const { session, loading } = useSupabaseSession();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const finish = async () => {
      logActionStart("auth callback", { hasCode: Boolean(params.code), hasTokens: Boolean(params.access_token && params.refresh_token) });
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
          });
          if (error) throw error;
        }
        logActionSuccess("auth callback");
      } catch (error) {
        logActionError("auth callback", error);
        setFailed(true);
        toast({ kind: "error", title: "Login callback failed", message: errorMessage(error) || "Could not finish sign in." });
      } finally {
        setDone(true);
      }
    };

    finish();
  }, [params.access_token, params.code, params.refresh_token, toast]);

  if ((!loading && session) || (done && !failed)) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.background }}>
      <ActivityIndicator color={theme.primary} />
      <Text className="font-SatoshiBlack mt-4 text-center text-sm" style={{ color: theme.text }}>
        Finishing sign in...
      </Text>
    </SafeAreaView>
  );
}
