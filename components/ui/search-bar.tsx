import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, ScrollView, Text, Alert } from 'react-native';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { SearchIcon, MicIcon, ReloadIcon } from './icons';
import { LanguageTag } from './language-tag';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getMaxTextLength } from '@/constants/validation';
import { isSentence } from '@/utils/text-detector';
import { useVoiceInput } from '@/hooks/use-voice-input';

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
  const { isPremium } = useSubscription();
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

  // プランに応じた文字数制限
  const maxLength = useMemo(() => getMaxTextLength(isPremium), [isPremium]);

  // 制御コンポーネントと非制御コンポーネントの両方に対応（最適化）
  const searchText = useMemo(
    () => externalValue !== undefined ? externalValue : internalValue,
    [externalValue, internalValue]
  );

  // 文章かどうかを判定（文章の場合のみ文字数を表示）
  const isTranslationMode = useMemo(
    () => isSentence(searchText),
    [searchText]
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

  // 音声入力
  const { state: voiceState, transcript, isSupported, startListening, stopListening } = useVoiceInput({
    onResult: (text) => {
      setSearchText(text);
    },
    onError: (error) => {
      Alert.alert('音声認識エラー', error);
    },
  });

  const handleMicPress = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // 音声認識中は一時的な文字列を表示
  useEffect(() => {
    if (voiceState === 'listening' && transcript) {
      // 一時的な表示のみ(確定はonResultで行う)
    }
  }, [voiceState, transcript]);

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
            maxLength={maxLength}
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
          {/* 翻訳モード表示 */}
          {isTranslationMode && (
            <View style={styles.translationModeChip}>
              <ReloadIcon size={16} color="#007AFF" />
              <Text style={styles.translationModeText}>翻訳モード</Text>
            </View>
          )}

          {/* 翻訳モード時のみ文字数カウント表示 */}
          {isTranslationMode && (
            <Text
              style={[
                styles.charCounter,
                searchText.length >= maxLength && styles.charCounterLimit,
              ]}
            >
              {searchText.length.toLocaleString()} / {maxLength.toLocaleString()}
              {!isPremium && ' 文字'}
            </Text>
          )}

          {/* マイクボタン (UI確認用に常に表示) */}
          <TouchableOpacity
            style={styles.micButton}
            onPress={handleMicPress}
          >
            <MicIcon
              size={20}
              color={voiceState === 'listening' ? '#FF4444' : '#666666'}
            />
          </TouchableOpacity>

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
    gap: 8,
  },
  translationModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingLeft: 13,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 25,
    gap: 6,
    marginRight: 'auto',
  },
  translationModeText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  closeButton: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: 12,
    color: '#686868',
  },
  charCounterLimit: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  micButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
