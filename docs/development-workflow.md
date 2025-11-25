# 開発ワークフロー

## 環境構成

### 環境変数の管理

- **`.env`**: ローカル開発用（localhost）
- **`.env.production`**: 本番用（Fly.io）
- **`eas.json`**: EASビルド時の環境設定

### 設定値

```bash
# ローカル開発
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# 本番環境
EXPO_PUBLIC_BACKEND_URL=https://lingooo-backend.fly.dev
```

## 日常の開発フロー

### 1. ローカル開発

```bash
# バックエンドを起動（別ターミナル）
cd ../lingooo-backend
npm run dev

# モバイルアプリを起動
cd lingooo-mobile
npm start
```

- Expo Goで実行
- `.env`の`localhost:3000`を使用
- コード変更は即座に反映

### 2. コミット

```bash
git add .
git commit -m "feat: 機能追加"
git push
```

## 本番ビルドの作成

### 方法A: EASビルド（推奨）

```bash
# iOS本番ビルド
eas build --profile production --platform ios

# Android本番ビルド
eas build --profile production --platform android
```

**メリット:**
- `.env`の変更不要
- `eas.json`の設定が自動適用
- クラウドでビルド

**注意:**
- 無料プランは月2回まで
- 毎月1日にリセット

### 方法B: Xcodeビルド（今すぐ必要な場合）

```bash
# 本番用にプロジェクト準備
npm run prebuild:production

# Xcodeが開いたら:
# 1. Product → Archive
# 2. Distribute App → App Store Connect
# 3. Upload
```

**メリット:**
- ビルド回数制限なし
- ローカルで完結

**デメリット:**
- 手動操作が必要
- Mac + Xcodeが必須

## ビルド番号の管理

### 自動インクリメント

`app.json`の`buildNumber`を手動で更新:

```json
{
  "ios": {
    "buildNumber": "12"  // 毎回+1
  }
}
```

### TestFlight vs App Store

- **TestFlight**: ビルド番号のみ更新
- **App Store**: バージョン番号も更新（例: 1.0.0 → 1.1.0）

## トラブルシューティング

### ビルドがlocalhostに接続している

**原因**: `.env`の設定でビルドされている

**解決策**:
```bash
# 方法1: EASビルドを使う
eas build --profile production --platform ios

# 方法2: 本番用スクリプトを使う
npm run prebuild:production
```

### EASビルド回数が足りない

**回答**: Xcodeビルドを使うか、月初まで待つ

### Expo Goで本番APIをテストしたい

`.env`を一時的に変更:
```bash
EXPO_PUBLIC_BACKEND_URL=https://lingooo-backend.fly.dev
```

**忘れずに元に戻す！**

## 推奨フロー

```
開発 → Expo Go でテスト
     ↓
コミット & プッシュ
     ↓
週1回程度: EASビルド（または Xcodeビルド）
     ↓
TestFlightで実機テスト
     ↓
問題なければApp Storeにリリース
```

## 参考

- [EAS Build ドキュメント](https://docs.expo.dev/build/introduction/)
- [環境変数の管理](https://docs.expo.dev/build-reference/variables/)
- [TestFlight](https://developer.apple.com/testflight/)
