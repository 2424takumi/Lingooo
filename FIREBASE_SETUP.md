# Firebase Crashlytics セットアップガイド

Firebase Crashlyticsを有効にするには、以下の手順を実行してください。

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: Lingooo）
4. Google Analyticsの設定（推奨: 有効）
5. プロジェクトを作成

## 2. iOSアプリの登録

1. Firebaseプロジェクトのダッシュボードで「iOSアプリを追加」をクリック
2. 以下の情報を入力：
   - **iOS バンドルID**: `com.lingooo.mobile`
   - **アプリのニックネーム**: Lingooo (任意)
   - **App Store ID**: (後で追加可能)
3. 「アプリを登録」をクリック

## 3. GoogleService-Info.plist のダウンロード

1. `GoogleService-Info.plist` ファイルをダウンロード
2. このファイルを以下のパスに配置：
   ```
   lingooo-mobile/GoogleService-Info.plist
   ```
3. **重要**: このファイルには機密情報が含まれているため、Gitにコミットしないでください

## 4. .gitignore の更新

`.gitignore` に以下を追加済みです：

```
# Firebase config
GoogleService-Info.plist
google-services.json
```

## 5. Firebase Crashlyticsの有効化

1. Firebase Consoleで「Crashlytics」を選択
2. 「Crashlyticsを有効にする」をクリック
3. セットアップウィザードに従う

## 6. テストクラッシュの送信（任意）

アプリにテストクラッシュを送信して、正しく設定されているか確認できます：

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

// テストクラッシュを送信
crashlytics().crash();

// エラーログを記録
crashlytics().log('Test error log');
```

## 7. ビルドと確認

1. EAS Buildでアプリをビルド：
   ```bash
   eas build --platform ios --profile preview
   ```

2. TestFlightでアプリをインストール

3. アプリでエラーを発生させる

4. Firebase Consoleで「Crashlytics」を確認

## 必要なファイル構成

```
lingooo-mobile/
├── app.json (✓ Firebase pluginsを追加済み)
├── GoogleService-Info.plist (← ここに配置)
├── components/
│   └── error-boundary.tsx (✓ Crashlytics統合済み)
└── .gitignore (✓ GoogleService-Info.plistを除外)
```

## トラブルシューティング

### GoogleService-Info.plist が見つからない

- ファイルが正しいパス `lingooo-mobile/GoogleService-Info.plist` に配置されているか確認
- ファイル名が正確に一致しているか確認（大文字小文字に注意）

### Crashlyticsにデータが表示されない

- アプリが本番ビルド（Release）でビルドされているか確認
- エラーが実際に発生しているか確認
- Firebase Consoleで正しいプロジェクトを選択しているか確認
- 初回のクラッシュレポートは表示されるまで数分かかる場合があります

### ビルドエラーが発生する

- `npx expo prebuild --clean` を実行してネイティブプロジェクトを再生成
- `node_modules` を削除して `npm install` を再実行

## 追加設定（任意）

### ユーザーIDの設定

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

crashlytics().setUserId('user-id-123');
```

### カスタム属性の追加

```typescript
crashlytics().setAttribute('user_language', 'ja');
crashlytics().setAttribute('premium_user', 'false');
```

### カスタムログの追加

```typescript
crashlytics().log('User clicked on search button');
```

## 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [Expo + Firebase Setup](https://docs.expo.dev/guides/using-firebase/)
