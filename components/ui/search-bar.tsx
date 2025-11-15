import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, ScrollView } from 'react-native';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { SearchIcon } from './icons';
import { LanguageTag } from './language-tag';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useThemeColor } from '@/hooks/use-theme-color';

const LINE_HEIGHT = 22;
const MAX_LINES = 5;
const INPUT_TOP_PADDING = 4;
const INPUT_BOTTOM_PADDING = 9;
const MIN_INPUT_HEIGHT = LINE_HEIGHT + INPUT_TOP_PADDING + INPUT_BOTTOM_PADDING;
const MAX_INPUT_HEIGHT = MIN_INPUT_HEIGHT + LINE_HEIGHT * (MAX_LINES - 1);

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function SearchBar({
  placeholder = '知りたい言葉や文章を入力...',
  onSearch,
  value: externalValue,
  onChangeText: externalOnChangeText,
}: SearchBarProps) {
  const { learningLanguages, currentLanguage, setCurrentLanguage } = useLearningLanguages();
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const containerBackground = useThemeColor({}, 'surfaceBackground');
  const shellBackground = useThemeColor({}, 'cardBackground');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'textPlaceholder');
  const textColor = useThemeColor({}, 'text');
  const buttonBackground = useThemeColor({}, 'buttonGray');
  const buttonIconColor = useThemeColor({}, 'buttonText');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

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

  // shrink back to single line when text cleared
  useEffect(() => {
    if (!searchText) {
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [searchText]);

  return (
    <View style={[styles.container, { backgroundColor: containerBackground }]}>
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
      <View style={[styles.searchInputContainer, { backgroundColor: inputBackground }]}>
        <View style={[styles.inputArea, { minHeight: inputHeight }]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: textColor,
                lineHeight: LINE_HEIGHT,
                paddingTop: INPUT_TOP_PADDING,
                paddingBottom: INPUT_BOTTOM_PADDING,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchPress}
            multiline
            scrollEnabled={true}
            textAlignVertical="top"
            onContentSizeChange={(e) => {
              const contentHeight = e.nativeEvent.contentSize.height + INPUT_TOP_PADDING + INPUT_BOTTOM_PADDING;
              const nextHeight = Math.min(
                Math.max(contentHeight, MIN_INPUT_HEIGHT),
                MAX_INPUT_HEIGHT
              );
              setInputHeight(nextHeight);
            }}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
        </View>
        <View style={styles.actionArea}>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: buttonBackground }]}
            onPress={handleSearchPress}
          >
            <SearchIcon size={20} color={buttonIconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 18,
    padding: 8,
  },
  languageTabContainer: {
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  languageTabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexGrow: 1,
  },
  searchInputContainer: {
    borderRadius: 14,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  inputArea: {
    width: '100%',
    flex: 0,
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  input: {
    width: '100%',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 1,
    backgroundColor: 'transparent',
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  actionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 10,
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
