import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, ScrollView, Text, Platform } from 'react-native';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { SearchIcon, ReloadIcon } from './icons';
import { LanguageTag } from './language-tag';
import { ImageUploadButton } from './image-upload-button';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getMaxTextLength } from '@/constants/validation';
import { isSentence } from '@/utils/text-detector';
import { logger } from '@/utils/logger';

const LINE_HEIGHT = 22;
const MAX_LINES = 10;
const INPUT_TOP_PADDING = 4;
const INPUT_BOTTOM_PADDING = 12;
const MIN_INPUT_HEIGHT = LINE_HEIGHT * 5 + INPUT_TOP_PADDING + INPUT_BOTTOM_PADDING;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_LINES + INPUT_TOP_PADDING + INPUT_BOTTOM_PADDING;

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
  onTextLengthError?: () => void;
  onImageSelected?: (result: { uri: string; mimeType: string; fileName?: string }) => void;
  onImageError?: (error: string) => void;
}

export function SearchBar({
  placeholder = '知りたい言葉や文章を入力...',
  onSearch,
  value: externalValue,
  onChangeText: externalOnChangeText,
  autoFocus = false,
  onTextLengthError,
  onImageSelected,
  onImageError,
}: SearchBarProps) {
  const { learningLanguages, currentLanguage, defaultLanguage, setCurrentLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const { needsInitialSetup } = useAuth();
  const router = useRouter();
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
  const hasInitialized = useRef(false);

  // デフォルト言語が設定されたらcurrentLanguageを初期化（初回のみ）
  useEffect(() => {
    if (!hasInitialized.current && defaultLanguage && defaultLanguage.id) {
      // 初期化フラグを先にセットして、他の更新を防ぐ
      hasInitialized.current = true;

      // currentLanguageがデフォルトと異なる場合のみ更新
      if (currentLanguage.id !== defaultLanguage.id) {
        setCurrentLanguage(defaultLanguage.id);
        logger.info('[SearchBar] Initialized with default language:', defaultLanguage.id);
      } else {
        logger.info('[SearchBar] Already on default language:', defaultLanguage.id);
      }
    }
  }, [defaultLanguage, defaultLanguage.id, currentLanguage.id, setCurrentLanguage]);

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
      // まず状態を更新（文字数カウンター表示のため）
      if (externalOnChangeText) {
        externalOnChangeText(text);
      } else {
        setInternalValue(text);
      }

      // 文字数制限チェック（文章の場合のみ）
      const isTranslation = isSentence(text);
      if (isTranslation && text.length > maxLength && !needsInitialSetup) {
        onTextLengthError?.();
      }
    },
    [externalOnChangeText, maxLength, needsInitialSetup, onTextLengthError]
  );

  const handleSearchPress = useCallback(() => {
    const trimmedText = searchText.trim();
    if (!trimmedText) return;

    // 文字数制限チェック（文章の場合のみ）
    const isTranslation = isSentence(trimmedText);
    if (isTranslation && trimmedText.length > maxLength) {
      // 初期設定中はアラートを表示しない
      if (!needsInitialSetup) {
        onTextLengthError?.();
      }
      return; // 検索を中止
    }

    Keyboard.dismiss();
    onSearch?.(trimmedText);
  }, [searchText, onSearch, maxLength, needsInitialSetup, onTextLengthError]);

  const handleLanguageSelect = useCallback(async (languageId: string) => {
    await setCurrentLanguage(languageId);
  }, [setCurrentLanguage]);

  // shrink back to single line when text cleared
  useEffect(() => {
    if (!searchText) {
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [searchText]);

  // Auto focus on mount if autoFocus is enabled
  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

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

          {/* 画像アップロードボタン */}
          {onImageSelected && onImageError && (
            <ImageUploadButton
              onImageSelected={onImageSelected}
              onError={onImageError}
            />
          )}

          {/* 検索ボタン */}
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
    height: 28,
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
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
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
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
