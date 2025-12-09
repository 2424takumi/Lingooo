import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { clearPromptCache } from '@/services/ai/langfuse-client';

// Icons
function ChevronRightIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');

  // 開発用: プロンプトキャッシュをクリア
  const handleClearPromptCache = async () => {
    try {
      await clearPromptCache();
      Alert.alert(
        'Cache Cleared',
        'Prompt cache has been cleared. New prompts will be fetched from backend on next use.',
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Failed to clear prompt cache:', error);
      Alert.alert(t('common.error'), 'Failed to clear prompt cache');
    }
  };

  // 開発用: アプリをリセットして初回起動状態に戻す
  const handleResetApp = () => {
    Alert.alert(
      t('settings.developer.resetConfirmTitle'),
      t('settings.developer.resetConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.developer.resetApp'),
          style: 'destructive',
          onPress: async () => {
            try {
              // AsyncStorageをクリア
              await AsyncStorage.clear();

              // Supabase認証をサインアウト
              await supabase.auth.signOut();

              // 完了メッセージ
              Alert.alert(
                t('settings.developer.resetCompleteTitle'),
                t('settings.developer.resetCompleteMessage'),
                [
                  {
                    text: t('common.ok'),
                  },
                ]
              );
            } catch (error) {
              console.error('リセットエラー:', error);
              Alert.alert(t('common.error'), t('settings.developer.resetError'));
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title={t('settings.title')}
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.account.title')}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.account.profile')}</Text>
                <Text style={styles.settingDescription}>{t('settings.account.profileDescription')}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/data-management')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.account.dataManagement')}</Text>
                <Text style={styles.settingDescription}>{t('settings.account.dataManagementDescription')}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.info.title')}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/privacy-policy')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.info.privacyPolicy')}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/terms-of-service')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.info.termsOfService')}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.info.version')}</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>

          {/* Developer Tools */}
          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>{t('settings.developer.title')}</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleClearPromptCache}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Clear Prompt Cache</Text>
                <Text style={styles.settingDescription}>
                  Clear cached AI prompts (for testing language changes)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.dangerItem]}
              onPress={handleResetApp}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.dangerLabel}>{t('settings.developer.resetApp')}</Text>
                <Text style={styles.settingDescription}>
                  {t('settings.developer.resetAppDescription')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  section: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#686868',
  },
  versionText: {
    fontSize: 14,
    color: '#686868',
    fontWeight: '500',
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#FFE0E0',
    backgroundColor: '#FFF5F5',
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF4444',
    marginBottom: 4,
  },
});
