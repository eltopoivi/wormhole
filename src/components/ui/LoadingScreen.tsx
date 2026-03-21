import { View, ActivityIndicator, Text } from "react-native";
import { COLORS } from "@/lib/constants";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textFaint, fontSize: 12, marginTop: 12 }}>Loading...</Text>
    </View>
  );
}
