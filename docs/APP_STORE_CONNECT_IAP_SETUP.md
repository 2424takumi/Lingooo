# App Store Connect In-App Purchase Setup Guide

## Overview

This guide walks you through setting up In-App Purchases (IAP) for Lingooo's subscription feature in App Store Connect.

## Prerequisites

- Apple Developer account with App Manager or Admin role
- App already created in App Store Connect (Lingooo - com.lingooo.mobile)
- RevenueCat account configured with iOS API key

## Step 1: Access In-App Purchases Section

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/)
2. Go to **My Apps** → **Lingooo**
3. In the left sidebar, click **Monetization** → **Subscriptions**

## Step 2: Create Subscription Group

1. Click **+ Subscription Group** (if not already created)
2. Enter the following details:
   - **Reference Name**: `Premium Subscription`
   - **Group Name** (user-facing): Will be set per locale below

3. Add localizations:
   - **Japanese (Japan)**:
     - Group Name: `プレミアムプラン`
   - **English (U.S.)**:
     - Group Name: `Premium Plan`
   - **Portuguese (Brazil)**:
     - Group Name: `Plano Premium`

4. Click **Save**

## Step 3: Create Monthly Subscription Product

1. Inside the subscription group, click **+ Create Subscription**
2. Enter the following details:

### Basic Information

- **Product ID**: `com.lingooo.premium.monthly`
  - ⚠️ **CRITICAL**: This must match exactly with the RevenueCat configuration
  - Cannot be changed after creation
- **Reference Name**: `Premium Monthly Subscription`

### Subscription Duration

- **Duration**: `1 month`

### Subscription Prices

1. Click **Add Subscription Price**
2. Select pricing:
   - **Price**: `¥500` (Japan)
   - Auto-conversion will set prices for other regions:
     - U.S.: ~$4.99
     - Brazil: ~R$24.90

3. **Availability**: Start Immediately

### Free Trial

1. In the **Subscription Offers** section, click **+ Create Promotional Offer**
2. Select **Introductory Offer**:
   - **Duration**: `7 days`
   - **Price**: `Free`
   - **Eligibility**: New subscribers only

### Localizations

Add descriptions for each language:

#### Japanese (Japan)

- **Subscription Display Name**: `プレミアム月額プラン`
- **Description**:
  ```
  Lingoooのプレミアム機能をすべて利用できます：
  • 無制限のAI翻訳と辞書検索
  • 高度な単語学習機能
  • AIチャット機能の完全利用
  • 広告なし

  7日間無料トライアル後、月額¥500で自動更新されます。
  ```

#### English (U.S.)

- **Subscription Display Name**: `Premium Monthly Plan`
- **Description**:
  ```
  Get full access to all Lingooo premium features:
  • Unlimited AI translations and dictionary lookups
  • Advanced vocabulary learning tools
  • Full AI chat functionality
  • Ad-free experience

  Free 7-day trial, then ¥500/month. Auto-renews.
  ```

#### Portuguese (Brazil)

- **Subscription Display Name**: `Plano Premium Mensal`
- **Description**:
  ```
  Acesso completo a todos os recursos premium do Lingooo:
  • Traduções e consultas de dicionário ilimitadas
  • Ferramentas avançadas de aprendizado de vocabulário
  • Funcionalidade completa de chat AI
  • Experiência sem anúncios

  Teste grátis de 7 dias, depois ¥500/mês. Renovação automática.
  ```

### App Store Review Information

1. Scroll to **App Store Review Information**
2. Upload a **screenshot** showing the subscription purchase flow
3. Add **Review Notes**:
   ```
   Premium subscription unlocks unlimited AI translations, dictionary lookups,
   and chat functionality. Free trial allows full testing of features.

   RevenueCat is used for subscription management.
   ```

## Step 4: Submit for Review

1. Click **Save** at the top right
2. The status will be **Waiting for Review**
3. Go back to your app's main page
4. Submit your app version for review (if not already submitted)
   - ⚠️ IAP products must be submitted WITH an app version
   - Cannot be reviewed standalone

## Step 5: Create Sandbox Test Account

1. In App Store Connect, go to **Users and Access** (top nav)
2. Click **Sandbox** tab
3. Click **+ Testers**
4. Create a test account:
   - **First Name**: `Test`
   - **Last Name**: `User`
   - **Email**: Use a unique email (e.g., `lingooo.test+sandbox1@gmail.com`)
   - **Password**: Set a strong password
   - **Region**: `Japan`
   - **Date of Birth**: Set as adult (18+)

5. Click **Create**

