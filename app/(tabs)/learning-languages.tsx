import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { AVAILABLE_LANGUAGES } from '@/types/language';

// Icons
function CheckIcon({ size = 24, color = '#00AA69' }: { size?: number; color?: string }) {
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

function PlusIcon({ size = 24, color = '#00AA69' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14m-7-7h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20, color = '#FF4444' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function LearningLanguagesScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const {
    learningLanguages,
    addLearningLanguage,
    removeLearningLanguage,
    isLearning,
  } = useLearningLanguages();

  const handleAddLanguage = async (languageId: string) => {
    await addLearningLanguage(languageId);
  };

  const handleRemoveLanguage = (languageId: string) => {
    if (learningLanguages.length <= 1) {
      Alert.alert('エラー', '最低1つの言語を学習中にする必要があります');
      return;
    }

    Alert.alert(
      '言語を削除',
      'この言語を学習中リストから削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await removeLearningLanguage(languageId);
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
            title="学習中の言語"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 説明 */}
          <Text style={styles.description}>
            学習中の言語を選択してください。ここで選択した言語が検索画面やホーム画面で切り替えられるようになります。
          </Text>

          {/* 学習中の言語 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>学習中の言語</Text>
            <View style={styles.languageList}>
              {learningLanguages.map((language) => (
                <View key={language.id} style={styles.learningLanguageItem}>
                  <View style={styles.languageInfo}>
                    <Text style={styles.flag}>{language.flag}</Text>
                    <Text style={styles.languageName}>{language.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveLanguage(language.id)}
                    style={styles.removeButton}
                  >
                    <TrashIcon size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* 言語を追加 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>言語を追加</Text>
            <View style={styles.languageList}>
              {AVAILABLE_LANGUAGES.filter((lang) => !isLearning(lang.id)).map((language) => (
                <TouchableOpacity
                  key={language.id}
                  style={styles.languageItem}
                  onPress={() => handleAddLanguage(language.id)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={styles.flag}>{language.flag}</Text>
                    <Text style={styles.languageName}>{language.name}</Text>
                  </View>
                  <PlusIcon size={24} color="#00AA69" />
                </TouchableOpacity>
              ))}
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
  description: {
    fontSize: 16,
    color: '#686868',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  languageList: {
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  learningLanguageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FBF7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00AA69',
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
  removeButton: {
    padding: 8,
  },
});
