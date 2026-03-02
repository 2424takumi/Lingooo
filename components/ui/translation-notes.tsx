import { StyleSheet, Text, ActivityIndicator, View } from 'react-native';
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
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (displayText) {
      contentOpacity.value = withTiming(1, { duration: 300 });
    } else {
      contentOpacity.value = 0;
    }
  }, [!!displayText]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // ストリーミング開始前（まだテキストなし）でもラベル+ローディングを表示
  const isWaiting = isStreaming && !displayText;

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('translate.notesLabel')}</Text>
        {isWaiting && (
          <ActivityIndicator size="small" color="#AAAAAA" style={styles.spinner} />
        )}
      </View>
      {displayText ? (
        <Animated.View style={contentAnimatedStyle}>
          <Text style={styles.notesText}>{displayText}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginTop: 12,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  notesText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#444444',
    letterSpacing: 0.3,
  },
});
