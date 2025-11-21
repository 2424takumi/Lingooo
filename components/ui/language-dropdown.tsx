import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { Language } from '@/types/language';
import Svg, { Path } from 'react-native-svg';

// 下矢印アイコン
function ChevronDownIcon({ size = 18, color = '#999999' }: { size?: number; color?: string }) {
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

interface LanguageDropdownProps {
  label: string;
  selectedLanguage?: Language;
  selectedLanguages?: Language[];
  availableLanguages: Language[];
  onSelect?: (language: Language) => void;
  onMultiSelect?: (languages: Language[]) => void;
  multiSelect?: boolean;
}

export function LanguageDropdown({
  label,
  selectedLanguage,
  selectedLanguages = [],
  availableLanguages,
  onSelect,
  onMultiSelect,
  multiSelect = false,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<Language[]>(selectedLanguages);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);

  const handleSelect = (language: Language) => {
    if (multiSelect) {
      // 複数選択モード
      const isSelected = tempSelected.some((lang) => lang.id === language.id);
      if (isSelected) {
        // 最低1つは残す
        if (tempSelected.length > 1) {
          setTempSelected(tempSelected.filter((lang) => lang.id !== language.id));
        }
      } else {
        setTempSelected([...tempSelected, language]);
      }
    } else {
      // 単一選択モード
      onSelect?.(language);
      setIsOpen(false);
    }
  };

  const handleDone = () => {
    if (multiSelect && onMultiSelect) {
      onMultiSelect(tempSelected);
    }
    setIsOpen(false);
  };

  const handleOpen = () => {
    if (multiSelect) {
      setTempSelected(selectedLanguages);
    }
    // トリガーの位置を測定
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPosition({
        top: y + height,
        left: x,
        width: width,
      });
      setIsOpen(true);
    });
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity style={styles.container} onPress={handleOpen}>
        <Text style={styles.label}>{label}</Text>
        {multiSelect ? (
          // 複数選択: 国旗のみを横並び
          <View style={styles.flagsContainer}>
            {selectedLanguages.length > 0 ? (
              selectedLanguages.map((lang) => (
                <Text key={lang.id} style={styles.flagMulti}>
                  {lang.flag}
                </Text>
              ))
            ) : (
              <Text style={styles.placeholder}>選択してください</Text>
            )}
            <ChevronDownIcon size={18} color="#999999" />
          </View>
        ) : (
          // 単一選択: 名前と国旗
          <View style={styles.valueContainer}>
            {selectedLanguage ? (
              <>
                <Text style={styles.value}>{selectedLanguage.name}</Text>
                <Text style={styles.flag}>{selectedLanguage.flag}</Text>
              </>
            ) : (
              <Text style={styles.placeholder}>選択してください</Text>
            )}
            <ChevronDownIcon size={18} color="#999999" />
          </View>
        )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              {
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            {multiSelect && (
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.doneButton}>完了</Text>
                </TouchableOpacity>
              </View>
            )}
            <ScrollView style={styles.scrollView} nestedScrollEnabled>
              {availableLanguages.map((language) => {
                const isSelected = multiSelect
                  ? tempSelected.some((lang) => lang.id === language.id)
                  : selectedLanguage?.id === language.id;

                return (
                  <TouchableOpacity
                    key={language.id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(language)}
                  >
                    <Text style={styles.optionFlag}>{language.flag}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {language.name}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  flagMulti: {
    fontSize: 24,
  },
  value: {
    fontSize: 15,
    color: '#666666',
  },
  placeholder: {
    fontSize: 15,
    color: '#AAAAAA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: screenHeight * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  scrollView: {
    maxHeight: screenHeight * 0.35,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: '#F5F5F5',
  },
  optionFlag: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 16,
    color: '#111111',
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
