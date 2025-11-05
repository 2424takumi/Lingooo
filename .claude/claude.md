# Lingooo Mobile - プロジェクトガイド

## 1. プロジェクト概要

Lingoooは、AI駆動型の言語学習モバイルアプリケーションです。日本語から英語への単語検索、AI生成による詳細な単語情報、例文、コロケーション、学習管理機能を提供します。

### 主な機能
- 日本語→英語の単語検索（Gemini AI使用）
- AI生成による単語詳細情報（定義、例文、メトリクス）
- ブックマーク、履歴管理
- 学習設定（言語、テーマ、フォントサイズ）
- ストリーミング対応の高速レスポンス

## 2. 技術スタック

### 環境情報
| 技術 | バージョン | 備考 |
|------|-----------|------|
| React | 19.1.0 | 最新安定版 |
| React Native | 0.81.5 | Expo SDK 54対応 |
| TypeScript | ~5.9.2 | 厳格な型チェック |
| Expo | ~54.0.20 | Expo Router使用 |
| Expo Router | ~6.0.13 | ファイルベースルーティング |
| Gemini API | 2.0-flash-exp | AI生成に使用 |

### 主要ライブラリ
- **@google/generative-ai**: Gemini API クライアント
- **@react-native-async-storage/async-storage**: ローカルストレージ
- **react-native-reanimated**: アニメーション
- **react-native-svg**: SVGアイコン
- **expo-speech**: 音声合成（発音機能）

## 3. ディレクトリ構成

| パス | 用途 | 命名規則 | 備考 |
|------|------|----------|------|
| `app/` | Expo Router用のルーティング定義 | `kebab-case.tsx` | ファイルベースルーティング |
| `app/(tabs)/` | タブナビゲーション配下の画面 | `index.tsx`, `search.tsx` など | 各画面は`Screen`サフィックス付き関数 |
| `components/` | 再利用可能なReactコンポーネント | `PascalCase.tsx` | デフォルトエクスポート推奨 |
| `components/ui/` | UIコンポーネント（ボタン、カード等） | `kebab-case.tsx` | 単一責任の原則を遵守 |
| `services/` | APIクライアント、ビジネスロジック | `kebab-case.ts` | 画面から分離 |
| `services/api/` | バックエンドAPI通信層 | `*.ts` | 非同期処理、エラーハンドリング |
| `services/ai/` | AI関連サービス（Gemini） | `*.ts` | プロンプト、モデル選択 |
| `types/` | TypeScript型定義 | `kebab-case.ts` | グローバル型を定義 |
| `hooks/` | カスタムReact Hooks | `use-*.ts` | `use`プレフィックス必須 |
| `constants/` | 定数定義 | `PascalCase.ts` | 設定値、色定義等 |
| `data/` | モックデータ、静的データ | `*.json` | フォールバック用 |
| `assets/` | 画像、フォント等の静的リソース | - | 直接インポート |

## 4. コーディングルール

### 4.1 TypeScript
- **厳格な型付け**: `any`の使用は最小限に（型推論を活用）
- **インターフェースの命名**: `Response`、`Props`などのサフィックスを使用
- **型のエクスポート**: `export type`で明示的にエクスポート
- **オプショナルチェーン**: `?.`を活用してnullチェックを簡潔に

### 4.2 React/React Native
- **関数コンポーネント**: クラスコンポーネントは使用しない
- **Hooks**:
  - `useState`, `useEffect`等を適切に使用
  - カスタムHooksは`hooks/`に分離
  - 依存配列を必ず指定（eslintに従う）
- **デフォルトエクスポート**: コンポーネントはデフォルトエクスポート
- **Named Export**: ユーティリティ関数、型定義はNamed Export
- **Props**: インターフェースで型定義（`ComponentNameProps`）

```typescript
// Good
interface SearchBarProps {
  placeholder?: string;
  onSearch: (text: string) => void;
}

export default function SearchBar({ placeholder, onSearch }: SearchBarProps) {
  // ...
}
```

