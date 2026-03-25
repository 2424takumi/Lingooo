import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Icons
function ChevronRightIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageCircleIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookOpenIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function HelpScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const cardBgColor = useThemeColor({}, 'cardBackgroundElevated');
  const surfaceBgColor = useThemeColor({}, 'surfaceBackground');

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@lingooo.app');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="ヘルプ・サポート"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Help Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>よくある質問</Text>

            <TouchableOpacity style={[styles.helpItem, { backgroundColor: cardBgColor }]}>
              <BookOpenIcon size={24} color={primaryColor} />
              <View style={styles.helpInfo}>
                <Text style={[styles.helpTitle, { color: textColor }]}>使い方ガイド</Text>
                <Text style={[styles.helpDescription, { color: textSecondaryColor }]}>アプリの基本的な使い方を学ぶ</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <View style={styles.faqContainer}>
              <View style={[styles.faqItem, { backgroundColor: cardBgColor }]}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>Q. 単語の発音はどうやって聞けますか？</Text>
                <Text style={[styles.faqAnswer, { color: textSecondaryColor }]}>
                  A. 単語詳細画面でスピーカーアイコンをタップすると発音が再生されます。
                </Text>
              </View>

              <View style={[styles.faqItem, { backgroundColor: cardBgColor }]}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>Q. ブックマークした単語はどこで見られますか？</Text>
                <Text style={[styles.faqAnswer, { color: textSecondaryColor }]}>
                  A. サイドメニューの「ブックマーク」から確認できます。
                </Text>
              </View>

              <View style={[styles.faqItem, { backgroundColor: cardBgColor }]}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>Q. オフラインでも使えますか？</Text>
                <Text style={[styles.faqAnswer, { color: textSecondaryColor }]}>
                  A. 一度検索した単語はキャッシュされ、オフラインでも閲覧可能です。
                </Text>
              </View>

              <View style={[styles.faqItem, { backgroundColor: cardBgColor }]}>
                <Text style={[styles.faqQuestion, { color: textColor }]}>Q. データのバックアップは可能ですか？</Text>
                <Text style={[styles.faqAnswer, { color: textSecondaryColor }]}>
                  A. Pro版では学習データのクラウドバックアップが利用できます。
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>お問い合わせ</Text>

            <TouchableOpacity style={[styles.helpItem, { backgroundColor: cardBgColor }]} onPress={handleEmailPress}>
              <MailIcon size={24} color={primaryColor} />
              <View style={styles.helpInfo}>
                <Text style={[styles.helpTitle, { color: textColor }]}>メールで問い合わせ</Text>
                <Text style={[styles.helpDescription, { color: textSecondaryColor }]}>support@lingooo.app</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.helpItem, { backgroundColor: cardBgColor }]}>
              <MessageCircleIcon size={24} color={primaryColor} />
              <View style={styles.helpInfo}>
                <Text style={[styles.helpTitle, { color: textColor }]}>フィードバックを送る</Text>
                <Text style={[styles.helpDescription, { color: textSecondaryColor }]}>ご意見・ご要望をお聞かせください</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </View>

          {/* Tips Section */}
          <View style={[styles.section, styles.lastSection]}>
            <Text style={[styles.sectionTitle, { color: textSecondaryColor }]}>学習のヒント</Text>

            <View style={[styles.tipCard, { backgroundColor: surfaceBgColor, borderLeftColor: primaryColor }]}>
              <Text style={[styles.tipTitle, { color: textColor }]}>効果的な学習方法</Text>
              <Text style={[styles.tipText, { color: textSecondaryColor }]}>
                • 毎日少しずつ学習することが大切です{'\n'}
                • 音声を聞いて発音を練習しましょう{'\n'}
                • 例文を読んで使い方を理解しましょう{'\n'}
                • ブックマークで復習する単語を管理しましょう
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
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  helpInfo: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
  },
  faqContainer: {
    gap: 12,
  },
  faqItem: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
