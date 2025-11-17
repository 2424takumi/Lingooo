# Lingooo - AI-Powered Language Learning App 📚

AI辞書機能とチャット機能を備えた、革新的な言語学習アプリです。

## 🏗️ プロジェクト構造（モノレポ）

```
Lingooo/
├── backend/          # Express + Gemini APIバックエンド
│   ├── src/
│   │   ├── routes/   # API エンドポイント
│   │   ├── utils/    # ユーティリティ
│   │   └── prompts/  # AIプロンプト
│   └── package.json
├── app/              # React Native (Expo) フロントエンド
├── components/       # UIコンポーネント
├── services/         # APIクライアント、キャッシュ
├── contexts/         # React Context
├── hooks/            # カスタムフック
├── types/            # TypeScript型定義
├── data/             # モックデータ
└── docs/             # ドキュメント
```

## ✨ 主な機能

### 1. AI辞書（プログレッシブストリーミング）
- **真のプログレッシブレンダリング**: 単語情報を段階的に生成・表示
  - 25% → headword（基本情報）
  - 50% → senses（意味）
  - 75% → metrics（頻度・難易度）
  - 100% → examples（例文）
- **即座のページ遷移**: データ生成を待たずにページ遷移
- **自動リトライ**: レート制限時の指数バックオフ
- **スケルトンローダー**: セクションごとのロード表示

### 2. AI翻訳機能
- **リアルタイム翻訳**: 複数言語間の高速翻訳
- **テキスト選択とAI質問**: 翻訳文の一部を選択して質問可能
- **選択テキストの優先処理**: 選択された部分を重点的に解説
- **音声読み上げ**: 原文・翻訳文の発音確認
- **ワンタップ辞書連携**: 選択した単語を辞書で詳細検索

### 3. コンテキスト対応チャット
- 単語の詳細を理解した上での質問応答
- 選択されたテキストを優先的に回答
- フォローアップ質問の自動生成
- ストリーミング応答表示
- 翻訳モード・単語モード別のコンテキスト管理

### 4. その他
- 日本語→英語検索（提案機能）
- キャッシュ機構（高速な再表示）
- モックデータフォールバック

## 🚀 セットアップ

### 1. バックエンド

```bash
cd backend
npm install

# 環境変数を設定
cp .env.example .env
# .envにGEMINI_API_KEYを追加

# サーバー起動
npm run dev
```

バックエンドは `http://localhost:3000` で起動します。

### 2. フロントエンド

```bash
# ルートディレクトリで
npm install

# 環境変数を設定（オプション）
cp .env.example .env
# デフォルトでlocalhost:3000に接続

# アプリ起動
npx expo start
```

## 📝 使い方

### 起動順序
1. **バックエンドを起動**（ターミナル1）
   ```bash
   cd backend && npm run dev
   ```

2. **フロントエンドを起動**（ターミナル2）
   ```bash
   npx expo start
   ```

3. Expo Goアプリまたはシミュレーターでアプリを開く

### API設定
Gemini APIキーは `backend/.env` に設定してください：
```
GEMINI_API_KEY=your_api_key_here
```

詳細は `docs/setup-gemini-api.md` を参照。

## 🛠️ 技術スタック

### フロントエンド
- **React Native** (Expo)
- **TypeScript**
- **Expo Router** (ファイルベースルーティング)

### バックエンド
- **Node.js** + **Express**
- **Google Gemini API**
- **TypeScript**

### 主要な技術的実装
- **プログレッシブストリーミング**: ポーリング方式で段階的データ取得
- **タスクベースの非同期処理**: メモリストアでタスク管理
- **自動リトライロジック**: 指数バックオフでレート制限対応

## 📚 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照：
- `docs/ai-dictionary-design.md` - AI辞書の設計
- `docs/chat-feature-spec.md` - チャット機能の仕様
- `docs/setup-gemini-api.md` - APIセットアップガイド

## 🤝 開発

### プロジェクト規約
- コミットメッセージは英語で記述
- TypeScriptの型定義は厳密に
- UIコンポーネントは `components/ui/` に配置

### デバッグ
```bash
# ログを確認
# フロントエンド: Expo Goアプリのコンソール
# バックエンド: ターミナルのnpmログ
```

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code)