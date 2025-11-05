import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { QAPair } from '@/types/chat';

interface QACardProps {
  pair: QAPair;
  onRetry?: (question: string) => void;
}

export function QACard({ pair, onRetry }: QACardProps) {
  const cardBackground = useThemeColor({ light: '#FAFCFB', dark: '#1C1C1E' }, 'background');
  const borderColor = useThemeColor({ light: '#FFFFFF', dark: '#3A3A3C' }, 'background');
  const questionColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'icon');
  const answerBackground = useThemeColor({ light: '#E5F3E8', dark: '#2C2C2E' }, 'searchBackground');
  const answerTextColor = useThemeColor({ light: '#000000', dark: '#F2F2F2' }, 'text');
  const errorColor = useThemeColor({ light: '#D33', dark: '#FF6B6B' }, 'primary');
  const loadingColor = useThemeColor({ light: '#686868', dark: '#B0B0B0' }, 'icon');
  const primaryColor = useThemeColor({}, 'primary');

  const showRetry = pair.status === 'error' && typeof onRetry === 'function';

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor,
        },
      ]}
    >
      {/* 質問部分 */}
      <Text style={[styles.questionText, { color: questionColor }]}>{pair.q}</Text>

      {/* 回答部分 */}
      <View style={[styles.answerContainer, { backgroundColor: answerBackground }]}>
        {pair.status === 'pending' ? (
          <View style={styles.pendingContainer}>
            {pair.a ? (
              <Text style={[styles.answerText, { color: answerTextColor }]}>{pair.a}</Text>
            ) : null}
            <View style={styles.loadingRow}>
              <ActivityIndicator color={primaryColor} size="small" />
              <Text style={[styles.loadingText, { color: loadingColor }]}>
                回答を生成しています...
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.answerText, { color: answerTextColor }]}>
            {pair.a ?? (pair.status === 'error' ? '回答を取得できませんでした。' : '')}
          </Text>
        )}

        {pair.status === 'error' && pair.errorMessage ? (
          <Text style={[styles.errorText, { color: errorColor }]}>{pair.errorMessage}</Text>
        ) : null}

        {showRetry && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onRetry?.(pair.q)}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: primaryColor }]}>再試行</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  answerContainer: {
    borderRadius: 8,
    padding: 16,
    gap: 10,
    marginHorizontal: -6,
    marginBottom: -6,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  pendingContainer: {
    gap: 8,
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
