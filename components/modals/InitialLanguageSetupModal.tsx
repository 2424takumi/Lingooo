import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { useState, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { LanguageDropdown } from '@/components/ui/language-dropdown';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

// デバイスのロケールを取得するヘルパー関数
function getDeviceLocale(): string {
  try {
    // Expo Localizationを使用してデバイスロケールを取得
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const primaryLocale = locales[0].languageCode;
      console.log('[InitialSetup] Device locale detected:', primaryLocale);
      return primaryLocale || 'en';
    }
  } catch (error) {
    console.warn('Failed to get device locale:', error);
  }
  return 'en';
}

interface InitialLanguageSetupModalProps {
  visible: boolean;
  onComplete: (nativeLanguage: string, learningLanguages: string[]) => void;
}

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

export function InitialLanguageSetupModal({ visible, onComplete }: InitialLanguageSetupModalProps) {
  const { t } = useTranslation();
  // Step 1 removed: Japanese-only optimization
  // const [step, setStep] = useState<1 | 2>(1);

  // 日本語に固定（Japanese-only optimization for initial release）
  const JAPANESE_LANGUAGE = AVAILABLE_LANGUAGES.find(lang => lang.code === 'ja')!;
  const [selectedNativeLanguage] = useState<Language>(JAPANESE_LANGUAGE);
  const [selectedLearningLanguages, setSelectedLearningLanguages] = useState<Language[]>([]);

  // 学習言語として選択可能な言語（日本語以外）
  const learningLanguageOptions = AVAILABLE_LANGUAGES.filter(
    (lang) => lang.id !== selectedNativeLanguage.id
  );

  const handleLearningLanguagesChange = (languages: Language[]) => {
    setSelectedLearningLanguages(languages);
  };

  const handleComplete = async () => {
    if (selectedLearningLanguages.length > 0) {
      const nativeLanguageId = selectedNativeLanguage.id;
      const learningLanguageIds = selectedLearningLanguages.map(lang => lang.id);

      // UIは日本語に固定（Japanese-only optimization）
      await i18n.changeLanguage('ja');

      onComplete(nativeLanguageId, learningLanguageIds);
    }
  };

  const canProceed = selectedLearningLanguages.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // 必須入力なのでモーダルは閉じられない
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          {/* タイトル */}
          <Text style={styles.modalTitle}>
            {t('initialSetup.step2Title')}
          </Text>

          {/* 説明 */}
          <Text style={styles.description}>
            {t('initialSetup.step2Description')}
          </Text>

          {/* 言語ドロップダウン（学習言語選択のみ） */}
          <View style={styles.dropdownContainer}>
            <LanguageDropdown
              label={t('initialSetup.learningLanguageLabel')}
              selectedLanguages={selectedLearningLanguages}
              availableLanguages={learningLanguageOptions}
              onMultiSelect={handleLearningLanguagesChange}
              multiSelect
            />
          </View>

          {/* 完了ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canProceed && styles.primaryButtonDisabled,
                styles.primaryButtonFull,
              ]}
              onPress={handleComplete}
              disabled={!canProceed}
            >
              <Text style={[styles.primaryButtonText, !canProceed && styles.primaryButtonTextDisabled]}>
                {t('common.complete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#111111',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  dropdownContainer: {
    marginBottom: 24,
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#686868',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonFull: {
    flex: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: '#999999',
  },
});
