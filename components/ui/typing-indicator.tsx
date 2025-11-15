import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface TypingIndicatorProps {
  color?: string;
  dotSize?: number;
}

/**
 * ChatGPT/Claude風のタイピングインジケーター
 * 3つのドットが順番にアニメーション
 */
export function TypingIndicator({ color = '#2C2C2C', dotSize = 6 }: TypingIndicatorProps) {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(160),
        ])
      );
    };

    const animations = Animated.parallel([
      createAnimation(dot1Anim, 0),
      createAnimation(dot2Anim, 160),
      createAnimation(dot3Anim, 320),
    ]);

    animations.start();

    return () => {
      animations.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  const getDotStyle = (animValue: Animated.Value) => {
    return {
      opacity: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      }),
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4],
          }),
        },
      ],
    };
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color, width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          getDotStyle(dot1Anim),
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color, width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          getDotStyle(dot2Anim),
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color, width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          getDotStyle(dot3Anim),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    // Size is set dynamically via props
  },
});
