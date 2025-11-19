---
name: code-reviewer
description: Lingoooプロジェクトのコード変更を総合的にレビュー。セキュリティ、パフォーマンス、コンポーネント設計、TypeScript、ベストプラクティスをチェック。"review"、"レビュー"、"check"、"チェック"、"コードレビュー"で起動
allowed-tools: Read, Grep, Glob, Bash
---

# Code Reviewer for Lingooo

このSkillは、Lingoooプロジェクトのコード変更を包括的にレビューします。セキュリティ、パフォーマンス、設計品質を自動的にチェックします。

## レビュー項目

### 1. セキュリティ（security-auditorを統合）

以下をチェック:
- ストリーミングエンドポイントのリソースリーク
- 認証の強制
- クォータ管理
- CORS設定
- エラーメッセージの情報漏洩
- WebSocketメモリリーク
- 競合状態

**詳細**: `.claude/skills/security-auditor/SKILL.md` を参照

### 2. パフォーマンス（performance-analyzerを統合）

以下をチェック:
- ScrollView問題
- メモリリーク
- useEffect依存配列
- 不要な再レンダリング
- 大きなリストのレンダリング
- バンドルサイズ
- N+1クエリ問題

**詳細**: `.claude/skills/performance-analyzer/SKILL.md` を参照

### 3. コンポーネント設計（component-refactorを統合）

以下をチェック:
- コンポーネントサイズ
- useState/useEffectの数
- Propsの数
- ネストの深さ
- 重複コードパターン
- Propsドリリング
- カスタムフック化

**詳細**: `.claude/skills/component-refactor/SKILL.md` を参照

### 4. TypeScript型安全性

**チェック項目**:
1. `any`の使用
   - 極力避けるべき
   - 使用する場合は理由をコメント

2. 型アサーション（`as`）の過度な使用
   - 必要最小限に
   - `unknown`からの安全なキャストは許容

3. 型定義の不足
   - 関数の戻り値型
   - propsの型
   - state の型

4. Union型の適切な使用
   - 状態の表現に活用

**修正パターン**:
```typescript
// ❌ 悪い例
const data: any = await fetchData();
const user = data as User;

// ✅ 良い例
const data: unknown = await fetchData();
if (isUser(data)) {
  const user: User = data;
}

// Type guard
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}
```

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 5. エラーハンドリング

**チェック項目**:
1. try-catch の適切な使用
   - 非同期処理は必ずエラーハンドリング
   - エラーをログ出力

2. エラーメッセージの品質
   - ユーザーに分かりやすい日本語メッセージ
   - 開発者向けのデバッグ情報（開発環境のみ）

3. フォールバック処理
   - エラー時のデフォルト値
   - ユーザー体験の維持

**修正パターン**:
```typescript
// ❌ 悪い例
const data = await fetchData(); // エラーハンドリングなし

// ✅ 良い例
try {
  const data = await fetchData();
  return data;
} catch (error) {
  logger.error('[Component] Failed to fetch data:', error);
  Alert.alert('エラー', 'データの読み込みに失敗しました');
  return defaultData; // フォールバック
}
```

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 6. ログ出力

**チェック項目**:
1. `console.log` の使用禁止
   - `logger.debug/info/warn/error` を使用

2. ログレベルの適切な使用
   - `debug`: デバッグ情報
   - `info`: 重要なイベント
   - `warn`: 警告
   - `error`: エラー

3. 機密情報のログ出力禁止
   - トークン、パスワード、個人情報

4. ログの可読性
   - コンテキスト情報を含める
   - 構造化ログ（JSON）

**修正パターン**:
```typescript
// ❌ 悪い例
console.log('User logged in');
console.log(user); // 機密情報が含まれる可能性

// ✅ 良い例
logger.info('[Auth] User logged in', { userId: user.id });
```

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 7. 命名規則

**チェック項目**:
1. コンポーネント名: PascalCase
   - `WordDetailScreen`, `QACard`

2. 関数名/変数名: camelCase
   - `handlePress`, `isLoading`

3. 定数名: UPPER_SNAKE_CASE
   - `API_ENDPOINT`, `MAX_RETRY_COUNT`

4. カスタムフック: `use` プレフィックス
   - `useQuestionCount`, `useChatSession`

5. 型/インターフェース名: PascalCase
   - `UserProfile`, `ChatMessage`

6. ファイル名
   - コンポーネント: PascalCase または kebab-case
   - ユーティリティ: kebab-case
   - 例: `WordCard.tsx`, `word-detail.tsx`, `error-formatter.ts`

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 8. コメント・ドキュメント

