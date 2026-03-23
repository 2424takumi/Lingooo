import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { LanguageDropdown } from '@/components/ui/language-dropdown';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

// デバイスのロケールを取得するヘルパー関数
function getDeviceLocale(): string {
  try {
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
  onComplete: (nativeLanguage: string, learningLanguages: string[], defaultLanguage: string) => void;
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

  // 日本語に固定（Japanese-only optimization for initial release）
  const JAPANESE_LANGUAGE = AVAILABLE_LANGUAGES.find(lang => lang.code === 'ja')!;
  const [selectedNativeLanguage] = useState<Language>(JAPANESE_LANGUAGE);
  const [selectedLearningLanguages, setSelectedLearningLanguages] = useState<Language[]>([]);
  const [selectedDefaultLanguage, setSelectedDefaultLanguage] = useState<Language | null>(null);

  // 学習言語として選択可能な言語（日本語以外）
  const learningLanguageOptions = AVAILABLE_LANGUAGES.filter(
    (lang) => lang.id !== selectedNativeLanguage.id
  );

  const handleLearningLanguagesChange = (languages: Language[]) => {
    setSelectedLearningLanguages(languages);
    // デフォルト言語が選択解除されたらリセット
    if (selectedDefaultLanguage && !languages.find(l => l.id === selectedDefaultLanguage.id)) {
      setSelectedDefaultLanguage(null);
    }
  };

  const handleNextStep = () => {
    if (selectedLearningLanguages.length === 1) {
      // 1言語のみの場合はステップ2をスキップして完了
      handleCompleteWithDefault(selectedLearningLanguages[0]);
    } else {
      setStep(2);
    }
  };

  const handleCompleteWithDefault = async (defaultLang: Language) => {
    const nativeLanguageId = selectedNativeLanguage.id;
    const learningLanguageIds = selectedLearningLanguages.map(lang => lang.id);

    // UIは日本語に固定
    await i18n.changeLanguage('ja');

    onComplete(nativeLanguageId, learningLanguageIds, defaultLang.id);
  };

  const handleComplete = async () => {
    if (selectedDefaultLanguage) {
      handleCompleteWithDefault(selectedDefaultLanguage);
    }
  };

  const canProceedStep1 = selectedLearningLanguages.length > 0;
  const canProceedStep2 = selectedDefaultLanguage !== null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          {/* ステップインジケーター（2言語以上選択時のみ） */}
          {step === 2 && (
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotCompleted]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
            </View>
          )}

          {step === 1 ? (
            <>
              {/* Step 1: 学習言語選択 */}
              <Text style={styles.modalTitle}>
                {t('initialSetup.step2Title')}
              </Text>
              <Text style={styles.description}>
                {t('initialSetup.step2Description')}
              </Text>
              <View style={styles.dropdownContainer}>
                <LanguageDropdown
                  label={t('initialSetup.learningLanguageLabel')}
                  selectedLanguages={selectedLearningLanguages}
                  availableLanguages={learningLanguageOptions}
                  onMultiSelect={handleLearningLanguagesChange}
                  multiSelect
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    !canProceedStep1 && styles.primaryButtonDisabled,
                    styles.primaryButtonFull,
                  ]}
                  onPress={handleNextStep}
                  disabled={!canProceedStep1}
                >
                  <Text style={[styles.primaryButtonText, !canProceedStep1 && styles.primaryButtonTextDisabled]}>
                    {selectedLearningLanguages.length <= 1 ? t('common.complete') : t('common.next')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Step 2: よく勉強する言語選択 */}
              <Text style={styles.modalTitle}>
                {t('settings.defaultLanguage.title')}
              </Text>
              <Text style={styles.description}>
                {t('settings.defaultLanguage.description')}
              </Text>
              <View style={styles.defaultLanguageList}>
                {selectedLearningLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.defaultLanguageItem,
                      selectedDefaultLanguage?.id === lang.id && styles.defaultLanguageItemSelected,
                    ]}
                    onPress={() => setSelectedDefaultLanguage(lang)}
                  >
                    <Text style={styles.defaultLanguageFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.defaultLanguageText,
                      selectedDefaultLanguage?.id === lang.id && styles.defaultLanguageTextSelected,
                    ]}>
                      {lang.name}
                    </Text>
                    {selectedDefaultLanguage?.id === lang.id && (
                      <CheckIcon size={20} color="#111111" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    !canProceedStep2 && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleComplete}
                  disabled={!canProceedStep2}
                >
                  <Text style={[styles.primaryButtonText, !canProceedStep2 && styles.primaryButtonTextDisabled]}>
                    {t('common.complete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    shadowOffset: { width: 0, height: 8 },
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
  stepDotCompleted: {
    backgroundColor: '#00AA69',
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
  defaultLanguageList: {
    marginBottom: 24,
    gap: 8,
  },
  defaultLanguageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  defaultLanguageItemSelected: {
    backgroundColor: '#F0FFF8',
    borderWidth: 1.5,
    borderColor: '#00AA69',
  },
  defaultLanguageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  defaultLanguageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  defaultLanguageTextSelected: {
    fontWeight: '600',
    color: '#111111',
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
