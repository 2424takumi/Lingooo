import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, Switch, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SettingsIcon, TokenIcon, LanguageIcon, ChevronRightIcon, CloseIcon, MessageCircleIcon } from './icons';
import { CircularProgress } from './circular-progress';
import { LanguageDropdown } from './language-dropdown';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useQuestionCount } from '@/hooks/use-question-count';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';

interface SettingsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsBottomSheet({ visible, onClose }: SettingsBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const pageBackground = useThemeColor({}, 'pageBackground');
  const text = useThemeColor({}, 'text');
  const [tokenUsage, setTokenUsage] = useState({ used: 12500, total: 50000 });
  // Supabaseから質問回数とプランを取得
  const { questionCount, plan } = useQuestionCount();
  const {
    nativeLanguage,
    defaultLanguage,
    learningLanguages,
    setNativeLanguage,
    setDefaultLanguage,
    addLearningLanguage,
    removeLearningLanguage,
  } = useLearningLanguages();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();

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

  // TODO: 実際のトークン使用量を取得する処理を実装
  useEffect(() => {
    if (visible) {
      // ここでAPIから取得
      // const fetchTokenUsage = async () => {
      //   const data = await api.getTokenUsage();
      //   setTokenUsage(data);
      //   setPlan(data.plan);
      // };
    }
  }, [visible]);

  const tokenPercentage = (tokenUsage.used / tokenUsage.total) * 100;
  const questionPercentage = (questionCount.monthly / questionCount.limit) * 100;

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
            <Text style={[styles.headerTitle, { color: text }]}>設定</Text>
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
              <Text style={styles.userName}>ユーザー名</Text>
              <View style={[
                styles.planBadge,
                { backgroundColor: plan === 'free' ? '#F8F8F8' : '#4CAF50' }
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  { color: plan === 'free' ? '#666666' : '#FFFFFF' }
                ]}>
                  {plan === 'free' ? '無料プラン' : 'プラスプラン'}
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
                  <Text style={styles.statLabel}>トークン</Text>
                  <Text style={styles.statNumbers}>
                    {tokenUsage.used.toLocaleString()} / {tokenUsage.total.toLocaleString()}
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
                  <Text style={styles.statLabel}>質問回数</Text>
                  <Text style={styles.statNumbers}>
                    {questionCount.monthly} / {questionCount.limit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Second Row: Reset Days */}
            <View style={styles.resetRow}>
              <Text style={styles.resetText}>あと{daysUntilReset}日でリセット</Text>
            </View>
          </View>

          {/* Upgrade Button */}
          {plan === 'free' && (
            <View style={styles.upgradeButtonContainer}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  onClose();
                  // TODO: プラン変更画面に遷移
                  // router.push('/upgrade');
                }}
              >
                <Text style={styles.upgradeButtonText}>7日間無料でプラスプランを試す</Text>
                <Text style={styles.upgradeButtonSubtext}>
                  その後、月500円で月間1000万トークン・1日100回質問可能
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Language Settings */}
            <View style={styles.languageSettingsContainer}>
              <Text style={styles.sectionTitle}>言語設定</Text>
              <LanguageDropdown
                label="母国語"
                selectedLanguage={nativeLanguage}
                availableLanguages={AVAILABLE_LANGUAGES}
                onSelect={(lang) => setNativeLanguage(lang.id)}
              />
              <LanguageDropdown
                label="デフォルト言語"
                selectedLanguage={defaultLanguage}
                availableLanguages={AVAILABLE_LANGUAGES}
                onSelect={(lang) => setDefaultLanguage(lang.id)}
              />
              <LanguageDropdown
                label="学習中の言語"
                selectedLanguages={learningLanguages}
                availableLanguages={AVAILABLE_LANGUAGES}
                onMultiSelect={handleLearningLanguagesChange}
                multiSelect
              />
            </View>

            {/* AI Settings */}
            <View style={styles.aiSettingsContainer}>
              <Text style={styles.sectionTitle}>AI設定</Text>
              <View style={styles.aiSettingItem}>
                <View style={styles.aiSettingInfo}>
                  <Text style={styles.aiSettingLabel}>AI返答の詳細度</Text>
                  <Text style={styles.aiSettingDescription}>
                    {aiDetailLevel === 'concise' ? '簡潔（デフォルト）' : '詳細（語源・追加例文含む）'}
                  </Text>
                </View>
                <Switch
                  value={aiDetailLevel === 'detailed'}
                  onValueChange={(value) => setAIDetailLevel(value ? 'detailed' : 'concise')}
                  trackColor={{ false: '#D1D1D1', true: '#111111' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Footer Links */}
            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => { onClose(); router.push('/privacy-policy'); }}>
                <Text style={styles.footerLink}>プライバシーポリシー</Text>
              </TouchableOpacity>
              <Text style={styles.footerSeparator}>・</Text>
              <TouchableOpacity onPress={() => { onClose(); router.push('/terms-of-service'); }}>
                <Text style={styles.footerLink}>利用規約</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
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
  aiSettingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 4,
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
});
