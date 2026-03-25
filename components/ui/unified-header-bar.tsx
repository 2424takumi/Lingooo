import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { PosTag } from './pos-tag';
import { LanguageSwitcher } from './language-switcher';
import { LanguagePairSelector } from './language-pair-selector';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES } from '@/types/language';
import { Shimmer } from './shimmer';
import { useThemeColor } from '@/hooks/use-theme-color';

// Icons
function ChevronLeftIcon({ size = 28, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

function VolumeIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkIcon({ size = 22, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <Path
        d="M11 15L6 11L1 15V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H9C9.53043 1 10.0391 1.21071 10.4142 1.58579C10.7893 1.96086 11 2.46957 11 3V15Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessagePlusIcon({ size = 22, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 11V9M9 9V7M9 9H7M9 9H11M9.00012 17C7.65126 17 6.34577 16.6252 5.2344 15.9766C5.12472 15.9133 5.06981 15.8816 5.01852 15.8676C4.97113 15.8547 4.92935 15.8502 4.88013 15.8536C4.82732 15.8573 4.77252 15.8755 4.66363 15.9117L2.72156 16.5611L2.71989 16.5619C2.30818 16.6983 2.1019 16.7665 1.96568 16.7188C1.84759 16.6776 1.75398 16.5838 1.70777 16.4657C1.65477 16.3294 1.72412 16.1239 1.86282 15.7128L1.8637 15.7102L2.51346 13.7695L2.51513 13.765C2.55142 13.657 2.5698 13.6023 2.57474 13.5497C2.57945 13.5008 2.57501 13.4587 2.56252 13.4113C2.54917 13.3607 2.51827 13.307 2.45705 13.2004L2.45434 13.1962C1.80571 12.0849 1.43 10.8239 1.43 9.5C1.43 5.35751 4.76365 2 9 2C13.2363 2 16.57 5.35751 16.57 9.5C16.57 13.6425 13.2365 17 9.00012 17Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightIcon({ size = 14, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M12 5l7 7-7 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getFlagByCode(code: string): string {
  const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
  return lang?.flag || '';
}

type PageType = 'home' | 'jpSearch' | 'wordDetail' | 'translate' | 'other';

interface UnifiedHeaderBarProps {
  pageType?: PageType;
  // Home
  onProfilePress?: () => void;
  onSettingsPress?: () => void;
  // JpSearch & Translate
  title?: string;
  selectedFlag?: string;
  onLanguagePress?: () => void;
  // JpSearch & WordDetail & Translate
  onBackPress?: () => void;
  // WordDetail
  word?: string;
  posTags?: string[];
  gender?: 'm' | 'f' | 'n' | 'mf';
  onPronouncePress?: () => void;
  // Network status
  isOffline?: boolean;
  // Language detection
  isDetectingLanguage?: boolean;
  // Translate - language pair
  sourceLang?: string;
  targetLang?: string;
  onSourceLangChange?: (langCode: string) => void;
  onTargetLangChange?: (langCode: string) => void;
}

export function UnifiedHeaderBar({
  pageType = 'home',
  onProfilePress,
  onSettingsPress,
  title,
  selectedFlag = '🇺🇸',
  onLanguagePress,
  onBackPress,
  word,
  posTags = [],
  gender,
  onPronouncePress,
  isDetectingLanguage = false,
  isOffline = false,
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
}: UnifiedHeaderBarProps) {
  const { t } = useTranslation();
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const textOnDarkColor = useThemeColor({}, 'textOnDark');
  const textOnPrimaryColor = useThemeColor({}, 'textOnPrimary');
  const secondaryColor = useThemeColor({}, 'textSecondary');

  // titleのデフォルト値を翻訳から取得
  const defaultTitle = title || t('header.learn');

  // 配列であることを保証
  const posTagsArray = Array.isArray(posTags) ? posTags : [];

  // Home variant
  if (pageType === 'home') {
    return (
      <View style={styles.container}>
        <View style={styles.homeLeftButtons}>
          <TouchableOpacity
            onPress={() => router.push('/bookmarks')}
            style={styles.headerIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BookmarkIcon size={22} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/custom-questions')}
            style={styles.headerIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MessagePlusIcon size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
          <UserIcon size={24} color={iconColor} />
        </TouchableOpacity>
      </View>
    );
  }

  // JpSearch variant
  if (pageType === 'jpSearch') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ChevronLeftIcon size={28} color={iconColor} />
        </TouchableOpacity>

        <Text selectable selectionColor={primaryColor} style={[styles.title, { color: textColor }]}>
          {defaultTitle}
        </Text>

        <LanguageSwitcher isDetectingLanguage={isDetectingLanguage} />
      </View>
    );
  }

  // WordDetail variant
  if (pageType === 'wordDetail') {
    return (
      <View style={styles.wordDetailContainer}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <ChevronLeftIcon size={28} color={iconColor} />
          </TouchableOpacity>

          <Text selectable selectionColor={primaryColor} style={[styles.word, { color: textColor }]}>
            {word}
          </Text>

          <TouchableOpacity onPress={onPronouncePress} style={[styles.pronounceButton, { backgroundColor: primaryColor }]}>
            <VolumeIcon size={18} color={textOnPrimaryColor} />
          </TouchableOpacity>
        </View>

        {posTagsArray.length > 0 && (
          <View style={styles.tagRow}>
            {posTagsArray.map((tag, index) => (
              <PosTag key={index} label={tag} gender={gender} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // Translate variant
  if (pageType === 'translate') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ChevronLeftIcon size={28} color={iconColor} />
        </TouchableOpacity>

        <LanguagePairSelector
          sourceLang={sourceLang || 'en'}
          targetLang={targetLang || 'ja'}
          isDetectingLanguage={isDetectingLanguage}
          onSourceLangChange={onSourceLangChange || (() => {})}
          onTargetLangChange={onTargetLangChange || (() => {})}
        />
      </View>
    );
  }

  // Other variant (settings, help, about, etc.)
  if (pageType === 'other') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ChevronLeftIcon size={28} color={iconColor} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: textColor }]}>{defaultTitle}</Text>

        <View style={styles.placeholder} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 8,
    height: 52,
  },
  wordDetailContainer: {
    backgroundColor: 'transparent',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 8,
    minHeight: 88,
  },
  homeLeftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1,
    width: 144,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flag: {
    fontSize: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  word: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1,
    flex: 1,
    marginHorizontal: 8,
  },
  pronounceButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  posTagContainer: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posTagText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  placeholder: {
    width: 28,
    height: 28,
  },
  languagePairContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languagePairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languagePairFlag: {
    fontSize: 20,
  },
});
