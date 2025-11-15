import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Icons
function GithubIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TwitterIcon({ size = 24, color = '#1DA1F2' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ size = 24, color = '#FF6B6B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function AboutScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="アプリについて"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* App Info */}
          <View style={styles.appInfoSection}>
            <View style={styles.appIconContainer}>
              <Text style={styles.appIconText}>L</Text>
            </View>
            <Text style={styles.appName}>Lingooo</Text>
            <Text style={styles.appTagline}>英語学習をもっと楽しく</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.descriptionText}>
              Lingoooは、英語学習をより楽しく効果的にするためのアプリです。
              単語検索、発音練習、例文学習など、様々な機能で英語力向上をサポートします。
            </Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>主な機能</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>単語の詳細な意味と発音</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>豊富な例文とその日本語訳</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>ブックマーク機能で復習</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>学習履歴の記録</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>オフライン対応</Text>
              </View>
            </View>
          </View>

          {/* Social Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ソーシャルメディア</Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleLinkPress('https://twitter.com/lingooo_app')}
              >
                <TwitterIcon size={24} />
                <Text style={styles.socialText}>Twitter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleLinkPress('https://github.com/lingooo-app')}
              >
                <GithubIcon size={24} />
                <Text style={styles.socialText}>GitHub</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credits */}
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.creditsCard}>
              <HeartIcon size={32} />
              <Text style={styles.creditsTitle}>Made with love</Text>
              <Text style={styles.creditsText}>
                このアプリは英語学習を愛する開発者によって作られました。
                {'\n\n'}
                ご利用いただきありがとうございます。
              </Text>
            </View>

            <View style={styles.copyrightContainer}>
              <Text style={styles.copyrightText}>© 2024 Lingooo. All rights reserved.</Text>
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
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appIconText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#686868',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#ACACAC',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
    marginBottom: 16,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureList: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: 16,
    color: '#111111',
    marginRight: 12,
    fontWeight: '700',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  creditsCard: {
    backgroundColor: '#FFF5F5',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 12,
  },
  creditsText: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
    lineHeight: 22,
  },
  copyrightContainer: {
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#ACACAC',
  },
});
