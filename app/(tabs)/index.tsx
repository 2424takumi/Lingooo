import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { SearchBar } from '@/components/ui/search-bar';
import { SearchHistoryList } from '@/components/ui/search-history-list';
import { SideMenu } from '@/components/ui/side-menu';
import { SettingsBottomSheet } from '@/components/ui/settings-bottom-sheet';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { QuotaExceededModal } from '@/components/ui/quota-exceeded-modal';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSearch } from '@/hooks/use-search';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/contexts/subscription-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';

export default function HomeScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const titleColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'text');
  const { handleSearch, isLoading, error, showTextLengthModal, setShowTextLengthModal } = useSearch();
  const { needsInitialSetup } = useAuth();
  const { isPremium } = useSubscription();
  const { currentLanguage, defaultLanguage } = useLearningLanguages();
  const [searchText, setSearchText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [menuButtonLayout, setMenuButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | undefined>(undefined);

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
    // 検索成功後、入力をクリアして履歴を更新
    if (success) {
      setSearchText('');
      setHistoryRefreshTrigger(prev => prev + 1);
    }
  };

  const handleHistoryItemPress = (query: string) => {
    // 履歴アイテムをタップしたら検索実行
    onSearch(query);
  };

  const handleImageSelected = (result: { uri: string; mimeType: string; fileName?: string }) => {
    console.log('[HomeScreen] Image selected:', result);
    setSelectedImageUri(result.uri);
    setSelectedImageMimeType(result.mimeType);
    setImagePreviewVisible(true);
  };

  const handleImageError = (error: string) => {
    console.error('[HomeScreen] Image selection error:', error);
    Alert.alert(t('imageUpload.error', 'エラー'), error);
  };

  const handleImagePreviewClose = () => {
    setImagePreviewVisible(false);
    setSelectedImageUri(null);
    setSelectedImageMimeType(undefined);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <UnifiedHeaderBar
              pageType="home"
              onMenuPress={handleMenuPress}
              onSettingsPress={handleSettingsPress}
            />
          </View>

          {/* Search Section */}
          <View style={styles.searchContainer}>
            <SearchBar
              placeholder={t('home.searchPlaceholder')}
              onSearch={onSearch}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus={!needsInitialSetup}
              onTextLengthError={() => setShowTextLengthModal(true)}
              onImageSelected={handleImageSelected}
              onImageError={handleImageError}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#111111" />
                <Text style={styles.loadingText}>{t('home.searching')}</Text>
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
          <View style={styles.historyContainer}>
            <SearchHistoryList
              onItemPress={handleHistoryItemPress}
              maxItems={20}
              showTitle={true}
              refreshTrigger={historyRefreshTrigger}
            />
          </View>
        </View>
      </ScrollView>

      {/* Side Menu */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} menuButtonLayout={menuButtonLayout} />

      {/* Settings Bottom Sheet */}
      <SettingsBottomSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onUpgradePress={handleUpgradePress}
      />

      {/* Quota Exceeded Modal */}
      <QuotaExceededModal
        visible={showTextLengthModal}
        onClose={() => setShowTextLengthModal(false)}
        remainingQuestions={0}
        isPremium={isPremium}
        quotaType="text_length"
        onUpgradePress={() => {
          setShowTextLengthModal(false);
          setSubscriptionVisible(true);
        }}
      />

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet
        visible={subscriptionVisible}
        onClose={() => setSubscriptionVisible(false)}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={imagePreviewVisible}
        imageUri={selectedImageUri}
        mimeType={selectedImageMimeType}
        onClose={handleImagePreviewClose}
        targetLanguage={currentLanguage?.code || defaultLanguage?.code || 'ja'}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingTop: 62,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 8,
  },
  searchContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  historyContainer: {
    marginTop: 24,
    flex: 1,
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
