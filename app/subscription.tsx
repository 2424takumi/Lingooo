/**
 * Subscription / Paywall Screen
 *
 * プレミアムプランの説明と購入画面
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubscription } from '@/contexts/subscription-context';
import { useState } from 'react';

export default function SubscriptionScreen() {
  const pageBackground = useThemeColor({ light: '#F5F7FA', dark: '#000000' }, 'pageBackground');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#999999' }, 'icon');

  const { isPremium, isLoading, packages, purchasePackage, restorePurchases, customerInfo } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(1); // Default to yearly

  // 月額・年額パッケージを識別
  const monthlyPackage = packages.find(pkg => pkg.identifier.includes('monthly'));
  const yearlyPackage = packages.find(pkg => pkg.identifier.includes('yearly'));

  const handlePurchase = async () => {
    const selectedPackage = selectedPackageIndex === 0 ? monthlyPackage : yearlyPackage;

    if (!selectedPackage) {
      Alert.alert('エラー', 'プランの読み込み中です。しばらくお待ちください。');
      return;
    }

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        Alert.alert(
          '購入完了',
          'プレミアムプランへようこそ！',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      // Error already handled in context
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          '復元完了',
          'プレミアムプランを復元しました。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('購入履歴なし', '復元可能な購入履歴が見つかりませんでした。');
      }
    } catch (error) {
      // Error already handled in context
    } finally {
      setIsRestoring(false);
    }
  };

  // Format expiry date
  const formatExpiryDate = () => {
    if (!customerInfo?.expirationDate) return '';
    const date = new Date(customerInfo.expirationDate);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title=""
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Status - Only show if premium */}
          {isPremium ? (
            <View style={styles.premiumStatusContainer}>
              <Text style={[styles.premiumStatusTitle, { color: textColor }]}>
                プレミアム会員
              </Text>
              <Text style={[styles.premiumStatusDescription, { color: subTextColor }]}>
                すべての機能をご利用いただけます
              </Text>
              {customerInfo?.expirationDate && (
                <Text style={[styles.expiryText, { color: subTextColor }]}>
                  次回更新日: {formatExpiryDate()}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.manageButton, { backgroundColor: cardBackground }]}
                onPress={() => {
                  Alert.alert('管理', 'App Storeの設定からサブスクリプションを管理できます。');
                }}
              >
                <Text style={[styles.manageButtonText, { color: textColor }]}>
                  サブスクリプションを管理
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Hero */}
              <View style={styles.heroContainer}>
                <Text style={[styles.heroTitle, { color: textColor }]}>
                  プレミアムプラン{'\n'}でもっと快適に
                </Text>
              </View>

              {/* Features Card */}
              <View style={[styles.featuresCard, { backgroundColor: cardBackground }]}>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={styles.featureEmoji}>💬</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    月間1,000回の質問
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.featureEmoji}>📝</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    最大50,000文字の翻訳
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#F3E5F5' }]}>
                    <Text style={styles.featureEmoji}>📚</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    ブックマークフォルダ
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={styles.featureEmoji}>🎯</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    詳細なAI返答
                  </Text>
                </View>
              </View>

              {/* Plan Selector */}
              {(monthlyPackage || yearlyPackage) && (
                <View style={styles.planSelectorContainer}>
                  {yearlyPackage && (
                    <TouchableOpacity
                      style={[
                        styles.planOption,
                        { backgroundColor: cardBackground },
                        selectedPackageIndex === 1 && styles.planOptionSelected,
                      ]}
                      onPress={() => setSelectedPackageIndex(1)}
                    >
                      <View style={styles.planOptionLeft}>
                        <View style={styles.radioOuter}>
                          {selectedPackageIndex === 1 && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.planOptionTitle, { color: textColor }]}>年額プラン</Text>
                          <Text style={[styles.planOptionPrice, { color: subTextColor }]}>
                            ¥5,000/年 (月換算 約¥417)
                          </Text>
                        </View>
                      </View>
                      {selectedPackageIndex === 1 && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>おすすめ</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {monthlyPackage && (
                    <TouchableOpacity
                      style={[
                        styles.planOption,
                        { backgroundColor: cardBackground },
                        selectedPackageIndex === 0 && styles.planOptionSelected,
                      ]}
                      onPress={() => setSelectedPackageIndex(0)}
                    >
                      <View style={styles.planOptionLeft}>
                        <View style={styles.radioOuter}>
                          {selectedPackageIndex === 0 && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.planOptionTitle, { color: textColor }]}>月額プラン</Text>
                          <Text style={[styles.planOptionPrice, { color: subTextColor }]}>¥500/月</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Pricing Info */}
              <Text style={[styles.pricingInfo, { color: '#007AFF' }]}>
                7日間の無料体験の終了後は{selectedPackageIndex === 0 ? '¥500/月' : '¥5,000/年'}
              </Text>

              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (isPurchasing || isLoading || packages.length === 0) && styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={isPurchasing || isLoading || packages.length === 0}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.purchaseButtonText}>無料で体験してみる</Text>
                )}
              </TouchableOpacity>

              {/* Restore Button */}
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isRestoring || isLoading}
              >
                {isRestoring ? (
                  <ActivityIndicator color={subTextColor} size="small" />
                ) : (
                  <Text style={[styles.restoreButtonText, { color: subTextColor }]}>
                    購入を復元する
                  </Text>
                )}
              </TouchableOpacity>

              {/* Terms */}
              <Text style={[styles.termsText, { color: subTextColor }]}>
                無料体験終了の24時間前までに解約しなかった場合、自動的に月極購読へ移行し、{selectedPackageIndex === 0 ? '¥500/月' : '¥5,000/年'}が請求されます。
                {'\n\n'}
                いつでも解約できます。無料体験や月極購読は、期間終了の24時間前までに解約しない限り自動的に更新されます。
              </Text>
            </>
          )}
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
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Premium Status
  premiumStatusContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  premiumStatusTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  premiumStatusDescription: {
    fontSize: 16,
    marginBottom: 24,
  },
  expiryText: {
    fontSize: 14,
    marginBottom: 32,
  },
  manageButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Hero
  heroContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },

  // Features Card
  featuresCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Plan Selector
  planSelectorContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  planOptionSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  planOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
  },
  planOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  planOptionPrice: {
    fontSize: 14,
  },
  recommendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Pricing Info
  pricingInfo: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Purchase Button
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Restore Button
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Terms
  termsText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
