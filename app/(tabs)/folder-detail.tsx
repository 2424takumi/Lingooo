import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { QACard } from '@/components/ui/qa-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadBookmarks, removeBookmark, type ChatBookmark } from '@/services/storage/bookmark-storage';
import { CopyIcon } from '@/components/icons/copy-icon';
import Svg, { Path } from 'react-native-svg';
import { logger } from '@/utils/logger';

// Icons
function FolderIcon({ size = 64, color = '#D1D1D1' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface BookmarkCardProps {
  bookmark: ChatBookmark;
  onDelete: (id: string) => void;
}

function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
  const labelColor = useThemeColor({ light: '#949494', dark: '#8E8E93' }, 'icon');
  const iconColor = useThemeColor({ light: '#686868', dark: '#8E8E93' }, 'icon');

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // Format scope label
  const getScopeLabel = () => {
    return bookmark.identifier || '一般';
  };

  const handleDelete = () => {
    Alert.alert(
      'ブックマークを削除',
      'このブックマークを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => onDelete(bookmark.id),
        },
      ]
    );
  };

  const handleCopy = async () => {
    try {
      const textToCopy = `Q: ${bookmark.question}\n\nA: ${bookmark.answer}`;
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('コピーしました', '質問と回答をクリップボードにコピーしました');
    } catch (error) {
      logger.error('Failed to copy:', error);
      Alert.alert('エラー', 'コピーに失敗しました');
    }
  };

  return (
    <View style={styles.bookmarkCardContainer}>
      {/* Label above card */}
      <View style={styles.labelRow}>
        <View style={styles.labelLeftSection}>
          <Text style={[styles.scopeLabel, { color: labelColor }]}>{getScopeLabel()}</Text>
          <Text style={[styles.dateLabel, { color: labelColor }]}>{formatDate(bookmark.timestamp)}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="コピー"
            onPress={handleCopy}
            style={styles.actionButton}
            hitSlop={8}
          >
            <CopyIcon size={18} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="削除"
            onPress={handleDelete}
            style={styles.actionButton}
            hitSlop={8}
          >
            <TrashIcon size={18} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* QA Card */}
      <QACard
        pair={{
          id: bookmark.id,
          q: bookmark.question,
          a: bookmark.answer,
          status: 'completed',
          followUpQAs: bookmark.followUpQAs,
        }}
        scope={bookmark.scope}
        identifier={bookmark.identifier}
        hideActions={true}
      />
    </View>
  );
}

export default function FolderDetailScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const tabTextColor = useThemeColor({ light: '#686868', dark: '#8E8E93' }, 'icon');

  const params = useLocalSearchParams();
  const folderId = typeof params.folderId === 'string' ? params.folderId : '';
  const folderName = typeof params.folderName === 'string' ? params.folderName : 'フォルダ';

  const [bookmarks, setBookmarks] = useState<ChatBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load bookmarks in this folder
  const fetchBookmarks = useCallback(async () => {
    try {
      logger.debug('[FolderDetail] Loading bookmarks for folder:', folderId);
      const allBookmarks = await loadBookmarks();
      const folderBookmarks = allBookmarks.filter(b => b.folder === folderId);
      logger.debug('[FolderDetail] Loaded bookmarks:', folderBookmarks.length, 'items');
      setBookmarks(folderBookmarks);
    } catch (error) {
      logger.error('[FolderDetail] Failed to load bookmarks:', error);
      Alert.alert('エラー', 'ブックマークの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [folderId]);

  useEffect(() => {
    void fetchBookmarks();
  }, [fetchBookmarks]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchBookmarks();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      logger.error('Failed to delete bookmark:', error);
      Alert.alert('エラー', 'ブックマークの削除に失敗しました');
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title={folderName}
            onBackPress={() => router.back()}
          />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: tabTextColor }]}>読み込み中...</Text>
          </View>
        ) : bookmarks.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.bookmarkList}>
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                />
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                全{bookmarks.length}件のブックマーク
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <FolderIcon size={64} />
            <Text style={styles.emptyTitle}>ブックマークがありません</Text>
            <Text style={[styles.emptyDescription, { color: tabTextColor }]}>
              このフォルダにブックマークを{'\n'}
              追加しましょう
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
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bookmarkList: {
    gap: 20,
  },
  bookmarkCardContainer: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  labelLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scopeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#ACACAC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
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
    textAlign: 'center',
    lineHeight: 20,
  },
});
