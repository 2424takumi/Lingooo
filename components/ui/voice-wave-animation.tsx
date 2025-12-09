import { View, StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface VoiceWaveAnimationProps {
  audioLevel?: number; // 0-1の範囲
  isActive: boolean;
  color?: string;
}

const BAR_COUNT = 30;
const BAR_WIDTH = 2;
const BAR_GAP = 2;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;

export function VoiceWaveAnimation({
  audioLevel = 0,
  isActive,
  color = '#666666',
}: VoiceWaveAnimationProps) {
  // 音声レベルの履歴を保持（最新BAR_COUNT個）
  const [audioHistory, setAudioHistory] = useState<number[]>(
    Array(BAR_COUNT).fill(0)
  );

  useEffect(() => {
    if (isActive && audioLevel > 0) {
      // 新しい音声レベルを先頭に追加し、古いものを削除
      setAudioHistory((prev) => [audioLevel, ...prev.slice(0, BAR_COUNT - 1)]);
    } else if (!isActive) {
      // 非アクティブ時は全てリセット
      setAudioHistory(Array(BAR_COUNT).fill(0));
    }
  }, [audioLevel, isActive]);

  return (
    <View style={styles.container}>
      {audioHistory.map((level, index) => (
        <AnimatedBar key={index} level={level} color={color} isActive={isActive} />
      ))}
    </View>
  );
}

function AnimatedBar({
  level,
  color,
  isActive,
}: {
  level: number;
  color: string;
  isActive: boolean;
}) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (isActive && level > 0) {
      // 音声レベルに基づく高さ
      const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * Math.min(level * 1.5, 1);
      height.value = withSpring(targetHeight, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      // 非アクティブまたは音声なし時は最小高さ
      height.value = withTiming(MIN_HEIGHT, {
        duration: 200,
      });
    }
  }, [level, isActive, height]);

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
    justifyContent: 'flex-start',
    gap: BAR_GAP,
    height: MAX_HEIGHT,
    flex: 1,
  },
  bar: {
    borderRadius: BAR_WIDTH / 2,
  },
});
