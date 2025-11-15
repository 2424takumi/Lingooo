import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { AVAILABLE_LANGUAGES } from '@/types/language';
import { useTranslation } from 'react-i18next';

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

export default function NativeLanguageSelectScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const { nativeLanguage, setNativeLanguage } = useLearningLanguages();

  // 母国語として選択可能な言語（日本語、英語、ポルトガル語のみ）
  const nativeLanguageOptions = AVAILABLE_LANGUAGES.filter(
    (lang) => lang.id === 'japanese' || lang.id === 'english' || lang.id === 'portuguese'
  );

  const handleLanguageSelect = async (languageId: string) => {
    await setNativeLanguage(languageId);
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
            title={t('settings.nativeLanguage.title')}
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            {t('settings.nativeLanguage.description')}
          </Text>

          <View style={styles.languageList}>
            {nativeLanguageOptions.map((language) => (
              <TouchableOpacity
                key={language.id}
                style={[
                  styles.languageItem,
                  nativeLanguage.id === language.id && styles.selectedLanguageItem,
                ]}
                onPress={() => handleLanguageSelect(language.id)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <Text style={styles.languageName}>{language.name}</Text>
                </View>
                {nativeLanguage.id === language.id && (
                  <CheckIcon size={24} color="#111111" />
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
    color: '#686868',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  languageList: {
    gap: 8,
    marginBottom: 40,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLanguageItem: {
    borderColor: '#111111',
    backgroundColor: '#F8F8F8',
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
    color: '#000000',
  },
});
