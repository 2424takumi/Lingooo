# Lingooo Backend

Express.js + Google Gemini APIを使用したバックエンドサーバー

## 機能

### Gemini API エンドポイント

#### 1. テキスト生成
```
POST /api/gemini/generate
```

#### 2. ストリーミングテキスト生成
```
POST /api/gemini/generate-stream
```

#### 3. JSON生成
```
POST /api/gemini/generate-json
```

#### 4. プログレッシブJSON生成（ポーリング方式）
```
POST /api/gemini/generate-json-progressive
GET /api/gemini/task/:taskId
```

段階的にJSONを生成し、フロントエンドがポーリングで進捗を取得します。

**フロー:**
1. POST `/generate-json-progressive` → taskIdを即座に返す
2. バックグラウンドで生成開始
3. フロントエンドがGET `/task/:taskId` で進捗をポーリング
4. 各セクション完成時にprogressが更新される:
   - 25%: headword完成
   - 50%: senses完成
   - 75%: metrics完成
   - 100%: examples完成

#### 5. ステータス確認
```
GET /api/gemini/status
```

### チャット API

```
POST /api/chat
```

コンテキスト対応のチャット機能

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
```bash
cp .env.example .env
```

`.env` に以下を設定:
```
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=2048
GEMINI_TEMPERATURE=0.7
```

3. サーバー起動
```bash
# 開発モード
npm run dev

# 本番モード
npm start
```

サーバーは `http://localhost:3000` で起動します。

## 技術詳細

### 自動リトライ機能

レート制限エラー（429）に対して自動リトライを実装：
- リトライ回数: 最大3回
- 遅延: 指数バックオフ（2s → 4s → 8s）
- 対象: レート制限エラーのみ

### プログレッシブストア

メモリベースのタスク管理システム：
- タスクステータス: pending, generating, completed, error
- 進捗率: 0-100%
- 部分データ: 段階的に完成したセクション
- タイムアウト: 5分後に自動削除

### プロンプト管理

プロンプトは `src/prompts/` に配置：
- `chat/system.txt`: チャットシステムプロンプト

## API使用例

### プログレッシブJSON生成

```typescript
// タスク開始
const response = await fetch('http://localhost:3000/api/gemini/generate-json-progressive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '英単語"hello"の辞書情報を生成してください',
    config: { model: 'gemini-2.5-flash' }
  })
});

const { taskId } = await response.json();

// ポーリング
const interval = setInterval(async () => {
  const status = await fetch(`http://localhost:3000/api/gemini/task/${taskId}`);
  const task = await status.json();

  console.log(`進捗: ${task.progress}%`);

  if (task.status === 'completed') {
    console.log('完成:', task.partialData);
    clearInterval(interval);
  }
}, 200);
```

## 開発

### ログ

```bash
# サーバーログ
npm run dev

# タスクログの例
[Task task-xxx] headword ready
[Task task-xxx] senses ready
[Task task-xxx] metrics ready
[Task task-xxx] examples ready
[Task task-xxx] completed
```

### エラーハンドリング

- 429エラー: 自動リトライ
- その他のエラー: クライアントにエラーレスポンス返却

## ライセンス

MIT
