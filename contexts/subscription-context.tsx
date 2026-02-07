import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAuth } from './auth-context';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

// ヘルパー関数: RevenueCatエラーの詳細ログ
function logRevenueCatError(context: string, error: any) {
  logger.error(`[Subscription] ${context} error details:`, {
    message: error.message,
    code: error.code,
    userCancelled: error.userCancelled,
    underlyingErrorMessage: error.underlyingErrorMessage,
    userInfo: error.userInfo,
  });
}

// ヘルパー関数: ユーザーフレンドリーなエラーメッセージに変換
function createUserFriendlyError(error: any): Error {
  let userMessage = '';

  switch (error.code) {
    case 'INVALID_CREDENTIALS_ERROR':
      userMessage = 'アプリの設定に問題があります。開発者にお問い合わせください。';
      break;
    case 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR':
      userMessage = 'この商品は現在購入できません。しばらくしてから再度お試しください。';
      break;
    case 'NETWORK_ERROR':
      userMessage = 'ネットワーク接続を確認してください。';
      break;
    case 'PAYMENT_PENDING_ERROR':
      userMessage = '支払いが保留中です。承認後に反映されます。';
      break;
    case 'PURCHASE_INVALID_ERROR':
      userMessage = 'この購入は無効です。アカウント設定を確認してください。';
      break;
    case 'PURCHASE_NOT_ALLOWED_ERROR':
      userMessage = 'このデバイスでは購入が許可されていません。';
      break;
    case 'STORE_PROBLEM_ERROR':
      userMessage = 'App Store に問題が発生しています。しばらくしてから再度お試しください。';
      break;
    default:
      userMessage = error.message || '購入中にエラーが発生しました。';
  }

  const enhancedError = new Error(userMessage);
  enhancedError.name = error.code || 'PurchaseError';
  // 元のエラーも保持（デバッグ用）
  (enhancedError as any).originalError = error;

  return enhancedError;
}

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  packages: PurchasesPackage[];
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  expiryDate: Date | null;
  customerInfo: CustomerInfo | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      initializePurchases();
    }
  }, [user]);

  const initializePurchases = async () => {
    if (!user) return;

    try {
      // APIキーが設定されていない場合はスキップ
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
        android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
      });

      if (!apiKey) {
        logger.info('[Subscription] RevenueCat API key not configured, skipping initialization');
        setIsLoading(false);
        return;
      }

      // 初期化パラメータをログ
      logger.info('[Subscription] Initializing RevenueCat:', {
        platform: Platform.OS,
        userId: user.id,
        hasApiKey: !!apiKey,
      });

      // RevenueCat初期化
      await Purchases.configure({
        apiKey,
        appUserID: user.id,
      });

      logger.info('[Subscription] RevenueCat configured for user:', user.id);

      // オファリング取得
      const offerings: PurchasesOfferings = await Purchases.getOfferings();

      // オファリング詳細をログ
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
        logger.info('[Subscription] Available packages:', {
          count: offerings.current.availablePackages.length,
          packages: offerings.current.availablePackages.map(pkg => ({
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            price: pkg.product.priceString,
            period: pkg.product.subscriptionPeriod,
          })),
        });
      } else {
        logger.warn('[Subscription] No current offering available');
      }

      // サブスク状態チェック
      await checkSubscriptionStatus();
    } catch (error: any) {
      // Expo GoではStoreKitが動作しないためエラーになる - 警告レベルに抑制
      if (error?.message?.includes('None of the products') ||
          error?.message?.includes('offerings')) {
        logger.warn('[Subscription] Could not fetch offerings (expected in Expo Go):', {
          message: error.message,
          code: error.code,
        });
      } else {
        logRevenueCatError('Failed to initialize', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // プレミアム entitlement チェック
      const premiumEntitlement = info.entitlements.active['premium'];
      const isActive = premiumEntitlement !== undefined;

      setIsPremium(isActive);

      if (isActive && premiumEntitlement.expirationDate) {
        const expiry = new Date(premiumEntitlement.expirationDate);
        setExpiryDate(expiry);
        logger.info('[Subscription] Premium active until:', expiry);

        // Supabaseと同期
        await syncToSupabase('active', expiry, info.originalAppUserId, Platform.OS);
      } else {
        setExpiryDate(null);
        await syncToSupabase('inactive', null, info.originalAppUserId, Platform.OS);
      }
    } catch (error) {
      logger.error('[Subscription] Failed to check status:', error);
    }
  };

  const syncToSupabase = async (
    status: string,
    expiresAt: Date | null,
    customerId: string,
    platform: string
  ) => {
    try {
      // RPC関数でサブスクリプションステータスを更新
      const { error: rpcError } = await supabase.rpc('update_subscription_status', {
        user_id: user?.id,
        status,
        expires_at: expiresAt?.toISOString(),
        customer_id: customerId,
        platform,
      });

      if (rpcError) {
        logger.error('[Subscription] Failed to sync to Supabase RPC:', rpcError);
      } else {
        logger.info('[Subscription] Synced to Supabase RPC:', status);
      }

      // バックエンドが読み取るuser_metadataにisPremiumを設定
      // これにより、バックエンドのauthミドルウェアがisPremiumを正しく取得できる
      const isPremiumStatus = status === 'active';
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { isPremium: isPremiumStatus }
      });

      if (metadataError) {
        logger.error('[Subscription] Failed to update user_metadata:', metadataError);
      } else {
        logger.info('[Subscription] user_metadata.isPremium updated to:', isPremiumStatus);
      }
    } catch (error) {
      logger.error('[Subscription] Sync error:', error);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage) => {
    try {
      logger.info('[Subscription] Starting purchase:', {
        identifier: pkg.identifier,
        productIdentifier: pkg.product.identifier,
        price: pkg.product.priceString,
        subscriptionPeriod: pkg.product.subscriptionPeriod,
      });
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      await checkSubscriptionStatus();
      logger.info('[Subscription] Purchase successful');
    } catch (error: any) {
      if (error.userCancelled) {
        logger.info('[Subscription] Purchase cancelled by user');
        // Don't throw for user cancellation - it's not an error
        return;
      }

      logRevenueCatError('Purchase failed', error);

      // Create user-friendly error message
      const enhancedError = createUserFriendlyError(error);
      throw enhancedError;
    }
  };

  const restorePurchases = async () => {
    try {
      logger.info('[Subscription] Restoring purchases');
      const info: CustomerInfo = await Purchases.restorePurchases();
      setCustomerInfo(info);
      await checkSubscriptionStatus();
      logger.info('[Subscription] Restore successful');
    } catch (error: any) {
      logRevenueCatError('Restore failed', error);

      // Create user-friendly error message
      const enhancedError = createUserFriendlyError(error);
      throw enhancedError;
    }
  };

  const value: SubscriptionContextType = {
    isPremium,
    isLoading,
    packages,
    purchasePackage,
    restorePurchases,
    expiryDate,
    customerInfo,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
