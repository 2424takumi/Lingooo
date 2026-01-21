/**
 * Subscription Bottom Sheet
 *
 * プレミアムプラン購入のボトムシート
 */

import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, ScrollView, ActivityIndicator, Alert, Linking, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubscription } from '@/contexts/subscription-context';
import Svg, { Path } from 'react-native-svg';

// Icons
function ChatIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GlobeIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FolderIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparklesIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L13.5 7.5L18 9L13.5 10.5L12 15L10.5 10.5L6 9L10.5 7.5L12 3Z"
        fill={color}
      />
      <Path
        d="M19 12L19.75 14.25L22 15L19.75 15.75L19 18L18.25 15.75L16 15L18.25 14.25L19 12Z"
        fill={color}
      />
      <Path
        d="M7 17L7.75 19.25L10 20L7.75 20.75L7 23L6.25 20.75L4 20L6.25 19.25L7 17Z"
        fill={color}
      />
    </Svg>
  );
}

function BellIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CustomQuestionIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 10h8M8 14h5M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface SubscriptionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  source?: string;
  tutorialMode?: boolean;
  onLater?: () => void;
}

export function SubscriptionBottomSheet({ visible, onClose, tutorialMode = false, onLater }: SubscriptionBottomSheetProps) {
  const windowHeight = Dimensions.get('window').height;
  const slideAnim = useRef(new Animated.Value(windowHeight)).current;
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#686868', dark: '#999999' }, 'icon');

  const { isPremium, isLoading, packages, purchasePackage, restorePurchases, customerInfo } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('monthly');

  // 月額・年額パッケージを識別
  const monthlyPackage = packages.find(pkg => pkg.identifier.includes('monthly'));
  const yearlyPackage = packages.find(pkg => pkg.identifier.includes('yearly'));

  useEffect(() => {
    if (visible) {
      // 開く時は必ず画面外からスタート
      slideAnim.setValue(windowHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: windowHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, windowHeight, slideAnim]);

  const handlePurchase = async () => {
    const selectedPackage = selectedPlan === 'monthly' ? monthlyPackage : yearlyPackage;

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
          [{ text: 'OK', onPress: onClose }]
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
          [{ text: 'OK', onPress: onClose }]
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

  const openTerms = () => {
    onClose();
    // Wait for bottom sheet to close before navigating
    setTimeout(() => {
      router.push('/terms-of-service');
    }, 300);
  };

  const openPrivacyPolicy = () => {
    onClose();
    // Wait for bottom sheet to close before navigating
    setTimeout(() => {
      router.push('/privacy-policy');
    }, 300);
  };

  // Format expiry date
  const formatExpiryDate = () => {
    if (!customerInfo?.entitlements?.active) return '';

    // Get the first active entitlement's expiration date
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    if (activeEntitlements.length === 0) return '';

    const expirationDate = activeEntitlements[0].expirationDate;
    if (!expirationDate) return '';

    const date = new Date(expirationDate);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (isPremium) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableWithoutFeedback onPress={() => { }}>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handleBar} />
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.premiumStatusContainer}>
                  <Text style={[styles.premiumStatusTitle, { color: textColor }]}>
                    プレミアム会員
                  </Text>
                  <Text style={[styles.premiumStatusDescription, { color: subTextColor }]}>
                    すべての機能をご利用いただけます
                  </Text>
                  {formatExpiryDate() && (
                    <Text style={[styles.expiryText, { color: subTextColor }]}>
                      次回更新日: {formatExpiryDate()}
                    </Text>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback onPress={() => { }}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={styles.titleContainer}>
                {tutorialMode ? (
                  <>
                    <Text style={[styles.title, { color: textColor, fontSize: 20, marginBottom: 8 }]}>
                      Lingoooの使い方が
                    </Text>
                    <Text style={[styles.title, { color: textColor, fontSize: 20, marginBottom: 16 }]}>
                      わかりました！
                    </Text>
                    <Text style={[styles.premiumTitle, { color: textColor }]}>
                      🎉 今なら7日間無料で
                    </Text>
                    <Text style={[styles.premiumTitle, { color: textColor }]}>
                      プレミアムを体験できます
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.title, { color: textColor }]}>
                      プレミアムプランで
                    </Text>
                    <Text style={[styles.title, { color: textColor }]}>
                      もっと快適な学習体験を
                    </Text>
                  </>
                )}
              </View>

              {/* Segmented Control */}
              <View style={styles.segmentContainer}>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      selectedPlan === 'yearly' && styles.segmentButtonSelected,
                    ]}
                    onPress={() => setSelectedPlan('yearly')}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        selectedPlan === 'yearly' && styles.segmentButtonTextSelected,
                      ]}
                    >
                      年間プラン
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      selectedPlan === 'monthly' && styles.segmentButtonSelected,
                    ]}
                    onPress={() => setSelectedPlan('monthly')}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        selectedPlan === 'monthly' && styles.segmentButtonTextSelected,
                      ]}
                    >
                      月間プラン
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedPlan === 'yearly' && (
                  <Text style={styles.savingsText}>年間プランで2ヶ月分お得！</Text>
                )}
              </View>

              {/* Plan Card */}
              <View style={styles.planCard}>
                <Text style={[styles.planTitle, { color: textColor }]}>Premiumプラン</Text>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { color: textColor }]}>
                    {selectedPlan === 'yearly' ? '¥5,000' : '¥500'}
                  </Text>
                  <Text style={[styles.pricePeriod, { color: subTextColor }]}>
                    {selectedPlan === 'yearly' ? ' 年払い' : ' 月払い'}
                  </Text>
                </View>

                {/* Purchase Button */}
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    (isPurchasing || isLoading) && styles.purchaseButtonDisabled,
                  ]}
                  onPress={handlePurchase}
                  disabled={isPurchasing || isLoading}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.purchaseButtonText}>７日間無料で体験する</Text>
                  )}
                </TouchableOpacity>

                {/* Later Button (Tutorial Mode Only) */}
                {tutorialMode && onLater && (
                  <TouchableOpacity
                    style={styles.laterButton}
                    onPress={onLater}
                  >
                    <Text style={[styles.laterButtonText, { color: subTextColor }]}>
                      後で
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Free Trial Notice */}
                {!tutorialMode && (
                  <Text style={[styles.freeTrialNotice, { color: subTextColor }]}>
                    プランはいつでもキャンセルができます。
                  </Text>
                )}

                {/* Features */}
                <View style={styles.featuresContainer}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <ChatIcon size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.featureText, { color: '#414141' }]}>
                      月間1000回の質問
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <GlobeIcon size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.featureText, { color: '#414141' }]}>
                      最大50,000文字の翻訳
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <FolderIcon size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.featureText, { color: '#414141' }]}>
                      ブックマークをフォルダで整理
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <CustomQuestionIcon size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.featureText, { color: '#414141' }]}>
                      無制限のカスタム質問
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <BellIcon size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.featureText, { color: '#414141' }]}>
                      最新機能の優先使用
                    </Text>
                  </View>
                </View>
              </View>

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
              <View style={styles.termsContainer}>
                <Text style={[styles.termsText, { color: subTextColor }]}>
                  • 無料期間終了の24時間前までにキャンセルしない場合、{'\n'}
                  {'  '}自動的に¥500/月（または¥5,000/年）が請求されます{'\n'}
                  {'  '}• サブスクリプションは自動更新されます{'\n'}
                  {'  '}• 期間終了の24時間前までにキャンセルすれば課金されません
                </Text>
                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={openTerms}>
                    <Text style={[styles.linkText, { color: subTextColor }]}>利用規約</Text>
                  </TouchableOpacity>
                  <Text style={[styles.linkSeparator, { color: subTextColor }]}> • </Text>
                  <TouchableOpacity onPress={openPrivacyPolicy}>
                    <Text style={[styles.linkText, { color: subTextColor }]}>プライバシーポリシー</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: '90%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D9D9D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Premium Status
  premiumStatusContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 30,
  },

  // Segmented Control
  segmentContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 100,
    padding: 3,
    width: 290,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  segmentButtonTextSelected: {
    fontWeight: '600',
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1877EE',
    marginTop: 8,
    letterSpacing: 1,
  },

  // Plan Card
  planCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 14,
    letterSpacing: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pricePeriod: {
    fontSize: 12,
  },

  // Purchase Button
  purchaseButton: {
    backgroundColor: '#242424',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 0,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // Free Trial Notice
  freeTrialNotice: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Features
  featuresContainer: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#B8B8B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    letterSpacing: 1,
  },

  // Restore Button
  restoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Terms
  termsContainer: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '300',
  },
  linkSeparator: {
    fontSize: 12,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
