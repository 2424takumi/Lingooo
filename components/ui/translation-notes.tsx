import { StyleSheet, Text, ActivityIndicator, View } from 'react-native';
import { useEffect, useRef, memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface TranslationNotesProps {
  notes: string;
  isStreaming?: boolean;
  streamingText?: string;
}

/** 個別の行アニメーション */
const NoteItem = memo(function NoteItem({
  text,
  index,
  shouldAnimate,
}: {
  text: string;
  index: number;
  shouldAnimate: boolean;
}) {
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const translateY = useSharedValue(shouldAnimate ? 8 : 0);

  useEffect(() => {
    if (shouldAnimate) {
      opacity.value = withDelay(
        index * 120,
        withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) })
      );
      translateY.value = withDelay(
        index * 120,
        withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) })
      );
    }
  }, [shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.notesText}>{text}</Text>
    </Animated.View>
  );
});

/** テキストを行に分割（空行を除く） */
function splitIntoLines(text: string): string[] {
  return text.split('\n').filter(line => line.trim().length > 0);
}

export function TranslationNotes({
  notes,
  isStreaming = false,
  streamingText = '',
}: TranslationNotesProps) {
  const { t } = useTranslation();
  const displayText = isStreaming ? streamingText : notes;

  // アニメーション済みの行数を追跡
  const animatedCountRef = useRef(0);
  const prevDisplayTextRef = useRef('');

  // テキストがリセットされたらカウンターもリセット
  useEffect(() => {
    if (!displayText) {
      animatedCountRef.current = 0;
      prevDisplayTextRef.current = '';
    }
  }, [displayText]);

  const isWaiting = isStreaming && !displayText;

  if (!displayText && !isStreaming) {
    return null;
  }

  // 完了した行と現在ストリーミング中の行を分離
  const allLines = displayText ? splitIntoLines(displayText) : [];

  let completedLines: string[];
  let partialLine: string | null = null;

  if (isStreaming && displayText) {
    // ストリーミング中: 最後の行が改行で終わっていなければ未完了
    const endsWithNewline = displayText.endsWith('\n');
    if (endsWithNewline || allLines.length === 0) {
      completedLines = allLines;
    } else {
      completedLines = allLines.slice(0, -1);
      partialLine = allLines[allLines.length - 1];
    }
  } else {
    // ストリーミング完了: 全行が完了
    completedLines = allLines;
  }

  // 新しく完了した行のみアニメーション対象
  const prevAnimatedCount = animatedCountRef.current;
  if (completedLines.length > prevAnimatedCount) {
    animatedCountRef.current = completedLines.length;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('translate.notesLabel')}</Text>
        {isWaiting && (
          <ActivityIndicator size="small" color="#AAAAAA" style={styles.spinner} />
        )}
      </View>
      {(completedLines.length > 0 || partialLine) ? (
        <View style={styles.notesContainer}>
          {completedLines.map((line, i) => (
            <NoteItem
              key={`note-${i}-${line.slice(0, 10)}`}
              text={line}
              index={i - prevAnimatedCount}
              shouldAnimate={i >= prevAnimatedCount}
            />
          ))}
          {partialLine && (
            <Text style={styles.notesText}>{partialLine}</Text>
          )}
        </View>
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
  notesContainer: {
    gap: 2,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#444444',
    letterSpacing: 0.3,
  },
});
