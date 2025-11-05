import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

const FONT_SIZE_STORAGE_KEY = '@lingooo_font_size';

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

const fontSizes = [
  { id: 'small', name: '小', preview: '14px', size: 14 },
  { id: 'medium', name: '中', preview: '16px', size: 16 },
  { id: 'large', name: '大', preview: '18px', size: 18 },
  { id: 'extra-large', name: '特大', preview: '20px', size: 20 },
];

export default function FontSizeScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const [selectedSize, setSelectedSize] = useState('中');

  useEffect(() => {
    loadFontSizePreference();
  }, []);

  const loadFontSizePreference = async () => {
    try {
      const savedSize = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (savedSize) {
        setSelectedSize(savedSize);
      }
    } catch (error) {
      // エラーは無視
    }
  };

  const handleSizeSelect = async (sizeName: string) => {
    setSelectedSize(sizeName);
    try {
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, sizeName);
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
            title="フォントサイズ"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            読みやすいフォントサイズを選択してください
          </Text>

          <View style={styles.sizeList}>
            {fontSizes.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeItem,
                  selectedSize === size.name && styles.selectedSizeItem,
                ]}
                onPress={() => handleSizeSelect(size.name)}
              >
                <View style={styles.sizeInfo}>
                  <Text style={styles.sizeName}>{size.name}</Text>
                  <Text style={[styles.previewText, { fontSize: size.size }]}>
                    The quick brown fox jumps over the lazy dog
                  </Text>
                  <Text style={styles.sizeValue}>{size.preview}</Text>
                </View>
                {selectedSize === size.name && (
                  <CheckIcon size={24} color="#00AA69" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview Section */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>プレビュー</Text>
            <View style={styles.previewCard}>
              <Text
                style={[
                  styles.previewContent,
                  { fontSize: fontSizes.find((s) => s.name === selectedSize)?.size || 16 },
                ]}
              >
                これはプレビューテキストです。選択したフォントサイズで表示されます。
              </Text>
            </View>
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
  sizeList: {
    gap: 12,
    marginBottom: 32,
  },
  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSizeItem: {
    borderColor: '#00AA69',
    backgroundColor: '#F0FBF7',
  },
  sizeInfo: {
    flex: 1,
    gap: 4,
  },
  sizeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  previewText: {
    color: '#000000',
    marginBottom: 4,
  },
  sizeValue: {
    fontSize: 12,
    color: '#686868',
  },
  previewSection: {
    marginBottom: 40,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  previewContent: {
    color: '#000000',
    lineHeight: 24,
  },
});
