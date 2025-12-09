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
  const [step, setStep] = useState<1 | 2>(1);

  // 端末のデフォルト言語を取得（日英葡のみ対応、それ以外は英語）
  const defaultNativeLanguage = useMemo(() => {
    const deviceLocale = getDeviceLocale();
    const supportedCodes = ['ja', 'en', 'pt'];
    const matchedCode = supportedCodes.includes(deviceLocale) ? deviceLocale : 'en';
    return AVAILABLE_LANGUAGES.find(lang => lang.code === matchedCode)!;
  }, []);

  const [selectedNativeLanguage, setSelectedNativeLanguage] = useState<Language | null>(defaultNativeLanguage);
  const [selectedLearningLanguages, setSelectedLearningLanguages] = useState<Language[]>([]);

  // 母国語として選択可能な言語（日本語、英語、ポルトガル語のみ）
  const nativeLanguageOptions = AVAILABLE_LANGUAGES.filter(
    (lang) => lang.code === 'ja' || lang.code === 'en' || lang.code === 'pt'
  );

  // 学習言語として選択可能な言語（母国語以外）
  const learningLanguageOptions = AVAILABLE_LANGUAGES.filter(
    (lang) => lang.id !== selectedNativeLanguage?.id
  );

  const handleNativeLanguageSelect = async (language: Language) => {
    setSelectedNativeLanguage(language);
    // UIの言語を即座に切り替え（UX向上）
    await i18n.changeLanguage(language.code);
  };

  const handleLearningLanguagesChange = (languages: Language[]) => {
    setSelectedLearningLanguages(languages);
  };

  const handleNext = () => {
    if (step === 1 && selectedNativeLanguage) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleComplete = async () => {
    if (selectedNativeLanguage && selectedLearningLanguages.length > 0) {
      const nativeLanguageId = selectedNativeLanguage.id;
      const learningLanguageIds = selectedLearningLanguages.map(lang => lang.id);

      // UIの言語を即座に切り替え
      await i18n.changeLanguage(selectedNativeLanguage.code);

      onComplete(nativeLanguageId, learningLanguageIds);
    }
  };

  const canProceed = step === 1 ? selectedNativeLanguage !== null : selectedLearningLanguages.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // 必須入力なのでモーダルは閉じられない
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          {/* ステップインジケーター */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>

          {/* タイトル */}
          <Text style={styles.modalTitle}>
            {step === 1 ? t('initialSetup.step1Title') : t('initialSetup.step2Title')}
          </Text>

          {/* 説明 */}
          <Text style={styles.description}>
            {step === 1
              ? t('initialSetup.step1Description')
              : t('initialSetup.step2Description')}
          </Text>

          {/* 言語ドロップダウン */}
          <View style={styles.dropdownContainer}>
            {step === 1 ? (
              // ステップ1: 母国語選択
              <LanguageDropdown
                label={t('initialSetup.nativeLanguageLabel')}
                selectedLanguage={selectedNativeLanguage ?? undefined}
                availableLanguages={nativeLanguageOptions}
                onSelect={handleNativeLanguageSelect}
              />
            ) : (
              // ステップ2: 学習言語選択（複数選択）
              <LanguageDropdown
                label={t('initialSetup.learningLanguageLabel')}
                selectedLanguages={selectedLearningLanguages}
                availableLanguages={learningLanguageOptions}
                onMultiSelect={handleLearningLanguagesChange}
                multiSelect
              />
            )}
          </View>

          {/* ボタン */}
          <View style={styles.buttonContainer}>
            {step === 2 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
              >
                <Text style={styles.backButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canProceed && styles.primaryButtonDisabled,
                step === 2 && styles.primaryButtonFull,
              ]}
              onPress={step === 1 ? handleNext : handleComplete}
              disabled={!canProceed}
            >
              <Text style={[styles.primaryButtonText, !canProceed && styles.primaryButtonTextDisabled]}>
                {step === 1 ? t('common.next') : t('common.complete')}
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
