---
name: security-auditor
description: Lingoooプロジェクトのセキュリティ脆弱性を検出。APIエンドポイント、認証、クォータ、CORS、エラー処理、ストリーミング、メモリリークをチェック。"security"、"セキュリティ"、"脆弱性"、"security check"で起動
allowed-tools: Read, Grep, Glob
---

# Security Auditor for Lingooo

このSkillは、Lingoooプロジェクト（React Native + Node.js/Express）のセキュリティ脆弱性を自動的に検出します。

## チェック項目

### 1. ストリーミングエンドポイントのリソースリーク

**問題**: クライアント切断後もストリーミング処理が継続し、トークンを浪費

**チェック方法**:
1. バックエンドのストリーミングエンドポイントを検索
   - `generateContentStream` を使用しているファイルを特定
   - `res.write` を使用しているSSEエンドポイントを特定

2. 各エンドポイントで以下を確認:
   - `AbortController`の実装
   - `req.on('close')` ハンドラーの実装
   - `abortController.abort()` の呼び出し
   - `signal` パラメータの Gemini API への渡し
   - `AbortError` のエラーハンドリング

**ファイル対象**: `lingooo-backend/src/routes/*.ts`

### 2. 認証の強制

**問題**: 本番環境で `optionalAuthenticate` を使用し、認証をバイパス可能

**チェック方法**:
1. `optionalAuthenticate` の使用箇所を検索
2. 本番環境のルート設定を確認
3. 以下のミドルウェアが正しく適用されているか確認:
   - `/api/gemini` → `authenticate, enforceQuota`
   - `/api/chat` → `authenticate, enforceQuota`
   - `/api/translate` → `authenticate, enforceQuota`

**推奨**: 本番環境では `authenticate` のみ使用

**ファイル対象**:
- `lingooo-backend/src/middleware/auth.ts`
- `lingooo-backend/src/index.ts`

### 3. クォータ管理

**問題**: `trackQuota` では制限を強制せず、Redis障害時に無制限アクセスを許可

**チェック方法**:
1. `trackQuota` の使用箇所を検索
2. 本番環境で `enforceQuota` が使用されているか確認
3. Redis接続エラー時の処理を確認:
   - 503エラーを返すこと
   - 保守的な制限（10リクエスト/日）を適用すること
   - リクエストを通さないこと

**ファイル対象**:
- `lingooo-backend/src/middleware/quota.ts`
- `lingooo-backend/src/index.ts`

### 4. CORS設定

**問題**: ワイルドカード `*` で全オリジンを許可

**チェック方法**:
1. CORS設定を確認
2. `origin: '*'` の使用を検出
3. ホワイトリストベースの検証を確認:
   - 環境変数 `ALLOWED_ORIGINS` の使用
   - モバイルアプリスキーム（`exp://`, `capacitor://`等）の許可
   - 開発環境でのlocalhost許可
   - 不正なオリジンのブロックとログ出力

**ファイル対象**: `lingooo-backend/src/index.ts`

### 5. エラーメッセージの情報漏洩

**問題**: 本番環境で内部エラーの詳細をクライアントに露出

**チェック方法**:
1. エラーハンドリングを検索（`catch`, `error`）
2. 本番環境で以下が露出していないか確認:
   - スタックトレース
   - ファイルパス
   - データベースエラー詳細
   - 内部設定情報

3. `error-formatter.ts` のようなユーティリティが使用されているか確認

**推奨パターン**:
```typescript
if (process.env.NODE_ENV === 'production') {
  return { error: 'Internal server error', message: 'サーバーエラーが発生しました' };
} else {
  return { error: 'Internal server error', message: error.message };
}
```

**ファイル対象**: `lingooo-backend/src/**/*.ts`

### 6. WebSocketメモリリーク

**問題**: WebSocket接続後、コールバックやイベントリスナーがクリーンアップされない

**チェック方法**:
1. WebSocketハンドラーを検索
2. 以下を確認:
   - `ws.on('close')` ハンドラーの実装
   - `ws.on('error')` ハンドラーの実装
   - タイマーや非同期処理のクリーンアップ
   - `stream.cancel()` の呼び出し

**ファイル対象**: `lingooo-backend/src/routes/chat-handler.ts`

### 7. 競合状態（Race Conditions）

**問題**: read-then-write パターンで複数リクエストが同時に処理され、データが失われる

**チェック方法**:
1. カウンタのインクリメント処理を検索
2. アトミック操作（RPC関数、SQL INCREMENT等）が使用されているか確認
3. 非アトミックなフォールバックが無効化されているか確認

**例（Mobile）**:
```typescript
// ❌ 悪い例
const current = await get();
await update(current + 1);

// ✅ 良い例
await supabase.rpc('increment_question_count', { user_id });
```

**ファイル対象**:
- `lingooo-mobile/hooks/use-question-count.ts`
- その他カウンタ処理

### 8. React Native クライアント側のリソースリーク

**問題**: コンポーネントアンマウント後もストリーミングやタイマーが継続

**チェック方法**:
1. `AsyncGenerator` を使用しているコンポーネントを検索
2. 以下を確認:
   - `useEffect` のクリーンアップ関数でストリームをキャンセル
   - `controller.cancel()` の呼び出し
   - タイマー（`setTimeout`, `setInterval`）のクリア
   - イベントリスナーの削除

**ファイル対象**: `lingooo-mobile/contexts/chat-context.tsx`

## 実行手順

1. 上記8つのチェック項目を順番に実行
2. 各項目で見つかった問題を報告
3. 修正案を提示
4. 重要度（Critical / High / Medium / Low）を判定

## 出力フォーマット

```markdown
# セキュリティ監査レポート

## 概要
- チェック日時: [日時]
- 対象: Lingooo プロジェクト
- 検出された問題数: [数]

## 検出された問題

### [Critical/High/Medium/Low] [問題のタイトル]

**ファイル**: [ファイルパス:行番号]

**問題の説明**: [詳細]

**影響**: [セキュリティへの影響]

**修正案**:
[コードの修正例]

---

## 問題が見つからなかった項目

- [項目名]: ✓ 問題なし

## 推奨事項

[全体的な改善提案]
```
