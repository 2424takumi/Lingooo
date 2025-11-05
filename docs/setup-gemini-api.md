# Gemini API セットアップガイド

このガイドでは、Lingooo アプリでGemini APIを使用するための設定方法を説明します。

---

## 📋 前提条件

- Google アカウント
- インターネット接続

---

## 🔑 APIキーの取得

### 1. Google AI Studio にアクセス

以下のURLにアクセスしてください：

https://makersuite.google.com/app/apikey

### 2. APIキーを作成

1. **「Create API Key」** ボタンをクリック
2. プロジェクトを選択（新規作成も可能）
3. APIキーが生成されます（例: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX`）
4. **コピー**ボタンでAPIキーをコピー

⚠️ **重要:** このAPIキーは他人と共有しないでください

---

## ⚙️ 環境変数の設定

### 1. `.env` ファイルを作成

プロジェクトのルートディレクトリに `.env` ファイルを作成します：

```bash
# プロジェクトルートで実行
cd /path/to/lingooo-mobile
touch .env
```

### 2. APIキーを追加

`.env` ファイルを開いて、以下を記入してください：

```env
EXPO_PUBLIC_GEMINI_API_KEY=ここにコピーしたAPIキーを貼り付け
```

**例:**
```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567
```

### 3. ファイルを保存

保存したら完了です！

---

## ✅ 動作確認

### 1. アプリを再起動

既にアプリが起動している場合は、一度停止して再起動してください：

```bash
# Ctrl+C で停止
# 再起動
npm start
```

### 2. 検索を試す

1. アプリを開く
2. 任意の単語を検索（例: "study"）
3. AI生成された詳細が表示されればOK！

---

## 💰 料金について

### 無料枠

Gemini Flash 2.0 には無料枠があります：

- **15 requests/分**
- **1,500 requests/日**

通常の使用であれば、無料枠内で十分利用可能です。

### 有料プラン

無料枠を超える場合は自動的に課金されます：

- 入力: $0.075 / 1M tokens
- 出力: $0.30 / 1M tokens

詳細: https://ai.google.dev/pricing

---

## 🛡️ セキュリティ

### APIキーの保護

✅ **やるべきこと:**
- `.env` ファイルは `.gitignore` に含める（既に設定済み）
- APIキーは絶対に共有しない
- 定期的にAPIキーを再生成する

❌ **やってはいけないこと:**
- APIキーをコードに直接記述
- `.env` ファイルをGitにコミット
- 他人とAPIキーを共有

---

## 🔧 トラブルシューティング

### エラー: "Gemini APIキーが設定されていません"

`.env` ファイルが正しく作成されているか確認：

```bash
cat .env
```

以下のように表示されるはずです：
```
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

### エラー: "API呼び出しに失敗しました"

1. **APIキーが正しいか確認**
   - Google AI Studio で再確認

2. **インターネット接続を確認**
   - 他のサイトにアクセスできるか確認

3. **無料枠を超えていないか確認**
   - 1日1,500リクエストを超えている可能性

### モックデータにフォールバック

APIキーが設定されていない、またはエラーが発生した場合、アプリは自動的にモックデータを使用します。この場合、限られた単語のみ検索可能です。

---

## 📚 参考資料

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Pricing Information](https://ai.google.dev/pricing)

---

**セットアップ完了！** 🎉

質問や問題がある場合は、プロジェクトのIssuesにご報告ください。
