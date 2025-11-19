---
name: performance-analyzer
description: LingoooプロジェクトのReact NativeとNode.jsのパフォーマンス問題を検出。ScrollView、メモリリーク、useEffect、競合状態、レンダリング、バンドルサイズをチェック。"performance"、"パフォーマンス"、"遅い"、"scroll"で起動
allowed-tools: Read, Grep, Glob
---

# Performance Analyzer for Lingooo

このSkillは、Lingoooプロジェクト（React Native + Node.js/Express）のパフォーマンス問題を自動的に検出し、改善案を提示します。

## チェック項目

### 1. ScrollView問題（React Native）

**問題**: ScrollViewで最後までスクロールできない、スクロールが途切れる

**チェック方法**:
1. `ScrollView` を使用しているコンポーネントを検索
2. 各ScrollViewで以下を確認:
   - **`flex: 1`の誤用**: ScrollViewに`flex: 1`を設定すると、コンテンツの高さが制限される
   - **`paddingBottom`不足**: 最後のアイテムが見えるための余白
   - **`contentContainerStyle`の欠如**: コンテンツのスタイリングに必要
   - **ネストしたScrollView**: 垂直ScrollView内に垂直ScrollViewはNG

**修正パターン**:
```typescript
// ❌ 悪い例
<ScrollView style={{ flex: 1 }}>
  <View style={styles.content}> {/* paddingBottomなし */}
    {items.map(...)}
  </View>
</ScrollView>

// ✅ 良い例
<ScrollView style={styles.scrollView}>
  <View style={[styles.content, { paddingBottom: 20 }]}>
    {items.map(...)}
  </View>
</ScrollView>

// または
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={{ paddingBottom: 20 }}
>
  {items.map(...)}
</ScrollView>
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 2. メモリリーク（React Native）

**問題**: コンポーネントアンマウント後もタイマー、リスナー、サブスクリプションが残る

**チェック方法**:
1. `useEffect`を使用しているコンポーネントを検索
2. 各useEffectで以下を確認:
   - `setTimeout` / `setInterval` が `clearTimeout` / `clearInterval` でクリーンアップされているか
   - イベントリスナー（`addEventListener`）が `removeEventListener` で削除されているか
   - サブスクリプション（`subscribe`）が `unsubscribe` で解除されているか
   - WebSocket接続が `close` されているか
   - ストリームが `cancel` されているか

**修正パターン**:
```typescript
// ❌ 悪い例
useEffect(() => {
  const timer = setTimeout(() => {...}, 1000);
  // クリーンアップなし
}, []);

// ✅ 良い例
useEffect(() => {
  const timer = setTimeout(() => {...}, 1000);
  return () => clearTimeout(timer);
}, []);
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 3. useEffect依存配列の問題

**問題**: 依存配列が不正確で、無限ループや不要な再実行が発生

**チェック方法**:
1. `useEffect` を検索
2. 各useEffectで以下を確認:
   - 依存配列内で使用されている全ての変数・関数が含まれているか
   - オブジェクトや配列を依存配列に直接入れていないか（`useMemo`を使うべき）
   - 空の依存配列 `[]` が本当に正しいか（マウント時のみ実行が意図か）

**警告パターン**:
```typescript
// ⚠️ 警告: オブジェクトを依存配列に入れると毎回再実行
useEffect(() => {
  fetchData(filters);
}, [filters]); // filtersがオブジェクトの場合、毎回新しい参照

// ✅ 良い例
const memoizedFilters = useMemo(() => filters, [filters.id, filters.name]);
useEffect(() => {
  fetchData(memoizedFilters);
}, [memoizedFilters]);
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 4. 不要な再レンダリング

**問題**: `useMemo` / `useCallback` の欠如により、子コンポーネントが不必要に再レンダリング

**チェック方法**:
1. 以下のパターンを検索:
   - propsで関数を渡しているコンポーネント（`useCallback`を使うべき）
   - propsで計算結果を渡しているコンポーネント（`useMemo`を使うべき）
   - 配列/オブジェクトを毎回生成して渡しているコンポーネント

2. `React.memo` でラップすべきコンポーネントを特定:
   - リスト内のアイテムコンポーネント
   - 頻繁に再レンダリングされる親を持つ子コンポーネント

**修正パターン**:
```typescript
// ❌ 悪い例
function Parent() {
  const handlePress = () => {...}; // 毎回新しい関数
  return <Child onPress={handlePress} />;
}

