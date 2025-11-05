import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Icons
function ClockIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function HistoryScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');

  // Mock data for demonstration
  const historyItems = [
    { word: 'Hello', time: '2時間前', date: '2024-01-15' },
    { word: 'World', time: '5時間前', date: '2024-01-15' },
    { word: 'Language', time: '昨日', date: '2024-01-14' },
    { word: 'Learning', time: '昨日', date: '2024-01-14' },
    { word: 'Study', time: '2日前', date: '2024-01-13' },
    { word: 'Practice', time: '2日前', date: '2024-01-13' },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="学習履歴"
            onBackPress={() => router.back()}
          />
        </View>

        {historyItems.length > 0 ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.historyList}>
              {historyItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.historyItem}>
                  <ClockIcon size={20} color="#00AA69" />
                  <View style={styles.historyContent}>
                    <Text style={styles.wordText}>{item.word}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>過去30日間の学習履歴を表示しています</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <ClockIcon size={64} color="#D1D1D1" />
            <Text style={styles.emptyTitle}>学習履歴がありません</Text>
            <Text style={styles.emptyDescription}>
              単語を検索すると、ここに履歴が表示されます
            </Text>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 62,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyContent: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#686868',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#ACACAC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
    lineHeight: 20,
  },
});
