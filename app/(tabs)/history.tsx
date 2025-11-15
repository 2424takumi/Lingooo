import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { getSearchHistory } from '@/services/storage/search-history-storage';
import type { SearchHistoryItem } from '@/types/search';
import { logger } from '@/utils/logger';

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
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 履歴をロードする関数
  const loadHistory = useCallback(async () => {
    try {
      logger.info('[History] Loading search history...');
      const history = await getSearchHistory();
      logger.info('[History] Loaded items:', history.length);
      setHistoryItems(history);
    } catch (error) {
      logger.error('[History] Failed to load search history:', error);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  }, [loadHistory]);

  // 相対時間を計算
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days === 1) return '昨日';
    if (days < 7) return `${days}日前`;
    return `${Math.floor(days / 7)}週間前`;
  };

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
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#111111"
              />
            }
          >
            <View style={styles.historyList}>
              {historyItems.map((item) => (
                <TouchableOpacity key={item.id} style={styles.historyItem}>
                  <ClockIcon size={20} color="#111111" />
                  <View style={styles.historyContent}>
                    <Text style={styles.wordText}>{item.query}</Text>
                    <Text style={styles.timeText}>
                      {getRelativeTime(item.timestamp)} • {item.language.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>最大{historyItems.length}件の履歴を表示</Text>
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
    marginBottom: 12,
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
