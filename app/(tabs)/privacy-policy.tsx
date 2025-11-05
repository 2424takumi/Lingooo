import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="プライバシーポリシー"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <Text style={styles.updateDate}>最終更新日: 2025年1月1日</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. はじめに</Text>
              <Text style={styles.paragraph}>
                Lingooo（以下「当アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーは、当アプリがどのように情報を収集、使用、保護するかについて説明します。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. 収集する情報</Text>
              <Text style={styles.paragraph}>
                当アプリは以下の情報を収集する場合があります：
              </Text>
              <Text style={styles.listItem}>• 学習履歴と進捗状況</Text>
              <Text style={styles.listItem}>• ブックマークした単語とフレーズ</Text>
              <Text style={styles.listItem}>• アプリの使用状況データ</Text>
              <Text style={styles.listItem}>• デバイス情報（機種、OS バージョンなど）</Text>
              <Text style={styles.listItem}>• アカウント情報（メールアドレス、プロフィール情報など）</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. 情報の使用目的</Text>
              <Text style={styles.paragraph}>
                収集した情報は以下の目的で使用されます：
              </Text>
              <Text style={styles.listItem}>• アプリの機能とサービスの提供</Text>
              <Text style={styles.listItem}>• 学習体験のパーソナライズ</Text>
              <Text style={styles.listItem}>• アプリの改善と新機能の開発</Text>
              <Text style={styles.listItem}>• カスタマーサポートの提供</Text>
              <Text style={styles.listItem}>• セキュリティの維持</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. 情報の共有</Text>
              <Text style={styles.paragraph}>
                当アプリは、以下の場合を除き、ユーザーの個人情報を第三者と共有しません：
              </Text>
              <Text style={styles.listItem}>• ユーザーの同意がある場合</Text>
              <Text style={styles.listItem}>• 法的義務を遵守するため</Text>
              <Text style={styles.listItem}>• サービス提供に必要な範囲で信頼できるパートナーと共有する場合</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. データの保存と保護</Text>
              <Text style={styles.paragraph}>
                当アプリは、ユーザーデータの安全性を確保するため、業界標準のセキュリティ対策を実施しています。データは暗号化され、安全なサーバーに保存されます。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. ユーザーの権利</Text>
              <Text style={styles.paragraph}>
                ユーザーは以下の権利を有します：
              </Text>
              <Text style={styles.listItem}>• 個人情報へのアクセス</Text>
              <Text style={styles.listItem}>• 個人情報の訂正</Text>
              <Text style={styles.listItem}>• 個人情報の削除</Text>
              <Text style={styles.listItem}>• データポータビリティ</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Cookie とトラッキング</Text>
              <Text style={styles.paragraph}>
                当アプリは、ユーザー体験を向上させるために Cookie や類似の技術を使用する場合があります。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. 子どものプライバシー</Text>
              <Text style={styles.paragraph}>
                当アプリは、13歳未満の子どもから故意に個人情報を収集しません。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. ポリシーの変更</Text>
              <Text style={styles.paragraph}>
                本プライバシーポリシーは予告なく変更される場合があります。重要な変更がある場合は、アプリ内で通知します。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. お問い合わせ</Text>
              <Text style={styles.paragraph}>
                プライバシーポリシーに関するご質問やご懸念がある場合は、以下までお問い合わせください：
              </Text>
              <Text style={styles.contactText}>privacy@lingooo.app</Text>
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
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  updateDate: {
    fontSize: 14,
    color: '#686868',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 24,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 24,
    marginBottom: 4,
    paddingLeft: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#00AA69',
    fontWeight: '500',
    marginTop: 8,
  },
});
