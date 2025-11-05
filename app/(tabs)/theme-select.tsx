import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const THEME_STORAGE_KEY = '@lingooo_theme';

// Icons
function CheckIcon({ size = 24, color = '#00AA69' }: { size?: number; color?: string }) {
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

const themes = [
  {
    id: 'light',
    name: 'ライト',
    description: '明るい配色で表示します',
    icon: SunIcon,
    iconColor: '#FFA500',
    preview: {
      background: '#FAFCFB',
      card: '#FFFFFF',
      text: '#000000',
    },
  },
  {
    id: 'dark',
    name: 'ダーク',
    description: '暗い配色で表示します',
    icon: MoonIcon,
    iconColor: '#9CA3AF',
    preview: {
      background: '#1A1A1A',
      card: '#2D2D2D',
      text: '#FFFFFF',
    },
  },
  {
    id: 'auto',
    name: '自動',
    description: 'システム設定に従います',
    icon: AutoIcon,
    iconColor: '#686868',
    preview: {
      background: '#F5F5F5',
      card: '#E5E5E5',
      text: '#000000',
    },
  },
];

export default function ThemeSelectScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const [selectedTheme, setSelectedTheme] = useState('ライト');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setSelectedTheme(savedTheme);
      }
    } catch (error) {
      // エラーは無視
    }
  };

  const handleThemeSelect = async (themeName: string) => {
    setSelectedTheme(themeName);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      // エラーは無視
    }
    // 少し遅延してから戻る
    setTimeout(() => {
      router.back();
    }, 200);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

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
          <Text style={styles.description}>
            アプリの外観を変更できます
          </Text>

          <View style={styles.themeList}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeItem,
                  selectedTheme === theme.name && styles.selectedThemeItem,
                ]}
                onPress={() => handleThemeSelect(theme.name)}
              >
                <View style={styles.themeHeader}>
                  <View style={styles.themeInfo}>
                    <theme.icon size={28} color={theme.iconColor} />
                    <View style={styles.themeText}>
                      <Text style={styles.themeName}>{theme.name}</Text>
                      <Text style={styles.themeDescription}>{theme.description}</Text>
                    </View>
                  </View>
                  {selectedTheme === theme.name && (
                    <CheckIcon size={24} color="#00AA69" />
                  )}
                </View>

                {/* Theme Preview */}
                <View
                  style={[
                    styles.previewContainer,
                    { backgroundColor: theme.preview.background },
                  ]}
                >
                  <View style={[styles.previewCard, { backgroundColor: theme.preview.card }]}>
                    <Text style={[styles.previewText, { color: theme.preview.text }]}>
                      プレビューテキスト
                    </Text>
                  </View>
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
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#686868',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeList: {
    gap: 16,
    marginBottom: 40,
  },
  themeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThemeItem: {
    borderColor: '#00AA69',
    backgroundColor: '#F0FBF7',
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    color: '#000000',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
    color: '#686868',
  },
  previewContainer: {
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  previewCard: {
    borderRadius: 6,
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