// ✅ 良い例
function Parent() {
  const handlePress = useCallback(() => {...}, []);
  return <Child onPress={handlePress} />;
}

const Child = React.memo(({ onPress }) => {
  return <Button onPress={onPress} />;
});
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 5. 大きなリストのレンダリング

**問題**: `map()`で大量のアイテムをレンダリングし、パフォーマンスが低下

**チェック方法**:
1. `.map()` を使用しているコンポーネントを検索
2. レンダリングするアイテム数を推定:
   - 100個以上の場合、`FlatList` / `VirtualizedList` を推奨

**修正パターン**:
```typescript
// ❌ 悪い例: 大量のアイテム
<ScrollView>
  {items.map((item) => <ItemCard key={item.id} {...item} />)}
</ScrollView>

// ✅ 良い例: 仮想化
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard {...item} />}
  keyExtractor={(item) => item.id}
/>
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 6. バンドルサイズとインポート

**問題**: 大きなライブラリ全体をインポートし、バンドルサイズが肥大化

**チェック方法**:
1. 大きなライブラリのインポートを検索:
   - `import _ from 'lodash'` → `import { map } from 'lodash'`
   - `import * as Icons from 'react-native-vector-icons'`

2. 使用していないインポートを検出

**修正パターン**:
```typescript
// ❌ 悪い例
import _ from 'lodash';

// ✅ 良い例
import { debounce, throttle } from 'lodash';
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 7. 画像最適化

**問題**: 大きな画像をリサイズせずに表示

**チェック方法**:
1. `<Image>` コンポーネントを検索
2. 以下を確認:
   - 適切な `resizeMode` が設定されているか
   - 大きな画像に対して `width` / `height` が指定されているか
   - ローカル画像が最適化されているか（WebP形式など）

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 8. Backend: N+1クエリ問題

**問題**: ループ内でデータベースクエリを実行

**チェック方法**:
1. ループ（`for`, `forEach`, `map`）内でのデータベースクエリを検索
2. 以下のパターンを検出:
   - `for ... await supabase.from(...).select()`
   - `items.map(async (item) => await db.query(...))`

**修正パターン**:
```typescript
// ❌ 悪い例: N+1クエリ
for (const user of users) {
  const profile = await supabase.from('profiles').select().eq('user_id', user.id);
}

// ✅ 良い例: バッチクエリ
const userIds = users.map(u => u.id);
const profiles = await supabase.from('profiles').select().in('user_id', userIds);
```

**ファイル対象**: `lingooo-backend/src/**/*.ts`

### 9. Backend: 過度なログ出力

**問題**: 本番環境で詳細なログを出力し、I/Oボトルネックが発生

**チェック方法**:
1. `console.log` / `logger.debug` の使用を検索
2. ループ内でのログ出力を検出
3. 本番環境でログレベルが適切か確認

**ファイル対象**: `lingooo-backend/src/**/*.ts`

## 実行手順

1. 上記9つのチェック項目を順番に実行
2. 各項目で見つかった問題を報告
3. 修正案を提示
4. 影響度（Critical / High / Medium / Low）を判定

## 出力フォーマット

```markdown
# パフォーマンス分析レポート

## 概要
- 分析日時: [日時]
- 対象: Lingooo プロジェクト
- 検出された問題数: [数]

## 検出された問題

### [Critical/High/Medium/Low] [問題のタイトル]

**ファイル**: [ファイルパス:行番号]

**問題の説明**: [詳細]

**パフォーマンスへの影響**: [影響の説明]

**修正案**:
[コードの修正例]

**推定改善**: [改善される内容]

---

## 問題が見つからなかった項目

- [項目名]: ✓ 問題なし

## 推奨事項

[全体的な最適化提案]
```