## Step 6: Test on Device

### Using TestFlight

1. Install app via TestFlight
2. **Sign out** of your real Apple ID on the device:
   - Settings → [Your Name] → Media & Purchases → Sign Out
3. Open Lingooo app
4. Navigate to Settings → Premium
5. Tap "7日間無料で体験する" (Start 7-day free trial)
6. When prompted, sign in with your **Sandbox test account**
7. Complete the purchase flow
8. Verify:
   - Purchase completes successfully
   - Premium features unlock
   - No actual charge occurs (Sandbox)

### Sandbox Environment Characteristics

- ✅ No real charges
- ✅ Fast subscription renewals (1 month = 5 minutes in Sandbox)
- ✅ Can test cancellation and restore
- ⚠️ Trial periods are shortened (7 days = 3 minutes in Sandbox)

## Step 7: RevenueCat Configuration Verification

Verify RevenueCat is configured correctly:

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Go to your project → **Products** tab
3. Verify:
   - **Product ID**: `com.lingooo.premium.monthly`
   - **Platform**: iOS
   - **Entitlement**: `premium`
   - **Duration**: Monthly

4. Check **Entitlements** tab:
   - Entitlement ID: `premium`
   - Connected product: `com.lingooo.premium.monthly`

## Step 8: Monitor Logs for Debugging

When testing, check Xcode console or logs for:

```
[Subscription] Initializing RevenueCat: {platform: "ios", userId: "...", hasApiKey: true}
[Subscription] Available packages: {count: 1, packages: [{identifier: "$rc_monthly", productId: "com.lingooo.premium.monthly", price: "¥500", period: "P1M"}]}
[Subscription] Starting purchase: {identifier: "$rc_monthly", productIdentifier: "com.lingooo.premium.monthly"}
[Subscription] Purchase successful
[Subscription] Premium active until: [DATE]
```

### Common Errors and Solutions

#### Error: "PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR"

**Cause**: Product not approved in App Store Connect or RevenueCat misconfigured

**Solutions**:
- Verify product status is "Ready to Submit" or "Approved"
- Check RevenueCat product ID matches exactly: `com.lingooo.premium.monthly`
- Wait 2-24 hours after creating product (App Store sync delay)

#### Error: "INVALID_CREDENTIALS_ERROR"

**Cause**: RevenueCat API key incorrect or not configured

**Solutions**:
- Check `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` in `.env`
- Verify API key in RevenueCat dashboard matches
- Ensure key is for iOS (not Android)

#### Error: "PURCHASE_NOT_ALLOWED_ERROR"

**Cause**: Device/account restrictions

**Solutions**:
- Sign out of real Apple ID, sign in with Sandbox account
- Check device Settings → Screen Time → Content & Privacy Restrictions → iTunes & App Store Purchases (must allow)
- Verify Sandbox account is set to Japan region (matches product pricing)

#### Loading Hangs on "プランの読み込み中です"

**Cause**: Multiple potential issues

**Solutions**:
1. Check network connectivity
2. Verify RevenueCat API key is set correctly
3. Check App Store Connect product status (must be approved)
4. Look for error logs (should now appear thanks to enhanced logging)
5. Try "Restore Purchases" button

## Step 9: Production Release Checklist

Before submitting to production:

- [ ] Subscription product approved in App Store Connect
- [ ] Tested successfully with Sandbox account
- [ ] RevenueCat entitlement configured correctly
- [ ] Purchase flow works (initiate, complete, unlock features)
- [ ] Restore purchases works (reinstall app, tap restore)
- [ ] Cancellation flow works (cancel in iOS Settings)
- [ ] Error messages display correctly
- [ ] Logging shows detailed errors for debugging
- [ ] Build number incremented (current: 31 → 32)
- [ ] App Store screenshots updated if needed
- [ ] Privacy policy and terms of service include IAP disclosures

## Additional Resources

- [Apple IAP Documentation](https://developer.apple.com/in-app-purchase/)
- [RevenueCat iOS Setup Guide](https://docs.revenuecat.com/docs/ios)
- [Expo IAP Guide](https://docs.expo.dev/guides/in-app-purchases/)
- [App Store Review Guidelines - 3.1 Payments](https://developer.apple.com/app-store/review/guidelines/#payments)

## Support

If issues persist:
1. Check RevenueCat logs in dashboard
2. Check Xcode console for detailed error logs
3. Contact RevenueCat support (support@revenuecat.com)
4. Review App Store Connect rejection messages

---

**Last Updated**: 2025-02-07
**Author**: Claude Code
**Status**: Ready for implementation
