/**
 * 翻訳ページ用の言語ペア選択コンポーネント
 *
 * ソース言語・ターゲット言語の両方をタップで変更可能。
 * ソース側: 全9言語（AVAILABLE_LANGUAGES）
 * ターゲット側: 学習中の言語（learningLanguages）
 */

import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AVAILABLE_LANGUAGES, findLanguageByCode } from '@/types/language';
import { Shimmer } from './shimmer';

function ChevronDownIcon({ size = 20, color = '#686868' }: { size?: number; color?: string }) {
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

function getLanguageInfo(code: string) {
  return findLanguageByCode(code);
}

export function LanguagePairSelector({
  sourceLang,
  targetLang,
  isDetectingLanguage = false,
  onSourceLangChange,
  onTargetLangChange,
}: LanguagePairSelectorProps) {
  const [activeDropdown, setActiveDropdown] = useState<'source' | 'target' | null>(null);
  const { learningLanguages } = useLearningLanguages();
  const dropdownBackground = useThemeColor({}, 'cardBackground');
  const accentColor = useThemeColor({}, 'primary');

  const sourceInfo = getLanguageInfo(sourceLang);
  const targetInfo = getLanguageInfo(targetLang);

  const handleSelect = (langCode: string) => {
    onTargetLangChange(langCode);
    setActiveDropdown(null);
  };

  const dropdownItems = learningLanguages.map(ll => AVAILABLE_LANGUAGES.find(al => al.code === ll.code || al.id === ll.id)).filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Source language (display only) */}
      {isDetectingLanguage ? (
        <Shimmer width={90} height={22} borderRadius={4} />
      ) : (
        <View style={styles.langButton}>
          <Text style={styles.flag}>{sourceInfo?.flag}</Text>
          <Text style={styles.langName} numberOfLines={1}>{sourceInfo?.name}</Text>
        </View>
      )}

      <Text style={styles.arrow}>{'→'}</Text>

      {/* Target language button */}
      <TouchableOpacity
        style={styles.langButton}
        onPress={() => setActiveDropdown('target')}
      >
        <Text style={styles.flag}>{targetInfo?.flag}</Text>
        <Text style={styles.langName} numberOfLines={1}>{targetInfo?.name}</Text>
        <ChevronDownIcon size={20} color="#686868" />
      </TouchableOpacity>

      {/* Dropdown modal */}
      {activeDropdown && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setActiveDropdown(null)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setActiveDropdown(null)}
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
                        isSelected && { backgroundColor: '#E8E8E8' },
                      ]}
                      onPress={() => handleSelect(lang.code)}
                    >
                      <View style={styles.languageInfo}>
                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                        <Text style={styles.languageName}>{lang.name}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  flag: {
    fontSize: 18,
  },
  langName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    maxWidth: 120,
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
    color: '#000000',
  },
  caret: {
    fontSize: 16,
    color: '#686868',
    marginTop: 1,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '300',
    color: '#686868',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '600',
  },
});
