import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { Language } from '@/types/language';
import Svg, { Path } from 'react-native-svg';
import { useThemeColor } from '@/hooks/use-theme-color';

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

/**
 * 言語リストをグループ化して並び替え
 * 同じgroupIdを持つ言語は連続して表示、グループ間にセパレータを挿入
 */
function groupLanguages(languages: Language[]): Array<{ type: 'language'; language: Language } | { type: 'separator' }> {
  const result: Array<{ type: 'language'; language: Language } | { type: 'separator' }> = [];
  let lastGroupId: string | undefined | null = null;

  const grouped: Language[] = [];
  const withGroup: Language[] = [];
  const withoutGroup: Language[] = [];

  for (const lang of languages) {
    if (lang.groupId) {
      withGroup.push(lang);
    } else {
      withoutGroup.push(lang);
    }
  }

  const groupOrder: string[] = [];
  for (const lang of withGroup) {
    if (!groupOrder.includes(lang.groupId!)) {
      groupOrder.push(lang.groupId!);
    }
  }

  for (const gid of groupOrder) {
    grouped.push(...withGroup.filter(l => l.groupId === gid));
  }
  grouped.push(...withoutGroup);

  for (const lang of grouped) {
    const currentGroupId = lang.groupId || lang.id;

    if (lastGroupId !== null && currentGroupId !== lastGroupId) {
      result.push({ type: 'separator' });
    }

    result.push({ type: 'language', language: lang });
    lastGroupId = currentGroupId;
  }

  return result;
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

  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const placeholderColor = useThemeColor({}, 'textMuted');
  const iconMutedColor = useThemeColor({}, 'textTertiary');
  const borderColor = useThemeColor({}, 'separator');
  const modalBgColor = useThemeColor({}, 'modalBackground');
  const modalOverlayColor = useThemeColor({}, 'modalOverlay');
  const separatorColor = useThemeColor({}, 'separator');
  const selectedBgColor = useThemeColor({}, 'searchBackground');
  const accentColor = useThemeColor({}, 'successColor');

  const handleSelect = (language: Language) => {
    if (multiSelect) {
      setTempSelected(prev => {
        const isSelected = prev.some(lang => lang.id === language.id);
        if (isSelected) {
          return prev.length > 1 ? prev.filter(lang => lang.id !== language.id) : prev;
        }
        return [...prev, language];
      });
    } else {
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

  const groupedItems = groupLanguages(availableLanguages);

  return (
    <>
      <View>
        <TouchableOpacity style={[styles.container, { borderBottomColor: borderColor }]} onPress={handleOpen}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {multiSelect ? (
          <View style={styles.flagsContainer}>
            {selectedLanguages.length > 0 ? (
              selectedLanguages.map((lang) => (
                <Text key={lang.id} style={styles.flagMulti}>
                  {lang.flag}
                </Text>
              ))
            ) : (
              <Text style={[styles.placeholder, { color: placeholderColor }]}>選択してください</Text>
            )}
            <ChevronDownIcon size={18} color={iconMutedColor} />
          </View>
        ) : (
          <View style={styles.valueContainer}>
            {selectedLanguage ? (
              <>
                <Text style={[styles.value, { color: textSecondaryColor }]}>{selectedLanguage.name}</Text>
                <Text style={styles.flag}>{selectedLanguage.flag}</Text>
              </>
            ) : (
              <Text style={[styles.placeholder, { color: placeholderColor }]}>選択してください</Text>
            )}
            <ChevronDownIcon size={18} color={iconMutedColor} />
          </View>
        )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: modalOverlayColor }]}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[styles.menuContainer, { backgroundColor: modalBgColor }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{label}</Text>
              {multiSelect && (
                <TouchableOpacity onPress={handleDone}>
                  <Text style={[styles.doneButton, { color: accentColor }]}>完了</Text>
                </TouchableOpacity>
              )}
            </View>
            <View>
              {groupedItems.map((item, index) => {
                if (item.type === 'separator') {
                  return <View key={`sep-${index}`} style={[styles.separator, { backgroundColor: separatorColor }]} />;
                }

                const language = item.language;
                const isSelected = multiSelect
                  ? tempSelected.some((lang) => lang.id === language.id)
                  : selectedLanguage?.id === language.id;

                return (
                  <TouchableOpacity
                    key={language.id}
                    style={[styles.option, isSelected && { backgroundColor: selectedBgColor }]}
                    onPress={() => handleSelect(language)}
                  >
                    <Text style={styles.optionFlag}>{language.flag}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        { color: textColor },
                        isSelected && { fontWeight: '600', color: accentColor },
                      ]}
                    >
                      {language.name}
                    </Text>
                    {isSelected && <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
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
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
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
  },
  placeholder: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  menuContainer: {
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionFlag: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 4,
  },
});