### 4.3 スタイリング
- **StyleSheet.create**: React NativeのStyleSheetを使用
- **インラインスタイル**: 動的な値のみ（色の切り替え等）
- **命名**: スタイル名は`camelCase`（`container`, `headerTitle`）
- **テーマ**: `useThemeColor` Hookで色を管理

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
```

### 4.4 非同期処理
- **async/await**: Promiseは`async/await`で処理
- **エラーハンドリング**: try-catchで必ずエラーをキャッチ
- **ローディング状態**: `isLoading`フラグを使用
- **AbortController**: 必要に応じてリクエストのキャンセルを実装

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

try {
  setIsLoading(true);
  const data = await getWordDetail(word);
  setWordData(data);
} catch (err: any) {
  setError(err.message || 'エラーが発生しました');
} finally {
  setIsLoading(false);
}
```

### 4.5 AI生成（Gemini API）
- **プロンプト最適化**: 簡潔で明確なプロンプト（トークン削減）
- **モデル選択**: `model-selector.ts`でシナリオ別にモデルを選択
- **ストリーミング**: 長時間の処理は`generateTextStream`を使用
- **JSON出力**: `responseMimeType: 'application/json'`を活用
- **エラーフォールバック**: API失敗時はモックデータを使用

```typescript
// services/ai/dictionary-generator.ts
const prompt = `英単語"${word}"の辞書情報を以下のJSON形式で出力：...`;
const result = await generateJSON<WordDetailResponse>(prompt, modelConfig);
```

### 4.6 ナビゲーション
- **Expo Router**: ファイルベースルーティング
- **router.push**: 画面遷移は`useRouter()`の`push`を使用
- **パラメータ**: `useLocalSearchParams()`でクエリパラメータ取得
- **戻る処理**: `router.back()`または`router.canGoBack()`で条件分岐
- **遷移履歴**: 画面間の遷移元を`fromPage`パラメータで管理

```typescript
// 遷移
router.push({
  pathname: '/(tabs)/word-detail',
  params: { word: 'study', fromPage: 'search' },
});

// 戻る
const handleBack = () => {
  if (fromPage === 'search') {
    router.push({ pathname: '/(tabs)/search', params: {...} });
  } else {
    router.back();
  }
};
```

### 4.7 パフォーマンス
- **メモ化**: `useMemo`, `useCallback`で不要な再計算を防ぐ
- **リスト最適化**: 長いリストは`FlatList`または`ScrollView`
- **画像最適化**: `expo-image`を使用（自動最適化）
- **遅延ロード**: 必要になるまでコンポーネントをロードしない
- **ストリーミング**: AI生成は部分的なデータを先に表示

### 4.8 データ管理
- **AsyncStorage**: 永続化が必要なデータ（設定、履歴）
- **キー命名**: `@lingooo_*`プレフィックス（例: `@lingooo_theme`）
- **JSON化**: オブジェクトは`JSON.stringify/parse`で保存
- **エラーハンドリング**: AsyncStorageの失敗は静かに処理

```typescript
const STORAGE_KEY = '@lingooo_theme';

// 保存
await AsyncStorage.setItem(STORAGE_KEY, themeName);

// 読み込み
const saved = await AsyncStorage.getItem(STORAGE_KEY);
```

### 4.9 アクセシビリティ
- **accessibilityLabel**: タッチ要素には必須
- **accessibilityRole**: 適切なロール（button, header等）
- **フォントサイズ**: ユーザー設定に対応
- **コントラスト**: WCAG AA基準を満たす色使い

### 4.10 その他
- **コメント**: 複雑なロジックには日本語コメント
- **console.log**: デバッグ用、本番前に削除
- **TODO**: 実装予定箇所には`// TODO: 説明`
- **環境変数**: `.env`で管理、`EXPO_PUBLIC_*`プレフィックス
- **絵文字**: ユーザーが明示的に要求しない限り使用しない

## 5. ファイル作成時の注意点

