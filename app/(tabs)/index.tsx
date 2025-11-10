import { StyleSheet, View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { SearchBar } from '@/components/ui/search-bar';
import { SideMenu } from '@/components/ui/side-menu';
import { SearchHistoryList } from '@/components/ui/search-history-list';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearch } from '@/hooks/use-search';
import { useClipboardSearch } from '@/hooks/use-clipboard-search';

export default function HomeScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const { handleSearch, isLoading, error } = useSearch();
  const [searchText, setSearchText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const onSearch = async (text: string) => {
    const success = await handleSearch(text);
    // 検索成功後、入力をクリア
    if (success) {
      setSearchText('');
    }
  };

  // クリップボード検索
  const { clipboardText, shouldSearch, clearClipboard } = useClipboardSearch({
    enabled: true,
    autoSearch: false,
  });

  // クリップボードテキストが検出されたら検索ボックスに自動入力
  useEffect(() => {
    if (shouldSearch && clipboardText) {
      setSearchText(clipboardText);
      clearClipboard();
    }
  }, [shouldSearch, clipboardText]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="home"
            onMenuPress={handleMenuPress}
            onProfilePress={handleProfilePress}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.searchContainer}>
            <SearchBar
              placeholder="知りたい単語を検索..."
              onSearch={onSearch}
              value={searchText}
              onChangeText={setSearchText}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00AA69" />
                <Text style={styles.loadingText}>検索中...</Text>
              </View>
            )}

            {/* Error Message */}
            {error && !isLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Search History */}
          <SearchHistoryList onItemPress={onSearch} maxItems={20} />
        </ScrollView>
      </View>

      {/* Side Menu */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
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
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 35,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    marginHorizontal: 7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#686868',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#CC0000',
  },
});
