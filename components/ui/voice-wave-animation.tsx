import { View, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface VoiceWaveAnimationProps {
  audioLevel?: number; // 0-1の範囲
  isActive: boolean;
  color?: string;
}

const BAR_COUNT = 4;
const BAR_WIDTH = 3;
const BAR_GAP = 4;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;

export function VoiceWaveAnimation({
  audioLevel = 0,
  isActive,
  color = '#666666',
}: VoiceWaveAnimationProps) {
  // 各バーの高さをアニメーション
  const barHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => useSharedValue(MIN_HEIGHT))
  ).current;

  useEffect(() => {
    if (isActive) {
      // 音声レベルに基づいて各バーの高さを更新
      barHeights.forEach((height, index) => {
        // 各バーに少し遅延を加えて波のような効果を出す
        const delay = index * 50;

        // 音声レベルがない場合はデフォルトアニメーション
        if (audioLevel === 0) {
          // デフォルトの波打つアニメーション
          height.value = withRepeat(
            withSequence(
              withTiming(MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * 0.3, {
                duration: 300 + index * 50,
              }),
              withTiming(MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * 0.7, {
                duration: 300 + index * 50,
              })
            ),
            -1,
            true
          );
        } else {
          // 音声レベルに基づく高さ
          const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * Math.min(audioLevel * 1.5, 1);

          setTimeout(() => {
            height.value = withSpring(targetHeight, {
              damping: 15,
              stiffness: 150,
            });
          }, delay);
        }
      });
    } else {
      // 非アクティブ時は最小高さに戻す
      barHeights.forEach((height) => {
        height.value = withSpring(MIN_HEIGHT, {
          damping: 20,
          stiffness: 200,
        });
      });
    }
  }, [isActive, audioLevel, barHeights]);

  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => (
        <AnimatedBar key={index} height={height} color={color} />
      ))}
    </View>
  );
}

function AnimatedBar({
  height,
  color,
}: {
  height: Animated.SharedValue<number>;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
          width: BAR_WIDTH,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
    height: MAX_HEIGHT,
  },
  bar: {
    borderRadius: BAR_WIDTH / 2,
  },
});
