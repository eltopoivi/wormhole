import { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";
import { COLORS } from "@/lib/constants";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.bgHover,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MessageSkeleton() {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10 }}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Skeleton width={100} height={14} borderRadius={7} />
          <Skeleton width={60} height={10} borderRadius={5} style={{ marginLeft: 8 }} />
        </View>
        <Skeleton width="90%" height={14} borderRadius={7} style={{ marginBottom: 4 }} />
        <Skeleton width="60%" height={14} borderRadius={7} />
      </View>
    </View>
  );
}

export function ChannelSkeleton() {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", height: 34, paddingHorizontal: 8 }}>
        <Skeleton width={18} height={18} borderRadius={4} />
        <Skeleton width={120} height={14} borderRadius={7} style={{ marginLeft: 8 }} />
      </View>
    </View>
  );
}

export function ChatLoadingSkeleton() {
  return (
    <View style={{ flex: 1, paddingTop: 16 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </View>
  );
}
