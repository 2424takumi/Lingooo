import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, Switch, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SettingsIcon, TokenIcon, LanguageIcon, ChevronRightIcon, CloseIcon, MessageCircleIcon } from './icons';
import { CircularProgress } from './circular-progress';
import { LanguageDropdown } from './language-dropdown';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useSubscription } from '@/contexts/subscription-context';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { getUsageStats, UsageStats } from '@/services/api/usage';
import { logger } from '@/utils/logger';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

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

  // 使用量のデフォルト値
  const tokenUsage = usageStats?.translationTokens ?? { used: 0, limit: 50000 };
  const questionCount = usageStats?.questionCount ?? { used: 0, limit: 100 };
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

  // 開発用: アプリをリセットして初回起動状態に戻す
  const handleResetApp = () => {
    Alert.alert(
      t('settingsBottomSheet.resetConfirmTitle'),
      t('settingsBottomSheet.resetConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsBottomSheet.resetApp'),
          style: 'destructive',
          onPress: async () => {
            try {
              // AsyncStorageをクリア
              await AsyncStorage.clear();

              // Supabase認証をサインアウト
              await supabase.auth.signOut();

              // ボトムシートを閉じる
              onClose();

              // 完了メッセージ
              Alert.alert(
                t('settingsBottomSheet.resetComplete'),
                t('settingsBottomSheet.resetCompleteMessage'),
                [
                  {
                    text: t('common.ok'),
                  },
                ]
              );
            } catch (error) {
              console.error('リセットエラー:', error);
              Alert.alert(t('common.error'), t('settingsBottomSheet.resetError'));
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
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
          <View style={styles.handleBar} />

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
              <Text style={styles.userAvatarText}>U</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{t('settingsBottomSheet.user')}</Text>
              <View style={[
                styles.planBadge,
                { backgroundColor: plan === 'free' ? '#F8F8F8' : '#4CAF50' }
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  { color: plan === 'free' ? '#666666' : '#FFFFFF' }
                ]}>
                  {plan === 'free' ? t('settingsBottomSheet.freePlan') : t('settingsBottomSheet.premiumPlan')}
                </Text>
              </View>
            </View>
          </View>

          {/* Usage Stats - Horizontal Layout */}
          <View style={styles.usageStatsContainer}>
            {/* First Row: Token and Question Count */}
            <View style={styles.statsRow}>
              {/* Token Usage */}
              <View style={styles.statItem}>
                <CircularProgress
                  size={28}
                  strokeWidth={3}
                  percentage={tokenPercentage}
                  color="#111111"
                />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>{t('settingsBottomSheet.tokens')}</Text>
                  <Text style={styles.statNumbers}>
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
                  color="#111111"
                />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>{t('settingsBottomSheet.questions')}</Text>
                  <Text style={styles.statNumbers}>
                    {questionCount.used} / {questionCount.limit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Second Row: Reset Days */}
            <View style={styles.resetRow}>
              <Text style={styles.resetText}>{t('settingsBottomSheet.resetIn', { days: daysUntilReset })}</Text>
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
              <Text style={styles.sectionTitle}>{t('settingsBottomSheet.languageSettings')}</Text>
              {/* Native Language removed: Japanese-only optimization */}
              <LanguageDropdown
                label={t('settingsBottomSheet.defaultLanguage')}
                selectedLanguage={defaultLanguage}
                availableLanguages={AVAILABLE_LANGUAGES}
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

            {/* Developer Tools */}
            <View style={styles.developerToolsContainer}>
              <Text style={styles.sectionTitle}>{t('settingsBottomSheet.developerTools')}</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetApp}
              >
                <Text style={styles.resetButtonText}>{t('settingsBottomSheet.resetApp')}</Text>
                <Text style={styles.resetButtonSubtext}>
                  {t('settingsBottomSheet.resetAppDescription')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer Links */}
            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => { onClose(); router.push('/privacy-policy'); }}>
                <Text style={styles.footerLink}>{t('settingsBottomSheet.privacyPolicy')}</Text>
              </TouchableOpacity>
              <Text style={styles.footerSeparator}>・</Text>
              <TouchableOpacity onPress={() => { onClose(); router.push('/terms-of-service'); }}>
                <Text style={styles.footerLink}>{t('settingsBottomSheet.termsOfService')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>{t('settingsBottomSheet.version')} 1.0.0</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#D9D9D9',
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
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  usageStatsContainer: {
    backgroundColor: '#F8F8F8',
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
    color: '#666666',
    marginBottom: 2,
    lineHeight: 14,
  },
  statNumbers: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    lineHeight: 16,
  },
  resetRow: {
    alignItems: 'flex-start',
  },
  resetText: {
    fontSize: 12,
    color: '#666666',
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
    color: '#111111',
    marginBottom: 12,
  },
  upgradeButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#111111',
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
    backgroundColor: '#FFFFFF',
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
    color: '#111111',
  },
  aiSettingDescription: {
    fontSize: 13,
    color: '#666666',
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
    color: '#999999',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11,
    color: '#CCCCCC',
  },
  developerToolsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4444',
    marginBottom: 4,
  },
  resetButtonSubtext: {
    fontSize: 12,
    color: '#666666',
  },
});
