import { View, Text, Image } from "react-native";

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

const FONT_MAP = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
};

const AVATAR_COLORS = [
  "#5865f2", "#57f287", "#eb459e", "#ed4245",
  "#f47b67", "#f8a532", "#36d6aa", "#e78ad6",
];

function getInitialColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ uri, name, size = "md" }: AvatarProps) {
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: getInitialColor(name),
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
