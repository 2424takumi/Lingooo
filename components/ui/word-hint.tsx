import { View, StyleSheet, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { SelectableText } from './selectable-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WordHintProps {
  hint: string;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
  isStreaming?: boolean;
  streamingText?: string;
}

export function WordHint({
  hint,
  onTextSelected,
  onSelectionCleared,
  isStreaming = false,
  streamingText = '',
}: WordHintProps) {
  const bgColor = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ストリーミング中はstreamingTextを表示
  const displayText = isStreaming ? streamingText : hint;

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }, animatedStyle]}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
      </View>
      {isStreaming ? (
        <Text style={[styles.hintText, { color: textColor }]}>{streamingText}</Text>
      ) : (
        <SelectableText
          text={hint}
          style={{ ...styles.hintText, color: textColor }}
          onSelectionChange={onTextSelected}
          onSelectionCleared={onSelectionCleared}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 4,
  },
  icon: {
    fontSize: 14,
  },
  hintText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.3,
    flex: 1,
  },
});
