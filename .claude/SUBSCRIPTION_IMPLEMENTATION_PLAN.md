# Lingooo サブスクリプション機能実装プラン

**作成日**: 2025-01-18
**ステータス**: 実装待ち
**推定工数**: 4週間（1人フルタイム）
**技術リスク**: 低

---

## 📋 目次

1. [プレミアムプラン機能定義](#プレミアムプラン機能定義)
2. [実装ロードマップ](#実装ロードマップ)
3. [技術選定](#技術選定)
4. [コスト・収益分析](#コスト収益分析)
5. [新規ファイル一覧](#新規ファイル一覧)
6. [完成チェックリスト](#完成チェックリスト)

---

## 💎 プレミアムプラン機能定義

### **Lingooo Premium（月額500円）**

| 機能 | 無料版 | プレミアム | 実装状況 |
|------|--------|-----------|---------|
| **AI質問回数** | 月100回 | 月1,000回 | ✅ 実装済み（制限強化のみ） |
| **翻訳文字数** | 4,000文字/回 | 50,000文字/回 | ❌ 未実装 |
| **ブックマークフォルダ** | ❌ 利用不可 | ✅ 無制限 | ✅ 実装済み（制限追加） |
| **学習言語登録** | 3言語まで | 無制限 | ❌ 未実装 |
| **AI応答詳細度** | 簡潔のみ | 簡潔・詳細選択可 | ✅ 実装済み（制限追加） |
| **使用AIモデル** | Gemini Flash | Gemini Flash | ✅ 実装不要 |

### プレミアムプランの価値提案

**キャッチコピー:**
「制限なく、好きなだけ言葉を探究できるAI辞書」

**主な訴求ポイント:**
1. **10倍の質問回数** - 月100回 → 1,000回
2. **12.5倍の翻訳容量** - 4,000文字 → 50,000文字
3. **整理機能** - ブックマークをフォルダで分類
4. **多言語対応** - 3言語 → 無制限
5. **詳細なAI回答** - 語源・背景まで深掘り

---

## 🛠️ 実装ロードマップ（4週間）

### **Week 1: サブスク基盤構築**

#### Day 1-2: RevenueCat セットアップ

**タスク:**
- [ ] RevenueCat アカウント作成
- [ ] App Store Connect で IAP 商品登録
  - 商品ID: `com.lingooo.premium.monthly`
  - 価格: ¥500/月
  - 7日間無料トライアル設定
- [ ] Google Play Console で商品登録
- [ ] SDK インストール: `npx expo install react-native-purchases`
- [ ] 環境変数追加（`.env`, `eas.json`）
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

**成果物:**
- RevenueCat ダッシュボード設定完了
- IAP商品ID取得完了

---

#### Day 3: データベース拡張

**新規マイグレーション:**
`lingooo-mobile/supabase/migrations/002_add_subscription_fields.sql`

```sql
-- サブスクリプション関連フィールドを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_platform VARCHAR(20);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_users_subscription_status
ON users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_users_subscription_expires
ON users(subscription_expires_at);

-- サブスクリプションステータス更新関数
CREATE OR REPLACE FUNCTION update_subscription_status(
  user_id UUID,
  status VARCHAR(20),
  expires_at TIMESTAMP,
  customer_id VARCHAR(255),
  platform VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET
    subscription_status = status,
    subscription_expires_at = expires_at,
    revenuecat_customer_id = customer_id,
    subscription_platform = platform,
    plan = CASE
      WHEN status = 'active' THEN 'plus'
      ELSE 'free'
    END
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_subscription_status TO authenticated;

COMMENT ON FUNCTION update_subscription_status IS
'Update user subscription status from RevenueCat webhook';
```

**成果物:**
- Supabase マイグレーション適用完了

---

#### Day 4-5: Subscription Context 実装

**新規ファイル:**
`lingooo-mobile/contexts/subscription-context.tsx`

```typescript
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
      // RevenueCat初期化
      await Purchases.configure({
        apiKey: Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS!,
          android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID!,
        })!,
        appUserID: user.id,
      });

      logger.info('[Subscription] RevenueCat configured for user:', user.id);

      // オファリング取得
      const offerings: PurchasesOfferings = await Purchases.getOfferings();
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
        logger.info('[Subscription] Available packages:', offerings.current.availablePackages.length);
      }

      // サブスク状態チェック
      await checkSubscriptionStatus();
    } catch (error) {
      logger.error('[Subscription] Failed to initialize:', error);
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
      const { error } = await supabase.rpc('update_subscription_status', {
        user_id: user?.id,
        status,
        expires_at: expiresAt?.toISOString(),
        customer_id: customerId,
        platform,
      });

      if (error) {
        logger.error('[Subscription] Failed to sync to Supabase:', error);
      } else {
        logger.info('[Subscription] Synced to Supabase:', status);
      }
    } catch (error) {
      logger.error('[Subscription] Sync error:', error);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage) => {
    try {
      logger.info('[Subscription] Starting purchase:', pkg.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      await checkSubscriptionStatus();
      logger.info('[Subscription] Purchase successful');
    } catch (error: any) {
      if (!error.userCancelled) {
        logger.error('[Subscription] Purchase failed:', error);
        throw error;
      }
      logger.info('[Subscription] Purchase cancelled by user');
    }
  };

  const restorePurchases = async () => {
    try {
      logger.info('[Subscription] Restoring purchases');
      const info: CustomerInfo = await Purchases.restorePurchases();
      setCustomerInfo(info);
      await checkSubscriptionStatus();
      logger.info('[Subscription] Restore successful');
    } catch (error) {
      logger.error('[Subscription] Restore failed:', error);
      throw error;
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
```

**変更ファイル:**
`lingooo-mobile/app/_layout.tsx` - SubscriptionProviderを追加

```typescript
import { SubscriptionProvider } from '@/contexts/subscription-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        {/* 既存のコンテンツ */}
      </SubscriptionProvider>
    </AuthProvider>
  );
}
```

**成果物:**
- サブスクリプション状態管理完了
- RevenueCat SDK統合完了

---

### **Week 2: プレミアム機能制限実装**

#### Day 6-7: 翻訳文字数制限

**変更ファイル:**
`lingooo-mobile/constants/validation.ts`

```typescript
// プラン別の文字数制限
export const MAX_TEXT_LENGTH_FREE = 4000;
export const MAX_TEXT_LENGTH_PREMIUM = 50000;

export function getMaxTextLength(isPremium: boolean): number {
  return isPremium ? MAX_TEXT_LENGTH_PREMIUM : MAX_TEXT_LENGTH_FREE;
}
```

**変更ファイル:**
`lingooo-mobile/app/(tabs)/translate.tsx` (翻訳画面)

```typescript
import { useSubscription } from '@/contexts/subscription-context';
import { getMaxTextLength } from '@/constants/validation';

export default function TranslateScreen() {
  const { isPremium } = useSubscription();
  const maxLength = getMaxTextLength(isPremium);

  const handleTranslate = async () => {
    if (inputText.length > maxLength) {
      Alert.alert(
        '文字数制限',
        `翻訳は${maxLength.toLocaleString()}文字以内にしてください。\n\n${
          !isPremium ? 'プレミアムプランなら50,000文字まで翻訳できます。' : ''
        }`,
        [
          { text: 'OK' },
          ...(!isPremium ? [{ text: 'プレミアムを見る', onPress: () => router.push('/subscription') }] : []),
        ]
      );
      return;
    }
    // ... 翻訳処理
  };

  return (
    <View>
      <TextInput
        value={inputText}
        onChangeText={setInputText}
        maxLength={maxLength}
      />
      <Text style={styles.charCount}>
        {inputText.length.toLocaleString()} / {maxLength.toLocaleString()}文字
        {!isPremium && ' (無料版)'}
      </Text>
    </View>
  );
}
```

**バックエンド変更:**
`lingooo-backend/src/routes/translate.ts`

```typescript
router.post('/translate', authenticate, enforceQuota, async (req, res) => {
  const { text } = req.body;
  const user = req.user;

  // プラン判定
  const isPremium =
    user.plan === 'plus' &&
    user.subscription_status === 'active' &&
    new Date(user.subscription_expires_at) > new Date();

  const maxLength = isPremium ? 50000 : 4000;

  if (text.length > maxLength) {
    return res.status(400).json({
      error: 'Text too long',
      message: `テキストは${maxLength.toLocaleString()}文字以内にしてください`,
      isPremium,
      maxLength,
    });
  }

  // ... 翻訳処理
});
```

**成果物:**
- 翻訳文字数制限実装完了

---

#### Day 8-9: 学習言語3言語制限

**変更ファイル:**
`lingooo-mobile/contexts/learning-languages-context.tsx`

```typescript
import { useSubscription } from './subscription-context';
import { router } from 'expo-router';

const MAX_LANGUAGES_FREE = 3;

export function LearningLanguagesProvider({ children }: LearningLanguagesProviderProps) {
  const { isPremium } = useSubscription();

  const addLearningLanguage = async (languageId: string) => {
    if (!user) return;

    // プレミアムでない場合は3言語制限
    if (!isPremium && learningLanguages.length >= MAX_LANGUAGES_FREE) {
      Alert.alert(
        '学習言語の上限',
        `無料版では${MAX_LANGUAGES_FREE}言語まで登録できます。\n\nプレミアムプランなら無制限に登録できます。`,
        [
          { text: 'キャンセル' },
          { text: 'プレミアムを見る', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }

    // ... 既存の追加ロジック
  };

  return (
    <LearningLanguagesContext.Provider value={{ ... }}>
      {children}
    </LearningLanguagesContext.Provider>
  );
}
```

**成果物:**
- 学習言語3言語制限完了

---

#### Day 10-11: ブックマークフォルダのプレミアム化

**変更ファイル:**
`lingooo-mobile/app/(tabs)/bookmarks.tsx`

```typescript
import { useSubscription } from '@/contexts/subscription-context';

export default function BookmarksScreen() {
  const { isPremium } = useSubscription();

  const handleCreateFolder = () => {
    if (!isPremium) {
      Alert.alert(
        'プレミアム機能',
        'フォルダ機能はプレミアム限定です。\n\nブックマークを整理してより効率的に学習しましょう。',
        [
          { text: 'キャンセル' },
          { text: 'プレミアムを見る', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    setIsCreateFolderModalOpen(true);
  };

  return (
    <View>
      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab('all')}>
          <Text>すべて</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (!isPremium) {
              Alert.alert(
                'プレミアム機能',
                'フォルダ機能はプレミアム限定です。',
                [
                  { text: 'キャンセル' },
                  { text: 'プレミアムを見る', onPress: () => router.push('/subscription') },
                ]
              );
              return;
            }
            setActiveTab('folders');
          }}
        >
          <View style={styles.tabItem}>
            <Text>フォルダ</Text>
            {!isPremium && <LockIcon size={16} color="#686868" />}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**成果物:**
- ブックマークフォルダのプレミアム制限完了

---

#### Day 12: AI詳細度のプレミアム専用化

**変更ファイル:**
`lingooo-mobile/app/(tabs)/settings.tsx`

```typescript
import { useSubscription } from '@/contexts/subscription-context';

export default function SettingsScreen() {
  const { isPremium } = useSubscription();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();

  return (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.labelRow}>
          <Text style={styles.settingLabel}>AI返答の詳細度</Text>
          {!isPremium && <LockIcon size={16} color="#686868" />}
        </View>
        <Text style={styles.settingDescription}>
          {aiDetailLevel === 'concise' ? '簡潔（デフォルト）' : '詳細（語源・追加例文含む）'}
        </Text>
      </View>
      <Switch
        value={aiDetailLevel === 'detailed'}
        onValueChange={(value) => {
          if (value && !isPremium) {
            Alert.alert(
              'プレミアム機能',
              '詳細なAI応答はプレミアム限定です。\n\n語源、ニュアンス、文化的背景まで深く学べます。',
              [
                { text: 'キャンセル' },
                { text: 'プレミアムを見る', onPress: () => router.push('/subscription') },
              ]
            );
            return;
          }
          setAIDetailLevel(value ? 'detailed' : 'concise');
        }}
        disabled={!isPremium && aiDetailLevel === 'concise'}
        trackColor={{ false: '#D1D1D1', true: '#111111' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
```

**成果物:**
- AI詳細度制限完了

---

### **Week 3: UI/UX実装**

#### Day 13-15: ペイウォールUI

**新規ファイル:**
`lingooo-mobile/components/paywall/premium-paywall.tsx`

```typescript
import { Modal, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscription } from '@/contexts/subscription-context';
import { router } from 'expo-router';

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function PremiumPaywall({ visible, onClose, feature }: PremiumPaywallProps) {
  const { packages, purchasePackage, isLoading } = useSubscription();

  const handlePurchase = async () => {
    if (packages.length === 0) return;

    try {
      await purchasePackage(packages[0]);
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const monthlyPackage = packages.find((pkg) => pkg.packageType === 'MONTHLY');
  const price = monthlyPackage?.product.priceString || '¥500';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* タイトル */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Lingooo Premium</Text>
          <Text style={styles.subtitle}>制限なく、好きなだけ言葉を探究</Text>
        </View>

        {/* 機能比較 */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            title="AI質問回数"
            free="月100回まで"
            premium="月1,000回まで"
            highlight
          />
          <FeatureItem
            title="翻訳文字数"
            free="4,000文字/回"
            premium="50,000文字/回"
          />
          <FeatureItem
            title="ブックマークフォルダ"
            free="利用不可"
            premium="無制限"
          />
          <FeatureItem
            title="学習言語登録"
            free="3言語まで"
            premium="無制限"
          />
          <FeatureItem
            title="AI応答詳細度"
            free="簡潔のみ"
            premium="簡潔・詳細"
          />
        </View>

        {/* 価格 */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>月額</Text>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.trial}>7日間無料トライアル</Text>
        </View>

        {/* 購入ボタン */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          <Text style={styles.purchaseButtonText}>
            {isLoading ? '処理中...' : '無料トライアルを開始'}
          </Text>
        </TouchableOpacity>

        {/* 注意事項 */}
        <Text style={styles.disclaimer}>
          7日間の無料トライアル後、自動的に{price}/月で更新されます。
          いつでもキャンセル可能です。
        </Text>

        {/* リンク */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.link}>利用規約</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>・</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.link}>プライバシーポリシー</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

interface FeatureItemProps {
  title: string;
  free: string;
  premium: string;
  highlight?: boolean;
}

function FeatureItem({ title, free, premium, highlight }: FeatureItemProps) {
  return (
    <View style={[styles.featureItem, highlight && styles.featureItemHighlight]}>
      <Text style={styles.featureTitle}>{title}</Text>
      <View style={styles.featureComparison}>
        <View style={styles.featureColumn}>
          <Text style={styles.featureLabel}>無料</Text>
          <Text style={styles.featureFree}>{free}</Text>
        </View>
        <View style={styles.featureColumn}>
          <Text style={styles.featureLabel}>Premium</Text>
          <Text style={styles.featurePremium}>{premium}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 32,
    color: '#686868',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#686868',
  },
  featuresContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  featureItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  featureItemHighlight: {
    backgroundColor: '#E6F4FE',
    borderWidth: 2,
    borderColor: '#00AA69',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
  },
  featureComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureColumn: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 12,
    color: '#686868',
    marginBottom: 4,
  },
  featureFree: {
    fontSize: 14,
    color: '#111111',
  },
  featurePremium: {
    fontSize: 14,
    color: '#00AA69',
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  priceLabel: {
    fontSize: 14,
    color: '#686868',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111111',
  },
  trial: {
    fontSize: 14,
    color: '#00AA69',
    fontWeight: '600',
    marginTop: 8,
  },
  purchaseButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#686868',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 32,
  },
  link: {
    fontSize: 12,
    color: '#00AA69',
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    fontSize: 12,
    color: '#686868',
    marginHorizontal: 8,
  },
});
```

**新規ファイル:**
`lingooo-mobile/components/paywall/quota-exceeded-modal.tsx`

```typescript
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuestionCount } from '@/hooks/use-question-count';

interface QuotaExceededModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QuotaExceededModal({ visible, onClose }: QuotaExceededModalProps) {
  const { questionCount } = useQuestionCount();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>今月の質問回数を使い切りました</Text>

          <View style={styles.quotaInfo}>
            <Text style={styles.quotaText}>
              {questionCount.monthly} / {questionCount.limit}回
            </Text>
          </View>

          <Text style={styles.message}>
            来月まで待つか、プレミアムプランにアップグレードして
            月1,000回まで質問できるようになります。
          </Text>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              onClose();
              router.push('/subscription');
            }}
          >
            <Text style={styles.upgradeButtonText}>プレミアムを見る</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 16,
  },
  quotaInfo: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  quotaText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
  },
  message: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 14,
  },
  closeButtonText: {
    color: '#686868',
    fontSize: 16,
    textAlign: 'center',
  },
});
```

**成果物:**
- ペイウォールUI完成
- クォータ超過モーダル完成

---

#### Day 16-17: サブスクリプション管理画面

**新規ファイル:**
`lingooo-mobile/app/subscription.tsx`

```typescript
import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubscription } from '@/contexts/subscription-context';
import { PremiumPaywall } from '@/components/paywall/premium-paywall';

export default function SubscriptionScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const { isPremium, expiryDate, restorePurchases, isLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert('復元完了', '購入情報を復元しました。');
    } catch (error) {
      Alert.alert('復元失敗', '購入情報の復元に失敗しました。');
    }
  };

  const handleManageSubscription = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';

    Linking.openURL(url);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar pageType="other" title="サブスクリプション" onBackPress={() => router.back()} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {isPremium ? (
            <View style={styles.premiumContainer}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badge}>Premium</Text>
              </View>

              <Text style={styles.statusTitle}>プレミアム会員</Text>
              <Text style={styles.statusSubtitle}>すべての機能をお楽しみいただけます</Text>

              {expiryDate && (
                <View style={styles.expiryContainer}>
                  <Text style={styles.expiryLabel}>有効期限</Text>
                  <Text style={styles.expiryDate}>{formatDate(expiryDate)}</Text>
                </View>
              )}

              <View style={styles.featuresContainer}>
                <FeatureItem icon="✓" text="AI質問 月1,000回" />
                <FeatureItem icon="✓" text="翻訳 50,000文字/回" />
                <FeatureItem icon="✓" text="ブックマークフォルダ無制限" />
                <FeatureItem icon="✓" text="学習言語登録無制限" />
                <FeatureItem icon="✓" text="詳細なAI応答" />
              </View>

              <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
                <Text style={styles.manageButtonText}>サブスクリプションを管理</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.freeContainer}>
              <Text style={styles.freeTitle}>無料プラン</Text>
              <Text style={styles.freeSubtitle}>基本機能をご利用いただけます</Text>

              <View style={styles.limitationsContainer}>
                <Text style={styles.limitationsTitle}>現在の制限</Text>
                <LimitationItem text="AI質問 月100回まで" />
                <LimitationItem text="翻訳 4,000文字/回" />
                <LimitationItem text="ブックマークフォルダ利用不可" />
                <LimitationItem text="学習言語3言語まで" />
                <LimitationItem text="簡潔なAI応答のみ" />
              </View>

              <TouchableOpacity style={styles.upgradeButton} onPress={() => setShowPaywall(true)}>
                <Text style={styles.upgradeButtonText}>プレミアムにアップグレード</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleRestore} disabled={isLoading}>
              <Text style={styles.actionButtonText}>購入情報を復元</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <PremiumPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </ThemedView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function LimitationItem({ text }: { text: string }) {
  return (
    <View style={styles.limitationItem}>
      <Text style={styles.limitationDot}>•</Text>
      <Text style={styles.limitationText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  premiumContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#111111',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#686868',
    marginBottom: 24,
  },
  expiryContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  expiryLabel: {
    fontSize: 12,
    color: '#686868',
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 18,
    color: '#00AA69',
  },
  featureText: {
    fontSize: 14,
    color: '#111111',
  },
  manageButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
  },
  freeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  freeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  freeSubtitle: {
    fontSize: 14,
    color: '#686868',
    marginBottom: 24,
  },
  limitationsContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  limitationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
  },
  limitationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  limitationDot: {
    fontSize: 14,
    color: '#686868',
  },
  limitationText: {
    fontSize: 14,
    color: '#686868',
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#00AA69',
    textAlign: 'center',
  },
});
```

**成果物:**
- サブスクリプション管理画面完成

---

#### Day 18: 設定画面統合

**変更ファイル:**
`lingooo-mobile/app/(tabs)/settings.tsx`

```typescript
import { useSubscription } from '@/contexts/subscription-context';

