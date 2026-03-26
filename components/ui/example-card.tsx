import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SelectableText } from './selectable-text';

interface ExampleCardProps {
  english: string;
  japanese: string;
  index?: number;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function ExampleCard({ english, japanese, index = 0, onTextSelected, onSelectionCleared }: ExampleCardProps) {
  const cardBg = useThemeColor({}, 'cardBackground');
  const primaryText = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = index * 150;
    opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: cardBg }, animatedStyle]}>
      <SelectableText
        text={english}
        style={{ ...styles.english, color: primaryText }}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
      <SelectableText
        text={japanese}
        style={{ ...styles.japanese, color: secondaryText }}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  english: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  japanese: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
});
