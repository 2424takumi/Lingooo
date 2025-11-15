# Supabase Migrations

このディレクトリには、Supabaseデータベースに適用するSQLマイグレーションファイルが含まれています。

## マイグレーションの適用方法

### 方法1: Supabase Dashboard（推奨）

1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. プロジェクトを選択
3. 左サイドバーの「SQL Editor」を開く
4. 「New Query」をクリック
5. マイグレーションファイル（`.sql`）の内容をコピー＆ペースト
6. 「Run」をクリックして実行

### 方法2: Supabase CLI

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにログイン
supabase login

# マイグレーションを適用
supabase db push
```

## マイグレーション一覧

### 001_increment_question_count.sql

**目的**: 質問カウントの競合状態（race condition）を修正

**内容**:
- `increment_question_count(user_id)` PostgreSQL関数を作成
- アトミックなカウントインクリメントを提供
- 複数の同時リクエストで正しくカウントが増加することを保証

**必要性**:
以前の実装では、以下のような競合状態が発生していました：
1. クライアントA: カウント = 5 を読み込み
2. クライアントB: カウント = 5 を読み込み
3. クライアントA: カウント = 6 に更新
4. クライアントB: カウント = 6 に更新（本来は7であるべき）

この関数により、データベース側でアトミックにインクリメントされるため、
上記のような問題が発生しなくなります。

**適用後の確認**:
```sql
-- 関数が正しく作成されたか確認
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'increment_question_count';

-- テスト実行（自分のuser_idで試す）
SELECT increment_question_count('your-user-id-here');
```

## トラブルシューティング

### 権限エラーが発生する場合

マイグレーションを実行するユーザーに十分な権限があることを確認してください。
Supabase Dashboardから実行する場合は、通常問題ありません。

### 関数が見つからないエラー（Function does not exist）

フロントエンドコードの `incrementQuestionCount` 関数は、RPC関数が存在しない場合、
自動的に従来の方法にフォールバックします。ただし、競合状態の可能性は残るため、
できるだけ早くマイグレーションを適用することを推奨します。

## ロールバック

万が一問題が発生した場合は、以下のSQLで関数を削除できます：

```sql
DROP FUNCTION IF EXISTS increment_question_count(UUID);
```
