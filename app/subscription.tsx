/**
 * Subscription / Paywall Screen
 *
 * プレミアムプランの説明と購入画面
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubscription } from '@/contexts/subscription-context';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const cardBackground = useThemeColor({}, 'cardBackgroundElevated');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({}, 'textTertiary');
  const borderColor = useThemeColor({}, 'borderLight');
  const systemBlueColor = useThemeColor({}, 'systemBlue');
  const successColor = useThemeColor({}, 'successColor');
  const buttonDisabledColor = useThemeColor({}, 'buttonDisabled');

  const { isPremium, isLoading, packages, purchasePackage, restorePurchases, customerInfo } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(1); // Default to yearly

  // 月額・年額パッケージを識別
  const monthlyPackage = packages.find(pkg => pkg.identifier.includes('monthly'));
  const yearlyPackage = packages.find(pkg => pkg.identifier.includes('yearly'));

  const selectedPrice = selectedPackageIndex === 0 ? t('subscription.monthlyPrice') : t('subscription.yearlyPrice');

  const handlePurchase = async () => {
    const selectedPackage = selectedPackageIndex === 0 ? monthlyPackage : yearlyPackage;

    if (!selectedPackage) {
      Alert.alert(t('common.error'), t('subscription.planLoadError'));
      return;
    }

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        Alert.alert(
          t('subscription.purchaseComplete'),
          t('subscription.welcomePremium'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      let errorMessage = t('subscription.purchaseErrorGeneral');

      if (error?.message) {
        if (error.message.includes('cancelled') || error.message.includes('canceled')) {
          errorMessage = t('subscription.purchaseCancelled');
        } else if (error.message.includes('network')) {
          errorMessage = t('subscription.purchaseNetworkError');
        } else if (error.message.includes('already')) {
          errorMessage = t('subscription.purchaseAlready');
        } else if (error.message.includes('payment') || error.message.includes('billing')) {
          errorMessage = t('subscription.purchasePaymentError');
        } else {
          errorMessage = `${t('subscription.purchaseError')}: ${error.message}`;
        }
      }

      Alert.alert(t('subscription.purchaseError'), errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      if (isPremium) {
        Alert.alert(
          t('subscription.restoreComplete'),
          t('subscription.restoreSuccess'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('subscription.restoreNoHistory'), t('subscription.restoreNotFound'));
      }
    } catch (error: any) {
      let errorMessage = t('subscription.restoreErrorGeneral');

      if (error?.message) {
        if (error.message.includes('network')) {
          errorMessage = t('subscription.purchaseNetworkError');
        } else {
          errorMessage = `${t('subscription.restoreError')}: ${error.message}`;
        }
      }

      Alert.alert(t('subscription.restoreError'), errorMessage);
    } finally {
      setIsRestoring(false);
    }
  };

  // Format expiry date
  const formatExpiryDate = () => {
    if (!customerInfo?.entitlements?.active) return '';

    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    if (activeEntitlements.length === 0) return '';

    const expirationDate = activeEntitlements[0].expirationDate;
    if (!expirationDate) return '';

    const date = new Date(expirationDate);
    return date.toLocaleDateString();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={pageBackground === '#FFFFFF' || pageBackground === '#0B0B0B' ? 'auto' : 'auto'} />

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
                {t('subscription.premiumMember')}
              </Text>
              <Text style={[styles.premiumStatusDescription, { color: subTextColor }]}>
                {t('subscription.allFeaturesAvailable')}
              </Text>
              {formatExpiryDate() && (
                <Text style={[styles.expiryText, { color: subTextColor }]}>
                  {t('subscription.nextRenewal', { date: formatExpiryDate() })}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.manageButton, { backgroundColor: cardBackground, borderColor }]}
                onPress={() => {
                  Linking.openURL('https://apps.apple.com/account/subscriptions');
                }}
              >
                <Text style={[styles.manageButtonText, { color: textColor }]}>
                  {t('subscription.manageSubscription')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Hero */}
              <View style={styles.heroContainer}>
                <Text style={[styles.heroTitle, { color: textColor }]}>
                  {t('subscription.heroTitle')}
                </Text>
              </View>

              {/* Features Card */}
              <View style={[styles.featuresCard, { backgroundColor: cardBackground }]}>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={styles.featureEmoji}>💬</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    {t('subscription.feature1')}
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.featureEmoji}>📝</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    {t('subscription.feature2')}
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#F3E5F5' }]}>
                    <Text style={styles.featureEmoji}>📚</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    {t('subscription.feature3')}
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={styles.featureEmoji}>🎯</Text>
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>
                    {t('subscription.feature4')}
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
                        { backgroundColor: cardBackground, borderColor },
                        selectedPackageIndex === 1 && { borderColor: systemBlueColor },
                      ]}
                      onPress={() => setSelectedPackageIndex(1)}
                    >
                      <View style={styles.planOptionLeft}>
                        <View style={styles.radioOuter}>
                          {selectedPackageIndex === 1 && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.planOptionTitle, { color: textColor }]}>{t('subscription.yearlyPlan')}</Text>
                          <Text style={[styles.planOptionPrice, { color: subTextColor }]}>
                            {t('subscription.yearlyPrice')}
                          </Text>
                        </View>
                      </View>
                      {selectedPackageIndex === 1 && (
                        <View style={[styles.recommendedBadge, { backgroundColor: successColor }]}>
                          <Text style={styles.recommendedBadgeText}>{t('subscription.recommended')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {monthlyPackage && (
                    <TouchableOpacity
                      style={[
                        styles.planOption,
                        { backgroundColor: cardBackground, borderColor },
                        selectedPackageIndex === 0 && { borderColor: systemBlueColor },
                      ]}
                      onPress={() => setSelectedPackageIndex(0)}
                    >
                      <View style={styles.planOptionLeft}>
                        <View style={styles.radioOuter}>
                          {selectedPackageIndex === 0 && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.planOptionTitle, { color: textColor }]}>{t('subscription.monthlyPlan')}</Text>
                          <Text style={[styles.planOptionPrice, { color: subTextColor }]}>{t('subscription.monthlyPrice')}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Pricing Info */}
              <Text style={[styles.pricingInfo, { color: systemBlueColor }]}>
                {t('subscription.trialInfo', { price: selectedPrice })}
              </Text>

              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  { backgroundColor: systemBlueColor, shadowColor: systemBlueColor },
                  (isPurchasing || isLoading || packages.length === 0) && { backgroundColor: buttonDisabledColor, shadowOpacity: 0 },
                ]}
                onPress={handlePurchase}
                disabled={isPurchasing || isLoading || packages.length === 0}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.purchaseButtonText}>{t('subscription.tryFree')}</Text>
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
                    {t('subscription.restorePurchase')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Terms */}
              <Text style={[styles.termsText, { color: subTextColor }]}>
                {t('subscription.terms', { price: selectedPrice })}
              </Text>

              {/* Legal Links */}
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                  <Text style={[styles.linkText, { color: subTextColor }]}>{t('subscription.termsOfService')}</Text>
                </TouchableOpacity>
                <Text style={[styles.linkSeparator, { color: subTextColor }]}>  •  </Text>
                <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                  <Text style={[styles.linkText, { color: subTextColor }]}>{t('subscription.privacyPolicy')}</Text>
                </TouchableOpacity>
              </View>
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
  },
  planOptionSelected: {
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    color: '#FFFFFF', // Always white on green badge
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
  purchaseButtonDisabled: {},
  purchaseButtonText: {
    color: '#FFFFFF', // Always white on blue button
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

  // Legal Links
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    fontSize: 12,
  },
});
