import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useThemeContext, ThemePreference } from '@/contexts/theme-context';
import { router } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

// Icons
function CheckIcon({ size = 24, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SunIcon({ size = 24, color = '#FFA500' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MoonIcon({ size = 24, color = '#4A5568' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AutoIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M3 12h18" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

const themes: { id: ThemePreference; name: string; description: string; icon: typeof SunIcon; iconColor: string }[] = [
  {
    id: 'light',
    name: 'ライト',
    description: '明るい配色で表示します',
    icon: SunIcon,
    iconColor: '#FFA500',
  },
  {
    id: 'dark',
    name: 'ダーク',
    description: '暗い配色で表示します',
    icon: MoonIcon,
    iconColor: '#9CA3AF',
  },
  {
    id: 'auto',
    name: '自動',
    description: 'システム設定に従います',
    icon: AutoIcon,
    iconColor: '#686868',
  },
];

export default function ThemeSelectScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'primary');
  const selectedCardBg = useThemeColor({}, 'searchBackground');
  const { themePreference, setThemePreference, resolvedTheme } = useThemeContext();

  const handleThemeSelect = async (themeId: ThemePreference) => {
    await setThemePreference(themeId);
    setTimeout(() => {
      router.back();
    }, 200);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="テーマ"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: textSecondaryColor }]}>
            アプリの外観を変更できます
          </Text>

          <View style={styles.themeList}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeItem,
                  { backgroundColor: cardBg },
                  themePreference === theme.id && [styles.selectedThemeItem, { borderColor, backgroundColor: selectedCardBg }],
                ]}
                onPress={() => handleThemeSelect(theme.id)}
              >
                <View style={styles.themeHeader}>
                  <View style={styles.themeInfo}>
                    <theme.icon size={28} color={theme.iconColor} />
                    <View style={styles.themeText}>
                      <Text style={[styles.themeName, { color: textColor }]}>{theme.name}</Text>
                      <Text style={[styles.themeDescription, { color: textSecondaryColor }]}>{theme.description}</Text>
                    </View>
                  </View>
                  {themePreference === theme.id && (
                    <CheckIcon size={24} color={textColor} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 62,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  themeList: {
    gap: 16,
    marginBottom: 40,
  },
  themeItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThemeItem: {
    borderWidth: 2,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  themeText: {
    flex: 1,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
  },
});
