import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
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
import { useSubscription } from '@/contexts/subscription-context';
import { useAuth } from '@/contexts/auth-context';
import { useTutorialContext } from '@/contexts/tutorial-context';
import Constants from 'expo-constants';

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
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const cardBgColor = useThemeColor({}, 'cardBackgroundElevated');
  const errorTextColor = useThemeColor({}, 'errorText');
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { resetAndRestart } = useTutorialContext();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
              await AsyncStorage.clear();
              await supabase.auth.signOut();
              Alert.alert(
                t('settings.developer.resetCompleteTitle'),
                t('settings.developer.resetCompleteMessage'),
                [{ text: t('common.ok') }]
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

  const handleManageSubscription = () => {
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  };

  const handleContact = () => {
    Linking.openURL('mailto:support@lingooo.app');
  };

  const handleReplayTutorial = async () => {
    await resetAndRestart();
    router.push('/(tabs)/translate');
  };

  const executeDeleteAccount = async () => {
    try {
      const userId = user?.id;
      if (userId) {
        await supabase.from('users').delete().eq('id', userId);
      }
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      Alert.alert(
        t('settings.deleteAccount.completeTitle'),
        t('settings.deleteAccount.completeMessage')
      );
    } catch (error) {
      console.error('アカウント削除エラー:', error);
      Alert.alert(t('common.error'), t('settings.deleteAccount.error'));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount.confirmTitle'),
      t('settings.deleteAccount.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.deleteAccount.finalConfirmTitle'),
              t('settings.deleteAccount.finalConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.deleteAccount.delete'),
                  style: 'destructive',
                  onPress: executeDeleteAccount,
                },
              ]
            );
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
          {/* Subscription - Only shown for premium users */}
          {isPremium && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>{t('settings.subscription.title')}</Text>

              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: cardBgColor }]}
                onPress={handleManageSubscription}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>{t('settings.subscription.manage')}</Text>
                  <Text style={[styles.settingDescription, { color: textSecondaryColor }]}>{t('settings.subscription.manageDescription')}</Text>
                </View>
                <ChevronRightIcon color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
          )}

          {/* About */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>{t('settings.info.title')}</Text>

            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardBgColor }]}
              onPress={() => router.push('/privacy-policy')}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>{t('settings.info.privacyPolicy')}</Text>
              </View>
              <ChevronRightIcon color={textSecondaryColor} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardBgColor }]}
              onPress={() => router.push('/terms-of-service')}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>{t('settings.info.termsOfService')}</Text>
              </View>
              <ChevronRightIcon color={textSecondaryColor} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardBgColor }]}
              onPress={handleContact}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>{t('settings.info.contact')}</Text>
              </View>
              <ChevronRightIcon color={textSecondaryColor} />
            </TouchableOpacity>

            <View style={[styles.settingItem, { backgroundColor: cardBgColor }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>{t('settings.info.version')}</Text>
              </View>
              <Text style={[styles.versionText, { color: textSecondaryColor }]}>{appVersion}</Text>
            </View>

            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardBgColor }]}
              onPress={handleReplayTutorial}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>{t('tutorial.replayTutorial')}</Text>
              </View>
              <ChevronRightIcon color={textSecondaryColor} />
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>{t('settings.deleteAccount.title')}</Text>

            <TouchableOpacity
              style={[styles.settingItem, styles.dangerItem]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.dangerLabel, { color: errorTextColor }]}>{t('settings.deleteAccount.button')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Developer Tools - Only shown in development mode */}
          {__DEV__ && (
            <View style={[styles.section, styles.lastSection]}>
              <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>{t('settings.developer.title')}</Text>

              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: cardBgColor }]}
                onPress={handleClearPromptCache}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>Clear Prompt Cache</Text>
                  <Text style={[styles.settingDescription, { color: textSecondaryColor }]}>
                    Clear cached AI prompts (for testing language changes)
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.dangerItem]}
                onPress={handleResetApp}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.dangerLabel, { color: errorTextColor }]}>{t('settings.developer.resetApp')}</Text>
                  <Text style={[styles.settingDescription, { color: textSecondaryColor }]}>
                    {t('settings.developer.resetAppDescription')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 14,
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
    marginBottom: 4,
  },
});
