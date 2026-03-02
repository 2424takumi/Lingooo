import { View, StyleSheet, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface TranslationNotesProps {
  notes: string;
  isStreaming?: boolean;
  streamingText?: string;
}

export function TranslationNotes({
  notes,
  isStreaming = false,
  streamingText = '',
}: TranslationNotesProps) {
  const { t } = useTranslation();
  const displayText = isStreaming ? streamingText : notes;
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (displayText) {
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = 0;
    }
  }, [!!displayText]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.label}>{t('translate.notesLabel')}</Text>
      <Text style={styles.notesText}>{displayText}</Text>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 9,
    paddingTop: 4,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555555',
    letterSpacing: 0.3,
  },
});
