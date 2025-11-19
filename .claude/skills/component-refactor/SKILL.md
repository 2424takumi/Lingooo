---
name: component-refactor
description: React Nativeコンポーネントのリファクタリングを支援。複雑度分析、コンポーネント分割、カスタムフック抽出、propsドリリング解消を提案。"refactor"、"リファクタリング"、"改善"、"分割"で起動
allowed-tools: Read, Grep, Glob
---

# Component Refactor Assistant for Lingooo

このSkillは、React Nativeコンポーネントの複雑度を分析し、リファクタリングの提案を行います。

## 分析項目

### 1. コンポーネントサイズ

**基準**:
- **推奨**: 200行以下
- **警告**: 200-400行
- **リファクタリング必須**: 400行以上

**チェック方法**:
1. `.tsx` ファイルの行数を計算
2. 400行以上のコンポーネントをリストアップ
3. 分割可能なセクションを特定:
   - 独立したUIセクション
   - モーダル/ダイアログ
   - リストアイテム
   - フォーム

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 2. useState / useEffectの数

**基準**:
- **推奨**: 各5個以下
- **警告**: 各5-10個
- **リファクタリング必須**: 各10個以上

**チェック方法**:
1. 各コンポーネントで `useState` の数をカウント
2. 各コンポーネントで `useEffect` の数をカウント
3. 10個以上の場合、カスタムフックへの抽出を提案

**抽出パターン**:
- 関連するstate群 → カスタムフック
- API呼び出しロジック → カスタムフック
- フォームロジック → `useForm` カスタムフック

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 3. Propsの数

**基準**:
- **推奨**: 10個以下
- **警告**: 10-15個
- **リファクタリング必須**: 15個以上

**チェック方法**:
1. コンポーネントのpropsをカウント
2. 15個以上の場合、以下を提案:
   - **オブジェクトにグルーピング**: 関連するpropsをオブジェクトにまとめる
   - **コンポーネント分割**: 責務を分離
   - **Contextの活用**: グローバルなデータはContextで管理

**修正パターン**:
```typescript
// ❌ Propsが多すぎる
interface Props {
  word: string;
  posTags: string[];
  gender?: string;
  definitions: string[];
  examples: Example[];
  onPress: () => void;
  onBookmark: () => void;
  isLoading: boolean;
  error: string | null;
  // ... 15個以上
}

// ✅ グルーピング
interface Props {
  wordData: {
    word: string;
    posTags: string[];
    gender?: string;
    definitions: string[];
    examples: Example[];
  };
  handlers: {
    onPress: () => void;
    onBookmark: () => void;
  };
  state: {
    isLoading: boolean;
    error: string | null;
  };
}
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 4. ネストの深さ

**基準**:
- **推奨**: 4階層以下
- **警告**: 4-6階層
- **リファクタリング必須**: 6階層以上

**チェック方法**:
1. JSX内のネスト階層を測定
2. 6階層以上の場合、コンポーネント抽出を提案

**修正パターン**:
```typescript
// ❌ ネストが深すぎる
<View>
  <View>
    <View>
      <View>
        <View>
          <View>
            <Text>...</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
</View>

// ✅ コンポーネント抽出
function InnerContent() {
  return (
    <View>
      <View>
        <Text>...</Text>
      </View>
    </View>
  );
}

function Component() {
  return (
    <View>
      <View>
        <InnerContent />
      </View>
    </View>
  );
}
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 5. 重複コードパターン

**チェック方法**:
1. 類似のコードブロックを検出:
   - 同じAPI呼び出しパターン
   - 同じstate管理パターン
   - 同じUIパターン

2. 重複が3箇所以上で発生している場合:
   - カスタムフックに抽出
   - 共通コンポーネントに抽出
   - ユーティリティ関数に抽出

**例**:
```typescript
// ❌ 重複: 各画面で同じブックマーク管理ロジック
// word-detail.tsx
const [toastVisible, setToastVisible] = useState(false);
const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
const handleBookmarkAdded = (bookmarkId: string) => {...};
const handleAddToFolder = async (folderId?: string) => {...};

// search.tsx (同じコード)
const [toastVisible, setToastVisible] = useState(false);
const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
// ...

// ✅ カスタムフックに抽出
function useBookmarkManager() {
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);

  const handleBookmarkAdded = useCallback((bookmarkId: string) => {...}, []);
  const handleAddToFolder = useCallback(async (folderId?: string) => {...}, []);

  return {
    toastVisible,
    selectedBookmarkId,
    isFolderSelectModalOpen,
    handleBookmarkAdded,
    handleAddToFolder,
    setToastVisible,
    setIsFolderSelectModalOpen,
  };
}
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 6. Propsドリリング

**問題**: propsを複数階層渡している（3階層以上）

**チェック方法**:
1. 同じpropが複数のコンポーネントを経由して渡されているパターンを検出
2. 3階層以上の場合、以下を提案:
   - **Context APIの活用**
   - **State管理ライブラリ**（Zustand、Jotai等）
   - **Composition（children pattern）**

**修正パターン**:
```typescript
// ❌ Propsドリリング
<GrandParent user={user}>
  <Parent user={user}>
    <Child user={user} />
  </Parent>
</GrandParent>

// ✅ Context
const UserContext = createContext<User | null>(null);

function GrandParent({ user }: { user: User }) {
  return (
    <UserContext.Provider value={user}>
      <Parent>
        <Child />
      </Parent>
    </UserContext.Provider>
  );
}

function Child() {
  const user = useContext(UserContext);
  return <Text>{user.name}</Text>;
}
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

### 7. カスタムフック化できるロジック

**検出パターン**:
- API呼び出し + loading/error state管理
- フォームバリデーション
- データ変換ロジック
- サブスクリプション管理

**修正パターン**:
```typescript
// ❌ コンポーネント内にロジック
function Component() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await api.getData();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ...
}

// ✅ カスタムフック
function useData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await api.getData();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, isLoading, error };
}

function Component() {
  const { data, isLoading, error } = useData();
  // ...
}
```

**ファイル対象**: `lingooo-mobile/**/*.tsx`

## 実行手順

1. 指定されたコンポーネントファイルを読み込む
2. 上記7つの分析項目を順番に実行
3. 各項目でメトリクスを計算
4. リファクタリングが必要な箇所を特定
5. 具体的なリファクタリング案を提示

## 出力フォーマット

```markdown
# コンポーネントリファクタリング分析レポート

## 対象コンポーネント
- ファイル: [ファイルパス]
- 行数: [行数]

## 複雑度メトリクス

| 項目 | 現在値 | 推奨値 | ステータス |
|------|--------|--------|-----------|
| 行数 | XXX | 200以下 | ⚠️ 警告 / ✅ OK |
| useState数 | XX | 5以下 | ⚠️ 警告 / ✅ OK |
| useEffect数 | XX | 5以下 | ⚠️ 警告 / ✅ OK |
| Props数 | XX | 10以下 | ⚠️ 警告 / ✅ OK |
| ネスト深さ | X階層 | 4階層以下 | ⚠️ 警告 / ✅ OK |

## リファクタリング提案

### [優先度: High/Medium/Low] [提案タイトル]

**問題**: [具体的な問題]

**提案**: [リファクタリング案]

**実装例**:
\`\`\`typescript
[コード例]
\`\`\`

**期待される効果**:
- [効果1]
- [効果2]

---

## 総合評価

[コンポーネント全体の評価とまとめ]
```