**チェック項目**:
1. 複雑なロジックにコメント
   - なぜそうしたのか（What ではなく Why）

2. TODOコメント
   - `// TODO: 説明` の形式
   - 期限や担当者を明記

3. JSDoc（必要に応じて）
   - 公開APIやライブラリ関数

4. 不要なコメントアウトコードの削除

**修正パターン**:
```typescript
// ❌ 悪い例
// ユーザーIDを取得
const userId = user.id;

// ✅ 良い例
// Supabaseの制約により、月次リセット時にRPC関数を使用
// 参照: https://github.com/supabase/supabase/issues/xxx
const { data } = await supabase.rpc('reset_usage', { user_id: userId });
```

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 9. インポート管理

**チェック項目**:
1. 未使用のインポート
   - 削除する

2. インポートの順序
   - 外部ライブラリ
   - 内部ライブラリ（`@/`）
   - 相対パス
   - 型インポート（`import type`）

3. デフォルトインポート vs 名前付きインポート
   - 一貫性を保つ

**修正パターン**:
```typescript
// ❌ 悪い例
import { View } from 'react-native';
import type { User } from '@/types/user';
import React from 'react';
import { API } from '../api';

// ✅ 良い例
import React from 'react';
import { View } from 'react-native';

import { API } from '@/services/api';

import type { User } from '@/types/user';
```

**ファイル対象**: `**/*.ts`, `**/*.tsx`

### 10. テスト

**チェック項目**:
1. 重要なロジックにテストがあるか
   - カスタムフック
   - ユーティリティ関数
   - ビジネスロジック

2. テストの網羅性
   - 正常系
   - 異常系
   - エッジケース

**ファイル対象**: `**/*.test.ts`, `**/*.test.tsx`

## 実行手順

### レビュー対象の特定

1. **変更ファイルのリストアップ**
   ```bash
   git diff --name-only HEAD
   # または
   git diff --name-only main...HEAD
   ```

2. **変更内容の確認**
   ```bash
   git diff HEAD
   # または
   git diff main...HEAD
   ```

### レビュー実行

1. セキュリティチェック（security-auditor）
2. パフォーマンスチェック（performance-analyzer）
3. コンポーネント設計チェック（component-refactor）
4. TypeScript型安全性チェック
5. エラーハンドリングチェック
6. ログ出力チェック
7. 命名規則チェック
8. コメント・ドキュメントチェック
9. インポート管理チェック
10. テストチェック

### 結果のまとめ

- 各チェック項目の結果を集計
- 重要度でソート（Critical → High → Medium → Low）
- 修正案を提示

## 出力フォーマット

```markdown
# コードレビューレポート

## 概要
- レビュー日時: [日時]
- 対象: [ブランチ名 または コミット範囲]
- 変更ファイル数: [数]
- 検出された問題数: [数]

## 変更ファイル一覧
- [ファイル1]
- [ファイル2]
- ...

## 検出された問題

### 🔴 Critical（即座に修正が必要）

#### [問題タイトル]
**ファイル**: [ファイルパス:行番号]
**カテゴリ**: [セキュリティ/パフォーマンス/設計/等]
**問題の説明**: [詳細]
**修正案**:
\`\`\`typescript
[コード例]
\`\`\`

---

### ⚠️ High（優先的に修正）

...

### 📝 Medium（時間があれば修正）

...

### 💡 Low（推奨事項）

...

## 良い変更点

- [良かった点1]
- [良かった点2]

## 総合評価

**セキュリティ**: [評価]
**パフォーマンス**: [評価]
**コード品質**: [評価]
**テスト**: [評価]

**総合**: [合格 / 条件付き合格 / 要修正]

## 推奨事項

[全体的な改善提案]
```

## Lingoooプロジェクト固有のルール

### コーディング規約
1. 日本語コメントを使用（ユーザー向けメッセージも日本語）
2. ログは英語プレフィックス + 日本語メッセージ可
   - 例: `logger.error('[Auth] ログインに失敗しました')`
3. コンポーネントファイル名は kebab-case を推奨
   - 例: `word-detail.tsx`, `qa-card.tsx`

### プロジェクト構造
- Mobile: `/lingooo-mobile`
- Backend: `/lingooo-backend`
- 共通型定義は各プロジェクトで独立管理

### 依存関係
- React Native: Expo
- Backend: Express + Supabase
- AI: Gemini API
- State管理: React Context（必要に応じてZustand検討）
