import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';

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
  const pageBackground = useThemeColor({}, 'pageBackground');
  const { learningLanguages, defaultLanguage, nativeLanguage } = useLearningLanguages();
  const {
    aiDetailLevel,
    setAIDetailLevel,
  } = useAISettings();

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="設定"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* AI Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI設定</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>AI返答の詳細度</Text>
                <Text style={styles.settingDescription}>
                  {aiDetailLevel === 'concise' ? '簡潔（デフォルト）' : '詳細（語源・追加例文含む）'}
                </Text>
              </View>
              <Switch
                value={aiDetailLevel === 'detailed'}
                onValueChange={(value) => setAIDetailLevel(value ? 'detailed' : 'concise')}
                trackColor={{ false: '#D1D1D1', true: '#00AA69' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Learning Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>学習設定</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/native-language-select')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>母語</Text>
                <Text style={styles.settingDescription}>{nativeLanguage.name}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/language-select')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>デフォルト言語</Text>
                <Text style={styles.settingDescription}>{defaultLanguage.name}</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/learning-languages')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>学習中の言語</Text>
                <View style={styles.languagePreview}>
                  {learningLanguages.slice(0, 3).map((lang) => (
                    <Text key={lang.id} style={styles.languageFlag}>
                      {lang.flag}
                    </Text>
                  ))}
                  {learningLanguages.length > 3 && (
                    <Text style={styles.moreLanguages}>+{learningLanguages.length - 3}</Text>
                  )}
                </View>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </View>

          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アカウント</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>プロフィール</Text>
                <Text style={styles.settingDescription}>アカウント情報を管理</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/data-management')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>データ管理</Text>
                <Text style={styles.settingDescription}>学習データのバックアップと復元</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={[styles.section, styles.lastSection]}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/privacy-policy')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>プライバシーポリシー</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/terms-of-service')}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>利用規約</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>バージョン</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
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
    marginBottom: 20,
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
  languagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 4,
  },
  moreLanguages: {
    fontSize: 12,
    color: '#686868',
    fontWeight: '600',
  },
  versionText: {
    fontSize: 14,
    color: '#686868',
    fontWeight: '500',
  },
});
