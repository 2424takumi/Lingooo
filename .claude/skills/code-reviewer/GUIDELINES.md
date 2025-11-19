# Lingooo Coding Guidelines

Lingoooプロジェクトのコーディングガイドライン

## 言語選択

### コード
- **変数名・関数名**: 英語
- **コメント**: 日本語（技術的な説明は英語も可）
- **ログメッセージ**: プレフィックスは英語、内容は日本語可
  ```typescript
  logger.info('[Auth] ユーザーがログインしました', { userId });
  ```

### ユーザー向けメッセージ
- **すべて日本語**
  ```typescript
  Alert.alert('エラー', 'ネットワーク接続を確認してください');
  ```

## ファイル・ディレクトリ構造

### Mobile (`lingooo-mobile/`)

```
lingooo-mobile/
├── app/                      # Expo Router画面
│   ├── (tabs)/              # タブナビゲーション画面
│   │   ├── index.tsx        # ホーム画面
│   │   ├── word-detail.tsx  # 単語詳細画面
│   │   ├── search.tsx       # 検索画面
│   │   └── bookmarks.tsx    # ブックマーク画面
│   └── _layout.tsx          # ルートレイアウト
├── components/              # 再利用可能なコンポーネント
│   ├── ui/                  # UIコンポーネント
│   └── icons/               # アイコンコンポーネント
├── contexts/                # Contextプロバイダー
├── hooks/                   # カスタムフック
├── services/                # API呼び出し、ストレージ等
│   ├── api/
│   ├── storage/
│   └── cache/
├── utils/                   # ユーティリティ関数
├── types/                   # TypeScript型定義
└── constants/               # 定数
```

### Backend (`lingooo-backend/`)

```
lingooo-backend/
├── src/
│   ├── routes/             # APIルート
│   ├── middleware/         # ミドルウェア
│   ├── services/           # ビジネスロジック
│   ├── utils/              # ユーティリティ
│   └── index.ts            # エントリーポイント
├── tests/                  # テスト
└── scripts/                # スクリプト
```

## 命名規則

### ファイル名
- **コンポーネント**: `kebab-case.tsx` または `PascalCase.tsx`
  - 例: `word-detail.tsx`, `QACard.tsx`
- **フック**: `use-hook-name.ts`
  - 例: `use-question-count.ts`
- **ユーティリティ**: `kebab-case.ts`
  - 例: `error-formatter.ts`
- **型定義**: `kebab-case.ts`
  - 例: `chat-types.ts`

### コード内
- **コンポーネント**: `PascalCase`
  ```typescript
  function WordDetailScreen() {}
  ```
- **関数/変数**: `camelCase`
  ```typescript
  const handlePress = () => {};
  const isLoading = false;
  ```
- **定数**: `UPPER_SNAKE_CASE`
  ```typescript
  const API_ENDPOINT = 'https://...';
  const MAX_RETRY_COUNT = 3;
  ```
- **カスタムフック**: `use` プレフィックス
  ```typescript
  function useQuestionCount() {}
  ```
- **型/インターフェース**: `PascalCase`
  ```typescript
  interface UserProfile {}
  type ChatMessage = {};
  ```

## TypeScript

### 型定義

```typescript
// ✅ 推奨: 明示的な型定義
interface WordData {
  word: string;
  definitions: string[];
  examples: Example[];
}

function fetchWord(word: string): Promise<WordData> {
  // ...
}

// ❌ 非推奨: any の使用
function fetchWord(word: any): any {
  // ...
}
```

### 型アサーション

```typescript
// ✅ 推奨: Type guard
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  console.log(data.id); // 型安全
}

// ⚠️ 注意: as は最小限に
const user = data as User; // 避けられない場合のみ
```

### オプショナルチェーン

```typescript
// ✅ 推奨
const name = user?.profile?.name ?? 'Unknown';

// ❌ 非推奨
const name = user && user.profile && user.profile.name || 'Unknown';
```

## React / React Native

### コンポーネント

```typescript
// ✅ 推奨: 関数コンポーネント + TypeScript
interface Props {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function MyComponent({ title, onPress, isLoading = false }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={isLoading}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}

// ❌ 非推奨: クラスコンポーネント
export class MyComponent extends React.Component<Props> {
  // ...
}
```

### Hooks

```typescript
// ✅ 推奨: カスタムフックでロジック分離
function useQuestionCount() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const increment = useCallback(async () => {
    setIsLoading(true);
    try {
      const newCount = await incrementCount();
      setCount(newCount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { count, isLoading, increment };
}

// コンポーネントで使用
function Component() {
  const { count, isLoading, increment } = useQuestionCount();
  // ...
}
```

### useEffect

