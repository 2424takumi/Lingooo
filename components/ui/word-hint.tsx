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
  const bgColor = useThemeColor({}, 'hintBackground');
  const textColor = useThemeColor({}, 'text');
  const tagBg = useThemeColor({}, 'hintTagBackground');

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
      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: tagBg }]}>
          <Text style={styles.tagIcon}>💡</Text>
          <Text style={[styles.tagText, { color: textColor }]}>学習のヒント</Text>
        </View>
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
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagIcon: {
    fontSize: 13,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
});
