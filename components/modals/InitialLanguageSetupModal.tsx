import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { LanguageDropdown } from '@/components/ui/language-dropdown';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const overlayColor = useThemeColor({}, 'modalOverlay');
  const modalBg = useThemeColor({}, 'modalBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const buttonGrayColor = useThemeColor({}, 'buttonGray');
  const buttonDisabledColor = useThemeColor({}, 'buttonDisabled');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderLightColor = useThemeColor({}, 'borderLight');
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
      <View style={[styles.modalOverlay, { backgroundColor: overlayColor }]}>
        <View style={[styles.modalContainer, { backgroundColor: modalBg }]} onStartShouldSetResponder={() => true}>
          {/* ステップインジケーター（2言語以上選択時のみ） */}
          {step === 2 && (
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotCompleted, { backgroundColor: accentColor }]} />
              <View style={[styles.stepLine, { backgroundColor: borderLightColor }]} />
              <View style={[styles.stepDot, styles.stepDotActive, { backgroundColor: primaryColor }]} />
            </View>
          )}

          {step === 1 ? (
            <>
              {/* Step 1: 学習言語選択 */}
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('initialSetup.step2Title')}
              </Text>
              <Text style={[styles.description, { color: textSecondaryColor }]}>
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
                    { backgroundColor: primaryColor },
                    !canProceedStep1 && [styles.primaryButtonDisabled, { backgroundColor: buttonDisabledColor }],
                    styles.primaryButtonFull,
                  ]}
                  onPress={handleNextStep}
                  disabled={!canProceedStep1}
                >
                  <Text style={[styles.primaryButtonText, !canProceedStep1 && [styles.primaryButtonTextDisabled, { color: textTertiaryColor }]]}>
                    {selectedLearningLanguages.length <= 1 ? t('common.complete') : t('common.next')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Step 2: よく勉強する言語選択 */}
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('settings.defaultLanguage.title')}
              </Text>
              <Text style={[styles.description, { color: textSecondaryColor }]}>
                {t('settings.defaultLanguage.description')}
              </Text>
              <View style={styles.defaultLanguageList}>
                {selectedLearningLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.defaultLanguageItem,
                      { backgroundColor: cardBg },
                      selectedDefaultLanguage?.id === lang.id && styles.defaultLanguageItemSelected,
                    ]}
                    onPress={() => setSelectedDefaultLanguage(lang)}
                  >
                    <Text style={styles.defaultLanguageFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.defaultLanguageText,
                      { color: textColor },
                      selectedDefaultLanguage?.id === lang.id && [styles.defaultLanguageTextSelected, { color: textColor }],
                    ]}>
                      {lang.name}
                    </Text>
                    {selectedDefaultLanguage?.id === lang.id && (
                      <CheckIcon size={20} color={textColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.backButton, { backgroundColor: buttonGrayColor }]}
                  onPress={() => setStep(1)}
                >
                  <Text style={[styles.backButtonText, { color: textSecondaryColor }]}>{t('common.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                    !canProceedStep2 && [styles.primaryButtonDisabled, { backgroundColor: buttonDisabledColor }],
                  ]}
                  onPress={handleComplete}
                  disabled={!canProceedStep2}
                >
                  <Text style={[styles.primaryButtonText, !canProceedStep2 && [styles.primaryButtonTextDisabled, { color: textTertiaryColor }]]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
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
  },
  stepDotActive: {
  },
  stepDotCompleted: {
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
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
    flex: 1,
  },
  defaultLanguageTextSelected: {
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonFull: {
    flex: 2,
  },
  primaryButtonDisabled: {
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
  },
});
