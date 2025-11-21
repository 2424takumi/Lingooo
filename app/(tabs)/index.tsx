import { StyleSheet, View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { SearchBar } from '@/components/ui/search-bar';
import { SideMenu } from '@/components/ui/side-menu';
import { SettingsBottomSheet } from '@/components/ui/settings-bottom-sheet';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { SearchHistoryList } from '@/components/ui/search-history-list';
import { TranslationHistoryList } from '@/components/ui/translation-history-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PenIcon } from '@/components/ui/icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearch } from '@/hooks/use-search';
import { useClipboardSearch } from '@/hooks/use-clipboard-search';

export default function HomeScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const titleColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'text');
  const { handleSearch, isLoading, error } = useSearch();
  const [searchText, setSearchText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [menuButtonLayout, setMenuButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [selectedHistoryTab, setSelectedHistoryTab] = useState(0); // 0: 単語, 1: 翻訳

  const handleMenuPress = (layout: { x: number; y: number; width: number; height: number }) => {
    setMenuButtonLayout(layout);
    setMenuVisible(true);
  };

  const handleSettingsPress = () => {
    setSettingsVisible(true);
  };

  const handleUpgradePress = () => {
    setSettingsVisible(false);
    // アニメーション完了後に課金シートを開く
    setTimeout(() => setSubscriptionVisible(true), 300);
  };

  const onSearch = async (text: string) => {
    const success = await handleSearch(text);
    // 検索成功後、入力をクリア
    if (success) {
      setSearchText('');
    }
  };

  // クリップボード検索
  // ユーザーが「貼り付け」を選択したときに、検索ボックスにテキストを設定
  const { isChecking } = useClipboardSearch({
    enabled: true,
    onPaste: (text: string) => {
      setSearchText(text);
    },
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="home"
            onMenuPress={handleMenuPress}
            onSettingsPress={handleSettingsPress}
          />
        </View>

        {/* Search Section - Fixed */}
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="知りたい単語を検索..."
            onSearch={onSearch}
            value={searchText}
            onChangeText={setSearchText}
          />

          {/* Hint Text */}
          {!searchText && !isLoading && !error && (
            <View style={styles.hintContainer}>
              <PenIcon size={14} color="#B9B9B9" />
              <Text style={styles.hintText}>長文を入力すると自動で翻訳機能に切り替わります</Text>
            </View>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#111111" />
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

        {/* History Tab Control */}
        <View style={styles.tabContainer}>
          <SegmentedControl
            segments={['単語履歴', '翻訳履歴']}
            selectedIndex={selectedHistoryTab}
            onIndexChange={setSelectedHistoryTab}
          />
        </View>

        {/* History List - Scrollable */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          {selectedHistoryTab === 0 ? (
            <SearchHistoryList onItemPress={onSearch} maxItems={20} showTitle={false} />
          ) : (
            <TranslationHistoryList onItemPress={onSearch} maxItems={20} showTitle={false} />
          )}
        </ScrollView>
      </View>

      {/* Side Menu */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} menuButtonLayout={menuButtonLayout} />

      {/* Settings Bottom Sheet */}
      <SettingsBottomSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onUpgradePress={handleUpgradePress}
      />

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet
        visible={subscriptionVisible}
        onClose={() => setSubscriptionVisible(false)}
      />
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
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  tabContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#B9B9B9',
    fontWeight: '400',
    letterSpacing: 0,
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
