import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="利用規約"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <Text style={styles.updateDate}>最終更新日: 2025年1月1日</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. 利用規約への同意</Text>
              <Text style={styles.paragraph}>
                Lingooo（以下「当アプリ」）をご利用いただくにあたり、以下の利用規約に同意していただく必要があります。本規約に同意いただけない場合は、当アプリのご利用をお控えください。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. サービスの内容</Text>
              <Text style={styles.paragraph}>
                当アプリは、言語学習をサポートするモバイルアプリケーションです。単語の検索、学習記録、復習機能などを提供します。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. アカウント</Text>
              <Text style={styles.paragraph}>
                当アプリを利用するには、アカウントの作成が必要な場合があります。ユーザーは以下の責任を負います：
              </Text>
              <Text style={styles.listItem}>• アカウント情報の正確性を保つこと</Text>
              <Text style={styles.listItem}>• パスワードの機密性を維持すること</Text>
              <Text style={styles.listItem}>• アカウントで発生するすべての活動に責任を持つこと</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. 禁止事項</Text>
              <Text style={styles.paragraph}>
                ユーザーは以下の行為を行ってはなりません：
              </Text>
              <Text style={styles.listItem}>• 法律や規制に違反する行為</Text>
              <Text style={styles.listItem}>• 他のユーザーの権利を侵害する行為</Text>
              <Text style={styles.listItem}>• 当アプリのセキュリティを脅かす行為</Text>
              <Text style={styles.listItem}>• 不正アクセスやハッキングの試み</Text>
              <Text style={styles.listItem}>• スパムや悪意のあるコンテンツの送信</Text>
              <Text style={styles.listItem}>• 当アプリのリバースエンジニアリング</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. 知的財産権</Text>
              <Text style={styles.paragraph}>
                当アプリおよびそのコンテンツ（テキスト、グラフィック、ロゴ、画像など）の知的財産権は、当社または正当な権利者に帰属します。ユーザーは、これらを無断で使用、複製、配布することはできません。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. サービスの変更と終了</Text>
              <Text style={styles.paragraph}>
                当社は、予告なく当アプリの機能を変更、追加、削除する権利を有します。また、事前の通知なしにサービスを一時的または永久的に終了することがあります。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. 免責事項</Text>
              <Text style={styles.paragraph}>
                当アプリは「現状有姿」で提供されます。当社は、以下について一切の保証を行いません：
              </Text>
              <Text style={styles.listItem}>• サービスの中断がないこと</Text>
              <Text style={styles.listItem}>• エラーや欠陥がないこと</Text>
              <Text style={styles.listItem}>• セキュリティの完全性</Text>
              <Text style={styles.listItem}>• 学習効果の保証</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. 責任の制限</Text>
              <Text style={styles.paragraph}>
                当社は、当アプリの使用または使用不能により生じた直接的、間接的、偶発的、特別、結果的損害について、責任を負いません。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. プライバシー</Text>
              <Text style={styles.paragraph}>
                個人情報の取り扱いについては、別途プライバシーポリシーをご確認ください。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. 利用規約の変更</Text>
              <Text style={styles.paragraph}>
                当社は、本利用規約を随時変更することができます。重要な変更がある場合は、アプリ内で通知します。変更後も継続して当アプリを使用する場合、変更された規約に同意したものとみなされます。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. 準拠法と管轄</Text>
              <Text style={styles.paragraph}>
                本利用規約は日本法に準拠し、解釈されます。本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. お問い合わせ</Text>
              <Text style={styles.paragraph}>
                利用規約に関するご質問がある場合は、以下までお問い合わせください：
              </Text>
              <Text style={styles.contactText}>support@lingooo.app</Text>
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
    color: '#111111',
    fontWeight: '500',
    marginTop: 8,
  },
});