### 新規画面の追加
1. `app/(tabs)/`に画面ファイルを作成
2. `UnifiedHeaderBar`でヘッダーを統一
3. `useThemeColor`でテーマ対応
4. ローディング・エラー状態を適切に処理

### 新規コンポーネントの追加
1. `components/ui/`に配置
2. Propsインターフェースを定義
3. デフォルトエクスポート
4. StyleSheet.createでスタイル定義

### 新規サービスの追加
1. `services/api/`または`services/ai/`に配置
2. 型定義は`types/`に分離
3. エラーハンドリングを実装
4. モックデータでフォールバック対応

## 6. 設計原則

### 単一責任の原則
- 1つのコンポーネント/関数は1つの責任のみ
- 複雑なロジックは別ファイルに分離

### DRY（Don't Repeat Yourself）
- 共通ロジックはHooksやユーティリティ関数に抽出
- UIパターンは再利用可能なコンポーネント化

### レイヤー分離
```
app/ (View層: UI、ユーザー入力)
  ↓
services/ (Service層: ビジネスロジック、API通信)
  ↓
types/ (Model層: データ構造)
```

### エラーハンドリング
- すべての非同期処理でエラーをキャッチ
- ユーザーにわかりやすいエラーメッセージ
- フォールバック処理を用意

### ユーザビリティ
- ローディング中は`ActivityIndicator`を表示
- ストリーミングで段階的にコンテンツを表示
- エラー時に明確なフィードバック

## 7. プロジェクト固有の慣例

### AIプロンプト設計
- 簡潔で明確な指示（トークン削減）
- JSON出力形式を明示
- 例を含めて具体的に

### ナビゲーションパラメータ
- 遷移元を`fromPage`で管理
- データは極力パラメータではなくAPIで再取得
- 検索結果など大きいデータはJSON文字列化

### 色とテーマ
- プライマリカラー: `#00AA69`（緑）
- 背景色: `#FAFCFB`（ライトグレー）
- テキスト: `#000000`（黒）、`#686868`（グレー）
- `useThemeColor` Hookで一元管理

### アイコン
- SVGコンポーネントとして定義（`react-native-svg`）
- サイズと色をPropsで制御可能に
- `viewBox`は元のサイズを保持

## 8. よくある実装パターン

### 設定画面
```typescript
const [setting, setSetting] = useState(defaultValue);

useEffect(() => {
  loadSetting();
}, []);

const loadSetting = async () => {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved) setSetting(saved);
};

const handleSave = async (value: string) => {
  setSetting(value);
  await AsyncStorage.setItem(STORAGE_KEY, value);
};
```

### AI生成画面（ストリーミング対応）
```typescript
const [data, setData] = useState<Partial<ResponseType> | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [progress, setProgress] = useState(0);

useEffect(() => {
  const load = async () => {
    const result = await generateStream(query, (prog, partial) => {
      setProgress(prog);
      if (partial) {
        setData(partial);
        if (partial.essentialField) setIsLoading(false);
      }
    });
    setData(result);
    setProgress(100);
  };
  load();
}, [query]);
```

## 9. デバッグとログ

- **開発環境**: `console.log`でログ出力（本番前に削除）
- **ネットワーク**: `[API]`、`[Stream]`等のプレフィックスを使用
- **エラー**: `console.error`でスタックトレース付きで出力
- **パフォーマンス**: 処理時間は`Date.now()`で計測

```typescript
console.log('[WordDetail API] Starting for:', word);
const startTime = Date.now();
// ... 処理 ...
console.log(`[WordDetail API] Completed in ${Date.now() - startTime}ms`);
```

## 10. テストとビルド

### 開発
```bash
npm start                # 開発サーバー起動
npm run ios             # iOSシミュレーター
npm run android         # Androidエミュレーター
```

### Lint
```bash
npm run lint            # ESLintチェック
```

---

**注意**: このドキュメントは、AIアシスタントがコーディング支援を行う際の基準となります。文脈依存の細かい判断は、その都度の会話で対応してください。
