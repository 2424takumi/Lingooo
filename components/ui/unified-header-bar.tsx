import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRef } from 'react';
import { MenuIcon, SettingsIcon } from './icons';
import Svg, { Path } from 'react-native-svg';
import { PosTag } from './pos-tag';
import { LanguageSwitcher } from './language-switcher';

// Icons
function ChevronLeftIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#000000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CaretDownIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke="#000000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function VolumeIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="#000000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PageType = 'home' | 'jpSearch' | 'wordDetail' | 'translate' | 'other';

interface UnifiedHeaderBarProps {
  pageType?: PageType;
  // Home
  onMenuPress?: (layout: { x: number; y: number; width: number; height: number }) => void;
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
}

export function UnifiedHeaderBar({
  pageType = 'home',
  onMenuPress,
  onProfilePress,
  onSettingsPress,
  title = '学習する',
  selectedFlag = '🇺🇸',
  onLanguagePress,
  onBackPress,
  word,
  posTags = [],
  gender,
  onPronouncePress,
  isDetectingLanguage = false,
  isOffline = false,
}: UnifiedHeaderBarProps) {
  const menuButtonRef = useRef<any>(null);

  // 配列であることを保証
  const posTagsArray = Array.isArray(posTags) ? posTags : [];

  const handleMenuPress = () => {
    if (menuButtonRef.current && onMenuPress) {
      // @ts-ignore - measureInWindow exists on TouchableOpacity but not in type definition
      menuButtonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        onMenuPress({ x, y, width, height });
      });
    }
  };

  // Home variant
  if (pageType === 'home') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          ref={menuButtonRef}
          onPress={handleMenuPress}
          style={styles.menuButton}
        >
          <MenuIcon size={22} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
          <UserIcon size={24} />
        </TouchableOpacity>
      </View>
    );
  }

  // JpSearch variant
  if (pageType === 'jpSearch') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ChevronLeftIcon size={28} />
        </TouchableOpacity>

        <Text selectable selectionColor="#111111" style={styles.title}>
          {title}
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
            <ChevronLeftIcon size={28} />
          </TouchableOpacity>

          <Text selectable selectionColor="#111111" style={styles.word}>
            {word}
          </Text>

          <TouchableOpacity onPress={onPronouncePress} style={styles.pronounceButton}>
            <VolumeIcon size={18} />
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
          <ChevronLeftIcon size={28} />
        </TouchableOpacity>

        <View style={styles.placeholder} />

        <LanguageSwitcher isDetectingLanguage={isDetectingLanguage} />
      </View>
    );
  }

  // Other variant (settings, help, about, etc.)
  if (pageType === 'other') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ChevronLeftIcon size={28} />
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>

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
  menuButton: {
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
    backgroundColor: '#D3D3D3',
    borderRadius: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
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
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
    flex: 1,
    marginHorizontal: 8,
  },
  pronounceButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  posTagContainer: {
    backgroundColor: '#EBEBEB',
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
    color: '#000000',
    textAlign: 'center',
  },
  placeholder: {
    width: 28,
    height: 28,
  },
});
