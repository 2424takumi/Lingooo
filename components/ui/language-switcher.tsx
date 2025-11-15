/**
 * 言語切り替えドロップダウンコンポーネント
 * 学習中の言語のみを表示
 */

import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useState, useRef } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useThemeColor } from '@/hooks/use-theme-color';

function CaretDownIcon({ size = 18, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 20, color = '#111111' }: { size?: number; color?: string }) {
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

export function LanguageSwitcher() {
  const { learningLanguages, currentLanguage, setCurrentLanguage } = useLearningLanguages();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const buttonRef = useRef<View>(null);
  const textColor = useThemeColor({}, 'text');
  const dropdownBackground = useThemeColor({}, 'cardBackground');
  const accentColor = useThemeColor({}, 'primary');

  const handleLanguageSelect = async (languageId: string) => {
    await setCurrentLanguage(languageId);
    setDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      <View ref={buttonRef}>
        <TouchableOpacity
          onPress={() => setDropdownVisible(!dropdownVisible)}
          style={styles.languageButton}
        >
          <Text style={styles.flag}>{currentLanguage.flag}</Text>
          <CaretDownIcon size={18} color={textColor} />
        </TouchableOpacity>
      </View>

      {dropdownVisible && (
        <Modal
          visible={dropdownVisible}
          transparent
          animationType="none"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={[styles.dropdown, { backgroundColor: dropdownBackground }]}>
                {learningLanguages.map((language) => (
                  <TouchableOpacity
                    key={language.id}
                    style={[
                      styles.languageItem,
                      currentLanguage.id === language.id && { backgroundColor: '#E8E8E8' },
                    ]}
                    onPress={() => handleLanguageSelect(language.id)}
                  >
                    <View style={styles.languageInfo}>
                      <Text style={styles.languageFlag}>{language.flag}</Text>
                      <Text style={[styles.languageName, { color: textColor }]}>{language.name}</Text>
                    </View>
                    {currentLanguage.id === language.id && (
                      <CheckIcon size={20} color={accentColor} />
                    )}
                  </TouchableOpacity>
                ))}
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
    position: 'relative',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flag: {
    fontSize: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 110,
    right: 16,
  },
  dropdown: {
    borderRadius: 12,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    backgroundColor: 'transparent',
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
});
