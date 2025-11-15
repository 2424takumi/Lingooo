import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { Language } from '@/types/language';
import { ChevronRightIcon } from './icons';

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
    setIsOpen(true);
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handleOpen}>
        <Text style={styles.label}>{label}</Text>
        {multiSelect ? (
          // 複数選択: 国旗のみを横並び
          <View style={styles.flagsContainer}>
            {selectedLanguages.map((lang) => (
              <Text key={lang.id} style={styles.flagMulti}>
                {lang.flag}
              </Text>
            ))}
            <ChevronRightIcon size={18} color="#999999" />
          </View>
        ) : (
          // 単一選択: 名前と国旗
          <View style={styles.valueContainer}>
            <Text style={styles.value}>{selectedLanguage?.name}</Text>
            <Text style={styles.flag}>{selectedLanguage?.flag}</Text>
            <ChevronRightIcon size={18} color="#999999" />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              {multiSelect && (
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.doneButton}>完了</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.scrollView}>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
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
    maxHeight: 400,
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
