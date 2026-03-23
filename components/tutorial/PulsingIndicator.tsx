import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface PulsingIndicatorProps {
  x: number;
  y: number;
}

function HandPressIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 14.5c0-1.38-.5-2-1.5-2.5S4 11 4 9.5C4 8 5 7 6.5 7S9 8 9 9.5V6c0-1.5 1-2.5 2.5-2.5S14 4.5 14 6v1c0-1.5 1-2.5 2.5-2.5S19 5.5 19 7v1c0-1.5 1-2.5 2.5-2.5"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 7v7c0 3.5-2.5 6.5-6.5 6.5-2.5 0-4-1-5.5-3L4.5 14"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function PulsingIndicator({ x, y }: PulsingIndicatorProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { left: x - 20, top: y - 20 },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <HandPressIcon />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 170, 105, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
});
