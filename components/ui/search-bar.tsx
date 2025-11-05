import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, ScrollView } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { SearchIcon } from './icons';
import { LanguageTag } from './language-tag';
import { useLearningLanguages } from '@/contexts/learning-languages-context';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function SearchBar({
  placeholder = '知りたい単語を検索...',
  onSearch,
  value: externalValue,
  onChangeText: externalOnChangeText,
}: SearchBarProps) {
  const { learningLanguages, currentLanguage, setCurrentLanguage } = useLearningLanguages();
  const [internalValue, setInternalValue] = useState('');

  // 制御コンポーネントと非制御コンポーネントの両方に対応（最適化）
  const searchText = useMemo(
    () => externalValue !== undefined ? externalValue : internalValue,
    [externalValue, internalValue]
  );

  const setSearchText = useCallback(
    (text: string) => {
      if (externalOnChangeText) {
        externalOnChangeText(text);
      } else {
        setInternalValue(text);
      }
    },
    [externalOnChangeText]
  );

  const handleSearchPress = useCallback(() => {
    if (searchText.trim()) {
      Keyboard.dismiss();
      onSearch?.(searchText);
    }
  }, [searchText, onSearch]);

  const handleLanguageSelect = useCallback(async (languageId: string) => {
    await setCurrentLanguage(languageId);
  }, [setCurrentLanguage]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.languageTabList}
      >
        {learningLanguages.map((language) => (
          <LanguageTag
            key={language.id}
            label={language.name}
            selected={currentLanguage.id === language.id}
            onPress={() => handleLanguageSelect(language.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#ACACAC"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchPress}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
          <SearchIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5F3E8',
    borderRadius: 18,
    padding: 8,
    gap: 12,
    height: 102,
    justifyContent: 'space-between',
  },
  languageTabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  searchInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
    height: 18,
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#686868',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