export default function SettingsScreen() {
  const { isPremium, expiryDate } = useSubscription();

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <ScrollView>
      {/* アカウント設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>

        {/* サブスクリプション */}
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/subscription')}>
          <View style={styles.settingInfo}>
            <View style={styles.labelRow}>
              <Text style={styles.settingLabel}>
                {isPremium ? 'プレミアム会員' : 'プレミアムプラン'}
              </Text>
              {isPremium && <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>}
            </View>
            <Text style={styles.settingDescription}>
              {isPremium
                ? `有効期限: ${formatDate(expiryDate)}`
                : 'アップグレードして全機能を解放'}
            </Text>
          </View>
          <ChevronRightIcon />
        </TouchableOpacity>

        {/* プロフィール */}
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/profile')}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>プロフィール</Text>
            <Text style={styles.settingDescription}>アカウント情報を管理</Text>
          </View>
          <ChevronRightIcon />
        </TouchableOpacity>
      </View>

      {/* ... 既存の設定項目 */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... 既存のスタイル
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
```

**成果物:**
- 設定画面にプレミアム表示完了

---

### **Week 4: バックエンド連携・テスト**

#### Day 19-21: Webhook処理

**新規ファイル:**
`lingooo-backend/src/routes/webhook.ts`

```typescript
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * RevenueCat Webhook署名検証
 */
function verifyRevenueCatSignature(body: any, signature: string | undefined): boolean {
  if (!signature) return false;

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] REVENUECAT_WEBHOOK_SECRET not set');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * RevenueCat Webhook エンドポイント
 */
router.post('/revenuecat', async (req: Request, res: Response) => {
  console.log('[Webhook] Received RevenueCat event');

  // 署名検証
  const signature = req.headers['x-revenuecat-signature'] as string;
  const isValid = verifyRevenueCatSignature(req.body, signature);

  if (!isValid) {
    console.error('[Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, app_user_id, product_id, expiration_at_ms, presented_offering_id } = req.body;

  console.log('[Webhook] Event:', {
    type: event?.type,
    userId: app_user_id,
    product: product_id,
  });

  try {
    // イベントタイプに応じて処理
    switch (event?.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        await updateSubscription(
          app_user_id,
          'active',
          new Date(expiration_at_ms),
          app_user_id,
          'mobile'
        );
        console.log('[Webhook] Subscription activated for:', app_user_id);
        break;

      case 'CANCELLATION':
        // キャンセルされても有効期限まで使える
        console.log('[Webhook] Subscription cancelled (but still active until expiry):', app_user_id);
        break;

      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        await updateSubscription(app_user_id, 'inactive', null, app_user_id, 'mobile');
        console.log('[Webhook] Subscription expired for:', app_user_id);
        break;

      case 'PRODUCT_CHANGE':
        await updateSubscription(
          app_user_id,
          'active',
          new Date(expiration_at_ms),
          app_user_id,
          'mobile'
        );
        console.log('[Webhook] Subscription product changed for:', app_user_id);
        break;

      default:
        console.log('[Webhook] Unhandled event type:', event?.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * サブスクリプション状態を更新
 */
async function updateSubscription(
  userId: string,
  status: string,
  expiresAt: Date | null,
  customerId: string,
  platform: string
): Promise<void> {
  // Supabaseのupdate_subscription_status関数を呼び出し
  const { error } = await supabase.rpc('update_subscription_status', {
    user_id: userId,
    status,
    expires_at: expiresAt?.toISOString() || null,
    customer_id: customerId,
    platform,
  });

  if (error) {
    console.error('[Webhook] Failed to update subscription:', error);
    throw error;
  }

  console.log('[Webhook] Subscription updated in database:', {
    userId,
    status,
    expiresAt: expiresAt?.toISOString(),
  });
}

export default router;
```

**変更ファイル:**
`lingooo-backend/src/index.ts`

```typescript
import webhookRouter from './routes/webhook';

// Webhook（認証不要）
app.use('/api/webhook', webhookRouter);
```

**環境変数追加:**
`lingooo-backend/.env`

```
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

**成果物:**
- RevenueCat Webhook処理完了
- Supabase自動同期完了

---

#### Day 22-24: テスト

**テストチェックリスト:**

**1. 購入フロー**
- [ ] iOS サンドボックス購入
- [ ] Android Test 購入
- [ ] トライアル期間の動作（7日間無料）
- [ ] 購入後すぐにプレミアム機能が使える
- [ ] 購入失敗時のエラーハンドリング

**2. 制限機能（無料ユーザー）**
- [ ] AI質問が月100回で制限される
- [ ] 翻訳が4,000文字で制限される
- [ ] 学習言語が3言語で制限される
- [ ] ブックマークフォルダが作成できない
- [ ] AI詳細度が「詳細」に切り替えられない
- [ ] 制限到達時にペイウォールが表示される

**3. 制限解除（プレミアムユーザー）**
- [ ] AI質問が月1,000回使える
- [ ] 翻訳が50,000文字使える
- [ ] 学習言語が無制限に登録できる
- [ ] ブックマークフォルダが作成できる
- [ ] AI詳細度が「詳細」に切り替えられる

**4. リストア機能**
- [ ] 機種変更後にリストアできる
- [ ] アプリ削除・再インストール後にリストアできる
- [ ] リストアボタンが正常に動作する

**5. Webhook**
- [ ] 購入イベントでデータベースが更新される
- [ ] 更新イベントで有効期限が延長される
- [ ] キャンセルイベント後も期限まで使える
- [ ] 有効期限切れで無料プランに戻る

**6. UI/UX**
- [ ] ペイウォールが適切に表示される
- [ ] 設定画面にプレミアムステータスが表示される
- [ ] サブスクリプション管理画面が正常に動作する
- [ ] ローディング状態が適切に表示される

**成果物:**
- 全テスト項目クリア
- バグ修正完了

---

#### Day 25-28: リリース準備

**App Store 対応:**

1. **スクリーンショット更新**
   - プレミアム機能の説明画像追加
   - ペイウォールのスクリーンショット
   - 機能比較表のスクリーンショット

2. **App説明文更新**
   ```
   【無料版】
   - AI質問 月100回
   - 翻訳 4,000文字/回
   - 基本的なブックマーク機能

   【プレミアム版（月額500円）】
   - AI質問 月1,000回
   - 翻訳 50,000文字/回
   - ブックマークフォルダ無制限
   - 学習言語登録無制限
   - 詳細なAI応答
   - 7日間無料トライアル
   ```

3. **プライバシーポリシー更新**
   - サブスクリプション情報の取り扱い
   - RevenueCat連携について
   - 自動更新に関する記載

4. **利用規約更新**
   - サブスクリプション規約
   - 返金ポリシー
   - キャンセルポリシー

5. **IAP審査情報**
   - テストアカウント情報
   - サンドボックス購入手順
   - スクリーンショット・動画

**リリース手順:**

1. EAS Build（production）
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

2. TestFlight配信
   ```bash
   eas submit --platform ios --profile production
   ```

3. ベータテスター募集（10〜20名）
   - サブスク購入テスト
   - 機能制限テスト
   - UI/UXフィードバック

4. フィードバック収集・改善
   - バグ修正
   - UI改善
   - パフォーマンス最適化

5. App Store 審査提出
   - 審査ノート記載
   - デモ動画添付
   - IAP審査情報提出

**成果物:**
- App Store 審査提出完了
- Google Play Console 申請完了

---

## 🎯 技術選定

### RevenueCat 採用理由

**選定理由:**
1. ✅ **Expo完全対応** - SDK統合が簡単
2. ✅ **クロスプラットフォーム** - iOS/Android両対応
3. ✅ **レシート検証自動化** - サーバー実装不要
4. ✅ **無料枠** - 月$2,500売上まで無料（100人課金まで無料）
5. ✅ **リストア機能** - 機種変更時の復元が簡単
6. ✅ **Webhook対応** - サブスク状態の自動同期
7. ✅ **ドキュメント充実** - 実装例豊富

**代替案との比較:**

| 項目 | RevenueCat | Stripe | 直接IAP |
|------|-----------|--------|---------|
| モバイルIAP対応 | ◎ | △ | ◎ |
| 実装難易度 | 易 | 難 | 中 |
| レシート検証 | 自動 | 手動 | 手動 |
| 無料枠 | $2,500/月 | なし | - |
| Webhook | ◎ | ◎ | △ |

**結論: RevenueCatが最適**

---

### Gemini Flash 継続の判断

**コスト比較:**

| モデル | 入力単価 | 出力単価 | 1リクエスト |
|--------|---------|---------|-----------|
| **Flash** | $0.075/M | $0.30/M | **0.04円** |
| Pro | $1.25/M | $5.00/M | 0.68円 |

**プレミアムユーザーのコスト試算:**

```
月1,000回使用時:

Flash: 1,000回 × 0.04円 = 40円/月
  → 売上500円 - コスト40円 = 利益460円（利益率92%）

Pro: 1,000回 × 0.68円 = 680円/月
  → 売上500円 - コスト680円 = 赤字180円
```

**Flash継続の理由:**

1. ✅ **コスト効率が圧倒的** - 利益率92%維持
2. ✅ **品質が十分** - 辞書・翻訳用途で高品質
3. ✅ **差別化が十分** - 回数・機能制限で価値提供
4. ✅ **スケーラブル** - ユーザー増加に対応可能

**代替の差別化戦略:**

```typescript
// プレミアム限定の詳細プロンプト
const premiumPrompt = `英単語"${word}"について以下を含めて詳しく説明：
1. 語源と歴史
2. ニュアンスと類義語との違い
3. 文化的背景
4. フォーマル/カジュアルな使い分け
5. 5つ以上の実用例文
6. よくある間違い`;
```

**結論: Flashで十分！Proは不採用**

---

## 💰 コスト・収益分析

### 固定費（月額）

- バックエンドサーバー（Render等）: 7,000円
- データベース（Supabase Pro）: 3,500円
- Redis（Upstash等）: 1,500円
- 開発・保守費用: 18,000円
- **合計固定費: 30,000円/月**

### 変動費（ユーザーあたり）

- Gemini API（月1,000回使用）: 40円/月
- その他通信費: 10円/月
- **合計変動費: 50円/月/ユーザー**

### 売上

- プレミアムプラン: 500円/月/ユーザー
- **粗利: 450円/月/ユーザー**（500円 - 50円）

### 損益分岐点

```
固定費 ÷ 粗利 = 必要ユーザー数
30,000円 ÷ 450円 = 67人
```

**損益分岐点: 67人のプレミアムユーザー**

### 目標利益別のユーザー数

| 目標利益 | 必要ユーザー数 | 月間売上 | 月間利益 | 利益率 |
|---------|--------------|---------|---------|--------|
| 黒字化 | **67人** | 33,500円 | 150円 | 0.4% |
| 月1万利益 | 89人 | 44,500円 | 10,050円 | 22.6% |
| 月5万利益 | 178人 | 89,000円 | 50,100円 | 56.3% |
| **月10万利益** | **289人** | **144,500円** | **100,050円** | **69.2%** |
| 月20万利益 | 511人 | 255,500円 | 200,000円 | 78.3% |
| **月50万利益** | **1,178人** | **589,000円** | **500,000円** | **84.9%** |

### ユーザー数別の損益表

| ユーザー数 | 月間売上 | 変動費 | 固定費 | 月間利益 | 利益率 |
|-----------|---------|--------|--------|---------|--------|
| 50人 | 25,000円 | 2,500円 | 30,000円 | **-7,500円** ❌ | -30.0% |
| 67人 | 33,500円 | 3,350円 | 30,000円 | **+150円** ✅ | 0.4% |
| **100人** | **50,000円** | **5,000円** | **30,000円** | **+15,000円** ✅ | **30.0%** |
| 200人 | 100,000円 | 10,000円 | 30,000円 | **+60,000円** ✅ | 60.0% |
| 289人 | 144,500円 | 14,450円 | 30,000円 | **+100,050円** ✅ | 69.2% |
| **500人** | **250,000円** | **25,000円** | **30,000円** | **+195,000円** ✅ | **78.0%** |
| 1,000人 | 500,000円 | 50,000円 | 30,000円 | **+420,000円** ✅ | 84.0% |

### マイルストーン

**Phase 1: 生き残る（損益分岐）**
- 目標: 67人のプレミアムユーザー
- 期間: 3ヶ月以内
- 利益: 0円（収支トントン）

**Phase 2: 安定する（100人）**
- 目標: 100人のプレミアムユーザー
- 期間: 6ヶ月以内
- 利益: 月15,000円

**Phase 3: 成長する（500人）**
- 目標: 500人のプレミアムユーザー
- 期間: 18ヶ月以内
- 利益: 月195,000円

---

## 📁 新規ファイル一覧

### モバイルアプリ（11ファイル）

```
lingooo-mobile/
├── contexts/
│   └── subscription-context.tsx           [NEW] サブスク状態管理
├── components/
│   └── paywall/
│       ├── premium-paywall.tsx            [NEW] ペイウォールUI
│       └── quota-exceeded-modal.tsx       [NEW] クォータ超過モーダル
├── app/
│   └── subscription.tsx                   [NEW] サブスク管理画面
├── hooks/
│   └── use-premium-check.ts               [NEW] プレミアム判定Hook
├── supabase/migrations/
│   └── 002_add_subscription_fields.sql    [NEW] DBマイグレーション
├── types/
│   └── subscription.ts                    [NEW] サブスク型定義
└── utils/
    └── paywall-manager.ts                 [NEW] ペイウォール管理
```

### バックエンド（3ファイル）

```
lingooo-backend/
├── src/
│   ├── routes/
│   │   └── webhook.ts                     [NEW] RevenueCat Webhook
│   ├── middleware/
│   │   └── premium-check.ts               [NEW] プレミアム判定
│   └── utils/
│       └── revenuecat-verify.ts           [NEW] Webhook署名検証
```

### 変更ファイル

**モバイルアプリ:**
- `app/_layout.tsx` - SubscriptionProvider追加
- `app/(tabs)/settings.tsx` - プレミアム表示追加
- `app/(tabs)/bookmarks.tsx` - フォルダ制限追加
- `app/(tabs)/translate.tsx` - 文字数制限追加
- `contexts/learning-languages-context.tsx` - 言語数制限追加
- `constants/validation.ts` - 文字数制限定数追加

**バックエンド:**
- `src/index.ts` - Webhook ルート追加
- `src/routes/translate.ts` - プレミアム判定追加
- `src/middleware/quota.ts` - プレミアム除外ロジック

---

## ✅ 完成チェックリスト

### 機能実装

- [ ] RevenueCat SDK統合完了
- [ ] サブスクリプション購入フロー動作
- [ ] 7日間無料トライアル設定完了
- [ ] AI質問回数制限（無料100回/月、プレミアム1,000回/月）
- [ ] 翻訳文字数制限（無料4,000文字、プレミアム50,000文字）
- [ ] 学習言語3言語制限（無料のみ）
- [ ] ブックマークフォルダ制限（プレミアムのみ）
- [ ] AI詳細度制限（プレミアムのみ）
- [ ] ペイウォールUI実装
- [ ] サブスクリプション管理画面実装
- [ ] 設定画面にプレミアム表示

### テスト

- [ ] iOS サンドボックス購入成功
- [ ] Android Test 購入成功
- [ ] トライアル期間正常動作
- [ ] 購入後すぐに機能解放
- [ ] リストア機能動作確認
- [ ] 無料ユーザーの制限確認
- [ ] プレミアムユーザーの解放確認
- [ ] Webhook動作確認
- [ ] データベース同期確認

### リリース準備

- [ ] App Store スクリーンショット更新
- [ ] App 説明文更新
- [ ] プライバシーポリシー更新
- [ ] 利用規約更新
- [ ] IAP審査情報準備
- [ ] TestFlight ベータテスト完了
- [ ] バグ修正完了
- [ ] パフォーマンス最適化完了
- [ ] App Store 審査提出
- [ ] Google Play Console 申請

---

## 🚀 次のステップ

1. **Week 1 開始**: RevenueCat アカウント作成
2. **マイルストーン設定**: 3ヶ月で67人、6ヶ月で100人
3. **KPI追跡開始**: 無料→有料コンバージョン率、チャーン率
4. **マーケティング準備**: ASO対策、プレスリリース

---

**最終更新**: 2025-01-18
**次回レビュー**: 実装開始時