```typescript
// ✅ 推奨: クリーンアップ関数を必ず実装
useEffect(() => {
  const timer = setTimeout(() => {
    doSomething();
  }, 1000);

  return () => clearTimeout(timer); // クリーンアップ
}, [dependency]);

// ✅ 推奨: 依存配列を正確に
useEffect(() => {
  fetchData(userId, filter);
}, [userId, filter]); // 使用する全ての変数を含める
```

### スタイリング

```typescript
// ✅ 推奨: StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#000000',
  },
});

<View style={styles.container}>
  <Text style={styles.text}>Hello</Text>
</View>

// ⚠️ 注意: インラインスタイルは最小限に
<View style={{ backgroundColor: dynamicColor }}> {/* 動的な値のみ */}
```

## エラーハンドリング

### 非同期処理

```typescript
// ✅ 推奨
async function fetchData() {
  try {
    const response = await api.getData();
    return response;
  } catch (error) {
    logger.error('[FetchData] Failed to fetch:', error);

    // ユーザーフレンドリーなエラーメッセージ
    Alert.alert('エラー', 'データの読み込みに失敗しました');

    // フォールバック値を返す
    return defaultData;
  }
}

// ❌ 非推奨: エラーを無視
async function fetchData() {
  const response = await api.getData(); // エラーハンドリングなし
  return response;
}
```

### エラーログ

```typescript
// ✅ 推奨: 構造化ログ
logger.error('[Auth] Login failed', {
  userId,
  errorCode: error.code,
  timestamp: Date.now(),
});

// ❌ 非推奨: console.log
console.log('Error:', error);
```

## パフォーマンス

### React.memo / useMemo / useCallback

```typescript
// ✅ 推奨: リストアイテムはメモ化
const ListItem = React.memo(({ item, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </TouchableOpacity>
  );
});

// ✅ 推奨: コールバックをメモ化
function Parent() {
  const handlePress = useCallback((id: string) => {
    // ...
  }, []);

  return items.map(item => (
    <ListItem key={item.id} item={item} onPress={handlePress} />
  ));
}

// ✅ 推奨: 計算結果をメモ化
function Component({ items }: Props) {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  return <Text>合計: {total}</Text>;
}
```

### FlatList vs ScrollView

```typescript
// ✅ 推奨: 大量のアイテムはFlatList
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard {...item} />}
  keyExtractor={(item) => item.id}
/>

// ❌ 非推奨: 大量のアイテムをmap
<ScrollView>
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</ScrollView>
```

## セキュリティ

### 環境変数

```typescript
// ✅ 推奨: 環境変数で機密情報を管理
const API_KEY = process.env.GEMINI_API_KEY;

// ❌ 非推奨: ハードコーディング
const API_KEY = 'AIzaSy...'; // NG!
```

### 認証

```typescript
// ✅ 推奨: 本番環境では必ず認証
if (process.env.NODE_ENV === 'production') {
  app.use('/api/*', authenticate, enforceQuota);
}

// ❌ 非推奨: optionalAuthenticate
app.use('/api/*', optionalAuthenticate); // 本番環境でNG
```

## テスト

### 単体テスト

```typescript
// ✅ 推奨: カスタムフックのテスト
describe('useQuestionCount', () => {
  it('should increment count', async () => {
    const { result } = renderHook(() => useQuestionCount());

    await act(async () => {
      await result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## Git

### コミットメッセージ

```
feat: Add user authentication
fix: Fix scroll issue in question list
refactor: Extract bookmark logic to custom hook
docs: Update README
perf: Optimize image loading
test: Add tests for useQuestionCount
```

### ブランチ名

```
feature/user-authentication
fix/scroll-issue
refactor/bookmark-logic
```

## ドキュメント

### JSDoc（公開API）

```typescript
/**
 * ユーザーの質問回数を管理するカスタムフック
 *
 * @returns {Object} 質問カウント、ローディング状態、increment関数
 * @example
 * const { count, isLoading, increment } = useQuestionCount();
 */
export function useQuestionCount() {
  // ...
}
```

### コメント

```typescript
// ✅ 推奨: Whyを説明
// Supabaseの制約により、アトミックな更新にはRPC関数を使用
const { data } = await supabase.rpc('increment_count');

// ❌ 非推奨: Whatを説明
// カウントをインクリメント
const { data } = await supabase.rpc('increment_count');
```

## チェックリスト

コード提出前に確認:

- [ ] TypeScript型エラーがない (`npx tsc --noEmit`)
- [ ] Lintエラーがない (`npm run lint`)
- [ ] テストが通る (`npm test`)
- [ ] 不要なconsole.logを削除
- [ ] 未使用のインポートを削除
- [ ] エラーハンドリングを実装
- [ ] ログ出力を追加（重要な処理）
- [ ] コメントを追加（複雑なロジック）
- [ ] セキュリティチェック完了
- [ ] パフォーマンスチェック完了
