import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MenuIcon } from './icons';
import Svg, { Path } from 'react-native-svg';
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

type PageType = 'home' | 'jpSearch' | 'wordDetail' | 'other';

interface UnifiedHeaderBarProps {
  pageType?: PageType;
  // Home
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  // JpSearch
  title?: string;
  selectedFlag?: string;
  onLanguagePress?: () => void;
  // JpSearch & WordDetail
  onBackPress?: () => void;
  // WordDetail
  word?: string;
  posTags?: string[];
  onPronouncePress?: () => void;
}

export function UnifiedHeaderBar({
  pageType = 'home',
  onMenuPress,
  onProfilePress,
  title = '学習する',
  selectedFlag = '🇺🇸',
  onLanguagePress,
  onBackPress,
  word,
  posTags = [],
  onPronouncePress,
}: UnifiedHeaderBarProps) {
  // Home variant
  if (pageType === 'home') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MenuIcon size={28} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
          <UserIcon size={28} />
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

        <Text style={styles.title}>{title}</Text>

        <LanguageSwitcher />
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

          <Text style={styles.word}>{word}</Text>

          <TouchableOpacity onPress={onPronouncePress} style={styles.pronounceButton}>
            <VolumeIcon size={18} />
          </TouchableOpacity>
        </View>

        {posTags.length > 0 && (
          <View style={styles.tagRow}>
            {posTags.map((tag, index) => (
              <View key={index} style={styles.posTagContainer}>
                <Text style={styles.posTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
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
    backgroundColor: '#FAFCFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 52,
  },
  wordDetailContainer: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    height: 88,
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
    fontWeight: '600',
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
    alignItems: 'center',
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
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
    width: 144,
  },
  pronounceButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#00AA69',
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
