import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Icons
function BookmarkIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20, color = '#FF4444' }: { size?: number; color?: string }) {
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

export default function BookmarksScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');

  // Mock data for demonstration
  const bookmarks = [
    { word: 'Serendipity', meaning: '思いがけない幸運な発見', savedDate: '2024-01-15' },
    { word: 'Eloquent', meaning: '雄弁な、説得力のある', savedDate: '2024-01-14' },
    { word: 'Ephemeral', meaning: '短命な、はかない', savedDate: '2024-01-14' },
    { word: 'Resilience', meaning: '回復力、適応力', savedDate: '2024-01-13' },
    { word: 'Ambiguous', meaning: 'あいまいな、不明確な', savedDate: '2024-01-13' },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="ブックマーク"
            onBackPress={() => router.back()}
          />
        </View>

        {bookmarks.length > 0 ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.stats}>
              <Text style={styles.statsText}>保存済み: {bookmarks.length}単語</Text>
            </View>

            <View style={styles.bookmarkList}>
              {bookmarks.map((item, index) => (
                <TouchableOpacity key={index} style={styles.bookmarkItem}>
                  <BookmarkIcon size={20} color="#00AA69" />
                  <View style={styles.bookmarkContent}>
                    <Text style={styles.wordText}>{item.word}</Text>
                    <Text style={styles.meaningText}>{item.meaning}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton}>
                    <TrashIcon size={18} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <BookmarkIcon size={64} color="#D1D1D1" />
            <Text style={styles.emptyTitle}>ブックマークがありません</Text>
            <Text style={styles.emptyDescription}>
              単語詳細画面でブックマークアイコンをタップすると、{'\n'}
              ここに保存されます
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
  stats: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
  },
  bookmarkList: {
    gap: 8,
  },
  bookmarkItem: {
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
  bookmarkContent: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 14,
    color: '#686868',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
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
