/**
 * 翻訳ページ用の翻訳先言語選択ボタン
 *
 * 「英語へ翻訳 ∨」のようなボタンを表示。
 * タップでドロップダウンから翻訳先言語を変更可能。
 */

import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AVAILABLE_LANGUAGES, findLanguageByCode } from '@/types/language';
import { LANGUAGE_NAME_MAP } from '@/constants/languages';

function ChevronDownIcon({ size = 16, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface LanguagePairSelectorProps {
  sourceLang: string;
  targetLang: string;
  isDetectingLanguage?: boolean;
  onSourceLangChange: (langCode: string) => void;
  onTargetLangChange: (langCode: string) => void;
}

export function LanguagePairSelector({
  sourceLang,
  targetLang,
  isDetectingLanguage = false,
  onSourceLangChange,
  onTargetLangChange,
}: LanguagePairSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { learningLanguages } = useLearningLanguages();
  const dropdownBackground = useThemeColor({}, 'cardBackgroundElevated');
  const accentColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const secondaryColor = useThemeColor({}, 'textSecondary');
  const selectedItemBg = useThemeColor({}, 'segmentedBackground');
  const buttonBg = useThemeColor({}, 'cardBackground');

  // ターゲット言語のベースコード（en-US → en）
  const baseTargetCode = targetLang.split('-')[0];
  const targetDisplayName = LANGUAGE_NAME_MAP[baseTargetCode] || findLanguageByCode(targetLang)?.name || targetLang;

  const handleSelect = (langCode: string) => {
    onTargetLangChange(langCode);
    setIsOpen(false);
  };

  const dropdownItems = learningLanguages
    .map(ll => AVAILABLE_LANGUAGES.find(al => al.code === ll.code || al.id === ll.id))
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {/* 「○○語へ翻訳 ∨」ボタン */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: buttonBg }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>
          {targetDisplayName}へ翻訳
        </Text>
        <ChevronDownIcon size={16} color={secondaryColor} />
      </TouchableOpacity>

      {/* Dropdown modal */}
      {isOpen && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={[styles.dropdown, { backgroundColor: dropdownBackground }]}>
                {dropdownItems.map((lang) => {
                  if (!lang) return null;
                  const isSelected = lang.code === targetLang;
                  return (
                    <TouchableOpacity
                      key={lang.id}
                      style={[
                        styles.languageItem,
                        isSelected && { backgroundColor: selectedItemBg },
                      ]}
                      onPress={() => handleSelect(lang.code)}
                    >
                      <View style={styles.languageInfo}>
                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                        <Text style={[styles.languageName, { color: textColor }]}>{lang.name}</Text>
                      </View>
                      {isSelected && <Text style={[styles.checkMark, { color: accentColor }]}>{'✓'}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dropdown: {
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '600',
  },
});
