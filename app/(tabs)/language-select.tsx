import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { AVAILABLE_LANGUAGES } from '@/types/language';

// Icons
function CheckIcon({ size = 24, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function LanguageSelectScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const cardBgColor = useThemeColor({}, 'cardBackgroundElevated');
  const cardBgSelectedColor = useThemeColor({}, 'cardBackground');
  const { defaultLanguage, setDefaultLanguage } = useLearningLanguages();

  const handleLanguageSelect = async (languageId: string) => {
    await setDefaultLanguage(languageId);
    // 少し遅延してから戻る
    setTimeout(() => {
      router.back();
    }, 200);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="よく勉強する言語"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: textSecondaryColor }]}>
            アプリ起動時に表示される言語を選択してください
          </Text>

          <View style={styles.languageList}>
            {AVAILABLE_LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.id}
                style={[
                  styles.languageItem,
                  { backgroundColor: cardBgColor },
                  defaultLanguage.id === language.id && [styles.selectedLanguageItem, { borderColor: primaryColor, backgroundColor: cardBgSelectedColor }],
                ]}
                onPress={() => handleLanguageSelect(language.id)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <Text style={[styles.languageName, { color: textColor }]}>{language.name}</Text>
                </View>
                {defaultLanguage.id === language.id && (
                  <CheckIcon size={24} color={primaryColor} />
                )}
              </TouchableOpacity>
            ))}
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
  description: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  languageList: {
    gap: 8,
    marginBottom: 40,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLanguageItem: {
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
});
