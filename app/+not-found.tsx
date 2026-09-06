import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-2xl font-bold text-zinc-950">This screen does not exist.</Text>
        <Link href="/" className="mt-4 text-base font-semibold text-zinc-700">
          Go to today
        </Link>
      </View>
    </>
  );
}
