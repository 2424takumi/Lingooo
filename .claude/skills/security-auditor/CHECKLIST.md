# Security Audit Checklist

このチェックリストは、Lingoooプロジェクトで過去に発生したセキュリティ問題に基づいています。

## Backend (Node.js/Express)

### Authentication & Authorization
- [ ] 本番環境で `authenticate` ミドルウェアを使用（`optionalAuthenticate` は使用禁止）
- [ ] 全ての保護されたルートで認証チェックが実施されている
- [ ] JWTトークンの検証が正しく実装されている
- [ ] トークンの有効期限が適切に設定されている

### Quota Management
- [ ] 本番環境で `enforceQuota` を使用（`trackQuota` は開発環境のみ）
- [ ] Redis接続失敗時に503エラーを返す
- [ ] 保守的な制限（10リクエスト/日）をフォールバックとして適用
- [ ] クォータ超過時に429エラーを返す
- [ ] レスポンスヘッダーにクォータ情報を含める

### CORS Configuration
- [ ] ワイルドカード `*` を使用していない
- [ ] ホワイトリストベースのオリジン検証を実装
- [ ] モバイルアプリスキームを許可（`exp://`, `capacitor://`, etc.）
- [ ] 開発環境でのlocalhost許可を条件付きで実装
- [ ] 不正なオリジンをブロックしログ出力

### Streaming Endpoints
- [ ] `AbortController` を実装
- [ ] `req.on('close')` ハンドラーを実装
- [ ] クライアント切断時に `abortController.abort()` を呼び出し
- [ ] `signal` パラメータをGemini APIに渡す
- [ ] `AbortError` を適切にハンドリング
- [ ] ストリーム終了時にリソースをクリーンアップ

### Error Handling
- [ ] 本番環境で内部エラー詳細を露出していない
- [ ] スタックトレースを隠蔽
- [ ] ファイルパスを露出していない
- [ ] データベースエラー詳細を隠蔽
- [ ] ユーザーフレンドリーな日本語エラーメッセージを提供
- [ ] `error-formatter.ts` ユーティリティを使用

### WebSocket
- [ ] `ws.on('close')` ハンドラーを実装
- [ ] `ws.on('error')` ハンドラーを実装
- [ ] タイマーや非同期処理をクリーンアップ
- [ ] ストリームを適切にキャンセル

### Race Conditions
- [ ] カウンタ更新にアトミック操作を使用
- [ ] read-then-writeパターンを回避
- [ ] 非アトミックなフォールバックを無効化

## Frontend (React Native)

### Resource Management
- [ ] `useEffect` クリーンアップ関数でストリームをキャンセル
- [ ] コンポーネントアンマウント時に `controller.cancel()` を呼び出し
- [ ] タイマー（`setTimeout`, `setInterval`）をクリア
- [ ] イベントリスナーを削除
- [ ] WebSocket接続をクローズ

### Data Synchronization
- [ ] Supabase RPC関数を使用してアトミックな更新を実行
- [ ] 楽観的ロックを実装（必要に応じて）
- [ ] 競合状態を回避

### Sensitive Data
- [ ] `.env` ファイルをgitignoreに追加
- [ ] APIキーをコードにハードコーディングしていない
- [ ] トークンを安全に保存（SecureStore使用）

## 共通

### Environment Variables
- [ ] 本番環境で `NODE_ENV=production` を設定
- [ ] 環境変数で機密情報を管理
- [ ] デフォルト値が安全（フェイルセーフ）

### Logging
- [ ] 本番環境で機密情報をログ出力していない
- [ ] ログレベルが適切に設定されている
- [ ] エラーログに十分な情報が含まれている

### Dependencies
- [ ] 既知の脆弱性がある依存関係を使用していない
- [ ] 依存関係を定期的に更新
- [ ] `npm audit` / `yarn audit` を定期実行
