import { AppIllustration } from "@/src/components/AppIllustration";
import { useToast } from "@/src/components/ToastProvider";
import { displayName, sendEmailOtp, useSupabaseSession, verifyEmailOtp } from "@/src/lib/auth";
import { logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";
import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { Redirect, useRouter } from "expo-router";
import { KeyRound, Lock, Mail, ShieldCheck, Zap } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const settings = useRoutineStore((state) => state.settings);
  const theme = appTheme(modeFromSetting(settings.themeMode));
  const { session, user, loading } = useSupabaseSession();
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [working, setWorking] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const otpInputs = useRef<(TextInput | null)[]>([]);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const validateEmail = () => {
    if (!email.trim() || !email.includes("@")) {
      toast({ kind: "warning", title: "Missing email", message: "Enter your email address first." });
      return false;
    }
    return true;
  };

  const sendCode = async () => {
    Keyboard.dismiss();
    if (!validateEmail()) return;
    setWorking(true);
    logActionStart("send email otp", { email: email.trim() });
    try {
      await sendEmailOtp(email);
      setCodeSent(true);
      logActionSuccess("send email otp", { email: email.trim() });
      toast({ kind: "success", title: "Code sent", message: "Check your email for the login code." });
    } catch (error) {
      logActionError("send email otp", error, { email: email.trim() });
      toast({ kind: "error", title: "Login failed", message: "We couldn't sign you in. Check the code and try again." });
    } finally {
      setWorking(false);
    }
  };

  const verifyCode = async () => {
    Keyboard.dismiss();
    if (!validateEmail()) return;
    if (!token.trim()) {
      toast({ kind: "warning", title: "Missing code", message: "Enter the six-digit code from your email." });
      return;
    }
    setWorking(true);
    logActionStart("verify email otp", { email: email.trim() });
    try {
      const verifiedSession = await verifyEmailOtp(email, token);
      logActionSuccess("verify email otp", { email: email.trim() });
      if (verifiedSession) router.replace("/(tabs)");
    } catch (error) {
      logActionError("verify email otp", error, { email: email.trim() });
      toast({ kind: "error", title: "Login failed", message: "We couldn't sign you in. Check the code and try again." });
    } finally {
      setWorking(false);
    }
  };

  const updateOtp = (inputIndex: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    setToken((currentToken) => {
      const nextToken = currentToken.split("").concat(Array(6).fill("")).slice(0, 6);

      if (!digits) {
        nextToken[inputIndex] = "";
        return nextToken.join("");
      }

      digits.split("").forEach((digit, offset) => {
        if (inputIndex + offset < 6) nextToken[inputIndex + offset] = digit;
      });

      return nextToken.join("");
    });
    const nextIndex = Math.min(inputIndex + digits.length, 5);
    if (digits) otpInputs.current[nextIndex]?.focus();
  };

  const handleOtpKeyPress = (inputIndex: number, key: string) => {
    if (key !== "Backspace") return;
    if (token[inputIndex]) {
      setToken((currentToken) => {
        const nextToken = currentToken.split("");
        nextToken[inputIndex] = "";
        return nextToken.join("");
      });
      return;
    }
    if (inputIndex === 0) return;
    setToken((currentToken) => {
      const nextToken = currentToken.split("");
      nextToken[inputIndex - 1] = "";
      return nextToken.join("");
    });
    otpInputs.current[inputIndex - 1]?.focus();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start", paddingBottom: 24, paddingHorizontal: 20, paddingTop: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between">
            <Text className="font-SpaceGroteskBold text-xl" style={{ color: theme.text }}>
              Routine<Text style={{ color: theme.primary }}>OS</Text>
            </Text>
            <View className="flex-row items-center gap-2 rounded-full border px-3 py-2" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <ShieldCheck size={14} color={theme.primary} />
              <Text className="font-SatoshiBlack text-[11px]" style={{ color: theme.mutedText }}>
                Backup
              </Text>
            </View>
          </View>

          <View className="mt-8 w-full items-center" style={{ transform: [{ translateX: 6 }] }}>
            <View className="w-full items-center">
              <AppIllustration name="onboarding-productivity" width={Math.min(width - 16, 420)} height={250} />
            </View>
            <View className="mt-12 w-full items-center">
              <Text className="font-SatoshiBlack w-full text-center text-[32px] leading-[36px]" style={{ color: theme.text }}>
                Own the day
              </Text>
              <Text className="font-SatoshiBlack w-full text-center text-[32px] leading-[36px]" style={{ color: theme.text }}>
                before it owns you.
              </Text>
            </View>
          </View>

          <View className="mt-14 w-full rounded-[28px] border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="mb-4 flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: "#38BDF822" }}>
                <Zap size={17} color={theme.primary} fill={theme.primary} />
              </View>
              <View>
                <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                  Sign in with email code
                </Text>
                <Text className="font-SatoshiMedium text-xs" style={{ color: theme.mutedText }}>
                  No password to remember.
                </Text>
              </View>
            </View>

            <View className="mb-3 flex-row items-center gap-2 rounded-2xl border px-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
              <Mail size={16} color={theme.mutedText} />
              <TextInput
                className="font-SatoshiMedium flex-1 py-4 text-sm"
                style={{ color: theme.text }}
                placeholder="Email"
                placeholderTextColor={theme.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!working}
              />
            </View>

            {codeSent && (
              <View className="mb-3 flex-row items-center gap-3 rounded-2xl border px-3 py-3" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                <KeyRound size={16} color={theme.mutedText} />
                <View className="flex-1 flex-row justify-between gap-2">
                  {Array.from({ length: 6 }, (_, inputIndex) => (
                    <TextInput
                      key={inputIndex}
                      ref={(input) => {
                        otpInputs.current[inputIndex] = input;
                      }}
                      className="font-SatoshiBlack h-10 flex-1 rounded-xl border text-center text-sm"
                      style={{ backgroundColor: theme.surfaceAlt, borderColor: token[inputIndex] ? theme.primary : theme.border, color: theme.text }}
                      keyboardType="number-pad"
                      maxLength={inputIndex === 0 ? 6 : 1}
                      selectTextOnFocus
                      value={token[inputIndex] ?? ""}
                      onChangeText={(value) => updateOtp(inputIndex, value)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(inputIndex, nativeEvent.key)}
                      editable={!working}
                      accessibilityLabel={`OTP digit ${inputIndex + 1}`}
                    />
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity className="h-14 flex-row items-center justify-center gap-3 rounded-2xl" style={{ backgroundColor: theme.accent }} onPress={codeSent ? verifyCode : sendCode} disabled={working || loading}>
              {working || loading ? <ActivityIndicator color="#0B0D10" /> : codeSent ? <Lock size={18} color="#0B0D10" /> : <Mail size={18} color="#0B0D10" />}
              <Text className="font-SatoshiBlack text-base" style={{ color: "#0B0D10" }}>
                {codeSent ? "Verify Code" : "Send Login Code"}
              </Text>
            </TouchableOpacity>

            {codeSent && (
              <TouchableOpacity className="mt-3 h-12 items-center justify-center rounded-2xl border" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }} onPress={sendCode} disabled={working || loading}>
                <Text className="font-SatoshiBlack text-sm" style={{ color: theme.text }}>
                  Send Again
                </Text>
              </TouchableOpacity>
            )}

            {!!user && (
              <Text className="font-SatoshiMedium mt-3 text-center text-xs" style={{ color: theme.mutedText }}>
                Signed in as {displayName(user)}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
