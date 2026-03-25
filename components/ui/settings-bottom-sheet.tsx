import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, Switch, ScrollView, Alert, Linking } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SettingsIcon, TokenIcon, LanguageIcon, ChevronRightIcon, CloseIcon, MessageCircleIcon } from './icons';
import { CircularProgress } from './circular-progress';
import { LanguageDropdown } from './language-dropdown';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useSubscription } from '@/contexts/subscription-context';
import { useAuth } from '@/contexts/auth-context';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { getUsageStats, UsageStats } from '@/services/api/usage';
import { logger } from '@/utils/logger';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useThemeContext, ThemePreference } from '@/contexts/theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

// Theme icons
function SunIcon({ size = 20, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 7a5 5 0 100 10 5 5 0 000-10z" stroke={color} strokeWidth={1.5} />
      <Path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function MoonIcon({ size = 20, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AutoThemeIcon({ size = 20, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth={1.5} />
      <Path d="M12 2v20" stroke={color} strokeWidth={1.5} />
      <Path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10" fill={color} fillOpacity={0.15} />
    </Svg>
  );
}

// Star Icon for premium features
function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFE44D', borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

interface SettingsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpgradePress?: () => void;
}

export function SettingsBottomSheet({ visible, onClose, onUpgradePress }: SettingsBottomSheetProps) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const pageBackground = useThemeColor({}, 'pageBackground');
  const text = useThemeColor({}, 'text');
  const overlayColor = useThemeColor({}, 'modalOverlay');
  const borderLightColor = useThemeColor({}, 'borderLight');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const textMuted = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const separatorColor = useThemeColor({}, 'separator');
  const errorTextColor = useThemeColor({}, 'errorText');

  // バックエンドAPIから全ての使用量を一括取得（単一のソース）
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  const {
    nativeLanguage,
    defaultLanguage,
    learningLanguages,
    setNativeLanguage,
    setDefaultLanguage,
    addLearningLanguage,
    removeLearningLanguage,
  } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { themePreference, setThemePreference } = useThemeContext();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const executeDeleteAccount = async () => {
    try {
      const userId = user?.id;
      if (userId) {
        await supabase.from('users').delete().eq('id', userId);
      }
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      onClose();
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

  // 使用量のデフォルト値
  const tokenUsage = usageStats?.translationTokens ?? { used: 0, limit: 50000 };
  const questionCount = usageStats?.questionCount ?? { used: 0, limit: 100 };
  const imageTranslationCount = usageStats?.imageTranslationCount ?? { used: 0, limit: 10 };
  const urlExtractionCount = usageStats?.urlExtractionCount ?? { used: 0, limit: 10 };
  const plan = usageStats?.isPremium ? 'plus' : 'free';

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // バックエンドAPIから使用量を一括取得
  useEffect(() => {
    if (visible) {
      console.log('[SettingsBottomSheet] Bottom sheet opened, fetching usage stats...');
      const fetchUsageStats = async () => {
        setIsLoadingUsage(true);
        try {
          console.log('[SettingsBottomSheet] Calling getUsageStats()...');
          const stats = await getUsageStats();
          console.log('[SettingsBottomSheet] getUsageStats() returned:', stats);
          if (stats) {
            setUsageStats(stats);
            logger.info('[SettingsBottomSheet] Usage stats loaded:', stats);
            console.log('[SettingsBottomSheet] Usage stats updated:', {
              translationTokens: stats.translationTokens,
              questionCount: stats.questionCount,
              isPremium: stats.isPremium,
            });
          } else {
            logger.warn('[SettingsBottomSheet] Failed to load usage stats, using default values');
            console.warn('[SettingsBottomSheet] Failed to load usage stats, using default values');
          }
        } catch (error) {
          logger.error('[SettingsBottomSheet] Error fetching usage stats:', error);
          console.error('[SettingsBottomSheet] Error fetching usage stats:', error);
        } finally {
          setIsLoadingUsage(false);
        }
      };
      fetchUsageStats();
    }
  }, [visible]);

  const tokenPercentage = tokenUsage.limit > 0 ? (tokenUsage.used / tokenUsage.limit) * 100 : 0;
  const questionPercentage = questionCount.limit > 0 ? (questionCount.used / questionCount.limit) * 100 : 0;
  const imagePercentage = imageTranslationCount.limit > 0 ? (imageTranslationCount.used / imageTranslationCount.limit) * 100 : 0;
  const urlPercentage = urlExtractionCount.limit > 0 ? (urlExtractionCount.used / urlExtractionCount.limit) * 100 : 0;

  // 月末までの残り日数を計算
  const getDaysUntilReset = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = lastDay.getDate() - now.getDate();
    return daysLeft;
  };

  const daysUntilReset = getDaysUntilReset();

  const handleLearningLanguagesChange = async (languages: Language[]) => {
    // 現在の学習言語と比較して追加・削除を実行
    const currentIds = learningLanguages.map((l) => l.id);
    const newIds = languages.map((l) => l.id);

    // 削除された言語
    const removed = currentIds.filter((id) => !newIds.includes(id));
    for (const id of removed) {
      await removeLearningLanguage(id);
    }

    // 追加された言語
    const added = newIds.filter((id) => !currentIds.includes(id));
    for (const id of added) {
      await addLearningLanguage(id);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: overlayColor }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: pageBackground,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle Bar */}
          <View style={[styles.handleBar, { backgroundColor: borderLightColor }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: text }]}>{t('settingsBottomSheet.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CloseIcon size={24} color={text} />
            </TouchableOpacity>
          </View>

          {/* User Info Section */}
          <View style={styles.userInfoContainer}>
            <View style={styles.userAvatar}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.userDetails}>
              <View style={[
                styles.planBadge,
                { backgroundColor: plan === 'free' ? cardBg : '#4CAF50' }
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  { color: plan === 'free' ? textSecondary : '#FFFFFF' }
                ]}>
                  {plan === 'free' ? t('settingsBottomSheet.freePlan') : t('settingsBottomSheet.premiumPlan')}
                </Text>
              </View>
            </View>
          </View>

          {/* Usage Stats - Horizontal Layout */}
          <View style={[styles.usageStatsContainer, { backgroundColor: cardBg }]}>
            {/* First Row: Token and Question Count */}
            <View style={styles.statsRow}>
              {/* Token Usage */}
              <View style={styles.statItem}>
                <CircularProgress
                  size={28}
                  strokeWidth={3}
                  percentage={tokenPercentage}
                  color={text}
                />
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('settingsBottomSheet.tokens')}</Text>
                  <Text style={[styles.statNumbers, { color: text }]}>
                    {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Question Count */}
              <View style={styles.statItem}>
                <CircularProgress
                  size={28}
                  strokeWidth={3}
                  percentage={questionPercentage}
                  color={text}
                />
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('settingsBottomSheet.questions')}</Text>
                  <Text style={[styles.statNumbers, { color: text }]}>
                    {questionCount.used} / {questionCount.limit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Second Row: Image and URL */}
            <View style={styles.statsRow}>
              {/* Image Translation Count */}
              <View style={styles.statItem}>
                <CircularProgress
                  size={28}
                  strokeWidth={3}
                  percentage={imagePercentage}
                  color={text}
                />
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('settingsBottomSheet.imageTranslation')}</Text>
                  <Text style={[styles.statNumbers, { color: text }]}>
                    {imageTranslationCount.used} / {imageTranslationCount.limit}
                  </Text>
                </View>
              </View>

              {/* URL Extraction Count */}
              <View style={styles.statItem}>
                <CircularProgress
                  size={28}
                  strokeWidth={3}
                  percentage={urlPercentage}
                  color={text}
                />
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t('settingsBottomSheet.urlTranslation')}</Text>
                  <Text style={[styles.statNumbers, { color: text }]}>
                    {urlExtractionCount.used} / {urlExtractionCount.limit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Third Row: Reset Days */}
            <View style={styles.resetRow}>
              <Text style={[styles.resetText, { color: textSecondary }]}>{t('settingsBottomSheet.resetIn', { days: daysUntilReset })}</Text>
            </View>
          </View>

          {/* Upgrade Button */}
          {plan === 'free' && (
            <View style={styles.upgradeButtonContainer}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => onUpgradePress?.()}
              >
                <Text style={styles.upgradeButtonText}>{t('settingsBottomSheet.tryPremium')}</Text>
                <Text style={styles.upgradeButtonSubtext}>
                  {t('settingsBottomSheet.premiumSubtext')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Language Settings */}
            <View style={styles.languageSettingsContainer}>
              <Text style={[styles.sectionTitle, { color: text }]}>{t('settingsBottomSheet.languageSettings')}</Text>
              {/* Native Language removed: Japanese-only optimization */}
              <LanguageDropdown
                label={t('settingsBottomSheet.defaultLanguage')}
                selectedLanguage={defaultLanguage}
                availableLanguages={learningLanguages}
                onSelect={(lang) => setDefaultLanguage(lang.id)}
              />
              <LanguageDropdown
                label={t('settingsBottomSheet.learningLanguages')}
                selectedLanguages={learningLanguages}
                availableLanguages={AVAILABLE_LANGUAGES}
                onMultiSelect={handleLearningLanguagesChange}
                multiSelect
              />
            </View>

            {/* Theme Settings */}
            <View style={styles.themeSettingsContainer}>
              <Text style={[styles.sectionTitle, { color: text }]}>{t('settingsBottomSheet.theme', 'テーマ')}</Text>
              <View style={styles.themeOptions}>
                {([
                  { id: 'light' as ThemePreference, label: t('settingsBottomSheet.themeLight', 'ライト'), Icon: SunIcon },
                  { id: 'dark' as ThemePreference, label: t('settingsBottomSheet.themeDark', 'ダーク'), Icon: MoonIcon },
                  { id: 'auto' as ThemePreference, label: t('settingsBottomSheet.themeAuto', '自動'), Icon: AutoThemeIcon },
                ]).map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.themeOption,
                      { backgroundColor: cardBg },
                      themePreference === option.id && { borderColor: primaryColor, borderWidth: 2 },
                    ]}
                    onPress={() => setThemePreference(option.id)}
                  >
                    <option.Icon size={20} color={text} />
                    <Text style={[styles.themeOptionLabel, { color: text }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Account Section */}
            <View style={styles.accountSectionContainer}>
              <Text style={[styles.sectionTitle, { color: text }]}>{t('settings.deleteAccount.title')}</Text>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: separatorColor }]}
                onPress={() => Linking.openURL('mailto:support@lingooo.app')}
              >
                <Text style={[styles.menuItemText, { color: text }]}>{t('settings.info.contact')}</Text>
                <ChevronRightIcon size={18} color={textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: separatorColor }]}
                onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              >
                <Text style={[styles.menuItemText, { color: text }]}>{t('settings.subscription.manage')}</Text>
                <ChevronRightIcon size={18} color={textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.menuItemText, { color: errorTextColor }]}>{t('settings.deleteAccount.button')}</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Links */}
            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => { onClose(); router.push('/privacy-policy'); }}>
                <Text style={[styles.footerLink, { color: textTertiary }]}>{t('settingsBottomSheet.privacyPolicy')}</Text>
              </TouchableOpacity>
              <Text style={[styles.footerSeparator, { color: textTertiary }]}>・</Text>
              <TouchableOpacity onPress={() => { onClose(); router.push('/terms-of-service'); }}>
                <Text style={[styles.footerLink, { color: textTertiary }]}>{t('settingsBottomSheet.termsOfService')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.versionContainer}>
              <Text style={[styles.versionText, { color: textMuted }]}>{t('settingsBottomSheet.version')} {appVersion}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 0,
    height: '90%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  usageStatsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 14,
  },
  statNumbers: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  resetRow: {
    alignItems: 'flex-start',
  },
  resetText: {
    fontSize: 12,
    lineHeight: 14,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  languageSettingsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  upgradeButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#111111',  // Keep dark for CTA contrast
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  upgradeButtonSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#CCCCCC',
  },
  aiSettingsContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  aiSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  aiSettingInfo: {
    flex: 1,
    marginRight: 12,
  },
  aiSettingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiSettingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  aiSettingDescription: {
    fontSize: 13,
  },
  themeSettingsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  accountSectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  footerLink: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11,
  },
});
