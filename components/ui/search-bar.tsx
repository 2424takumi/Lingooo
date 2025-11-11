import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, ScrollView, Pressable } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
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
  const inputRef = useRef<TextInput>(null);

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

  const handleContainerPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.languageTabContainer}>
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
      </View>
      <Pressable onPress={handleContainerPress} style={styles.searchInputContainer}>
        <TextInput
          ref={inputRef}
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
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DCF0E1',
    borderRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    height: 116,
  },
  languageTabContainer: {
    flexGrow: 0,
    flexShrink: 0,
    height: 32,
    marginBottom: 2,
    alignItems: 'center',
  },
  languageTabList: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 0,
  },
  searchInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 9,
    height: 52,
    marginTop: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
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
