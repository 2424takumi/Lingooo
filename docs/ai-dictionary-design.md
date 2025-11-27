# AI辞書システム 設計ドキュメント

## 📋 概要

Gemini Flash APIを使用したAIベース辞書システムの詳細設計

**最終更新:** 2025-11-01 (Nani Translate 学習内容を反映)

---

## 🎯 設計目標

1. **網羅性100%** - どんな単語でも対応
2. **速度 <500ms** - 実用的な辞書として機能
3. **多言語対応** - 英語・日本語・その他
4. **コスト効率** - 月額¥3,000以内（1000 DAU）
5. **優れたUX** - ローディング、エラーハンドリング

---

## 🌍 多言語対応

### **対応可能な言語**

Gemini Flashは100以上の言語に対応：

| 言語ペア | 対応 | 品質 |
|---------|------|------|
| 英語 → 日本語 | ✅ | ★★★★★ |
| 日本語 → 英語 | ✅ | ★★★★★ |
| 英語 → 中国語 | ✅ | ★★★★☆ |
| 英語 → 韓国語 | ✅ | ★★★★☆ |
| 英語 → スペイン語 | ✅ | ★★★★★ |

### **実装方針**

**Phase 1:** 英語↔日本語のみ
**Phase 2:** ユーザーリクエストに応じて拡張

**設定方法:**
```typescript
interface DictionaryRequest {
  word: string;
  sourceLang: 'en' | 'ja' | 'zh' | 'ko' | 'es';
  targetLang: 'en' | 'ja' | 'zh' | 'ko' | 'es';
}
```

---

## ⚡ 速度パフォーマンス

### **レイテンシ測定**

| シナリオ | 時間 | 体感 |
|---------|------|------|
| **キャッシュヒット** | 50-100ms | ⚡ 即座 |
| **ローカルDB検索** | 100-200ms | ⚡ 高速 |
| **AI生成（初回）** | 1500-3000ms | 🐢 待たされる |
| **AI生成 + ストリーミング** | 500ms（初期表示） | ✅ 許容範囲 |

### **速度改善戦略**

#### **1. 楽観的UI（Optimistic UI）**

```
ユーザーが検索ボタンを押す
  ↓ 0ms
スケルトンローディング表示
  ↓ 100ms
「生成中...」プログレスバー
  ↓ 500ms
ストリーミング表示開始（最初の文が表示される）
  ↓ 1500ms
完全なデータ表示
```

**体感速度:** 500ms（最初の情報が見える）

#### **2. ストリーミングレスポンス**

Gemini APIはストリーミング対応：
```typescript
// 逐次表示
for await (const chunk of response.stream()) {
  updateUI(chunk); // 段階的に表示
}
```

**効果:** 3秒待つ → 0.5秒で表示開始

#### **3. プリフェッチング**

ユーザーが入力中に予測：
```
ユーザーが「stu」と入力
  ↓
「study」「student」「stupid」を先読み生成
  ↓
Enterを押した瞬間に表示
```

**体感速度:** <100ms

---

## 🤖 マルチモデル戦略

### **Nani Translate から学んだ最適化**

参考: [Nani Translate の技術選定](https://zenn.dev/catnose99/articles/nani-translate)

複数のAIモデルを用途に応じて使い分けることで、**速度とコストを最適化**します。

### **モデル選択マトリクス**

| シナリオ | モデル | TTFT | コスト/1K | 品質 | 選定理由 |
|---------|--------|------|-----------|------|----------|
| **無料版検索** | Gemini Flash 2.0 | 300-500ms | ¥0.03 | ★★★★☆ | 速度・コスト・品質のバランス |
| **超高速プリフェッチ** | Groq Llama 3.1 | 100-200ms | ¥0.01 | ★★★☆☆ | TTFT最速、入力予測に最適 |
| **Pro版高品質** | Claude Sonnet 4.5 | 500-800ms | ¥0.15 | ★★★★★ | 最高品質、チャット機能向け |
| **Pro版バランス** | Claude Haiku 3.5 | 300-400ms | ¥0.05 | ★★★★☆ | 高速 + 高品質 |

### **実装: モデルセレクター**

```typescript
// services/ai/model-selector.ts

interface ModelConfig {
  provider: 'gemini' | 'groq' | 'claude';
  model: string;
  maxTokens: number;
  temperature: number;
}

export function selectModel(context: {
  scenario: 'search' | 'prefetch' | 'chat' | 'pro';
  userTier: 'free' | 'pro';
  complexity: 'simple' | 'complex';
}): ModelConfig {
  const { scenario, userTier, complexity } = context;

  // 1. プリフェッチは常にGroq（最速）
  if (scenario === 'prefetch') {
    return {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      maxTokens: 1000,
      temperature: 0.3,
    };
  }

  // 2. Pro版チャットはClaude Sonnet（最高品質）
  if (scenario === 'chat' && userTier === 'pro') {
    return {
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2000,
      temperature: 0.7,
    };
  }

  // 3. Pro版検索はClaude Haiku（速度+品質）
  if (scenario === 'search' && userTier === 'pro') {
    return {
      provider: 'claude',
      model: 'claude-haiku-3-5-20241022',
      maxTokens: 1500,
      temperature: 0.5,
    };
  }

  // 4. デフォルトはGemini Flash（バランス）
  return {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 1500,
    temperature: 0.4,
  };
}
```

### **コスト削減効果**

| 戦略 | 削減率 | 説明 |
|------|--------|------|
| **モデル使い分け** | -30% | プリフェッチはGroq、検索はGemini |
| **プリキャッシュ** | -60% | 5000語事前生成で90%カバー |
| **レート制限** | -20% | 無料版は1日10検索まで |
| **合計** | **-70%** | ¥1,500 → **¥450/月** (1000 DAU) |

---

## ⚡ Pre-flight Request 最適化

### **問題: ページ遷移とAPI呼び出しの直列処理**

従来の実装では、APIレスポンスを待ってからページ遷移するため、無駄な待ち時間が発生：

```
ユーザーが検索ボタン押下
  ↓ 0ms
API呼び出し開始
  ↓ 500ms (待ち時間)
APIレスポンス受信
  ↓ 0ms
ページ遷移開始
  ↓ 100ms
ページ表示完了
= 合計 600ms
```

### **解決策: ページ遷移とAPI呼び出しを並列化**

ページ遷移を先に開始し、API呼び出しをバックグラウンドで実行：

```
ユーザーが検索ボタン押下
  ↓ 0ms (並列実行)
  ├─ API呼び出し開始 (500ms)
  └─ ページ遷移開始 (100ms)
  ↓ 100ms
ページ表示完了（ローディング表示）
  ↓ 400ms
APIレスポンス受信 → データ表示
= 合計 500ms（100ms短縮）
```

### **実装: Pre-flight Fetch**

```typescript
// hooks/use-preflight-search.ts

import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { getWordDetail } from '@/services/api/search';

export function usePreflightSearch() {
  const router = useRouter();
  const preflightPromise = useRef<Promise<any> | null>(null);

  /**
   * 検索を実行（Pre-flight最適化版）
   */
  const handleSearch = async (word: string) => {
    // 1. API呼び出しを開始（await しない）
    const fetchPromise = getWordDetail(word);
    preflightPromise.current = fetchPromise;

    // 2. すぐにページ遷移（並列実行）
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word,
        // データは渡さない（ページ側で取得）
      },
    });

    // 3. Promise参照を保持（ページ側で使用）
    return fetchPromise;
  };

  /**
   * Pre-flightで開始したPromiseを取得
   */
  const getPreflightPromise = (): Promise<any> | null => {
    return preflightPromise.current;
  };

  return {
    handleSearch,
    getPreflightPromise,
  };
}
```

**ページ側での受け取り:**

```typescript
// app/(tabs)/word-detail.tsx

import { usePreflightSearch } from '@/hooks/use-preflight-search';

export default function WordDetailScreen() {
  const { getPreflightPromise } = usePreflightSearch();
  const [wordData, setWordData] = useState<WordDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWordData = async () => {
      try {
        setIsLoading(true);

        // 1. Pre-flightのPromiseを確認
        const preflightPromise = getPreflightPromise();

        let data;
        if (preflightPromise) {
          // Pre-flightがあればそれを使用（すでに進行中）
          data = await preflightPromise;
        } else {
          // なければ新規に取得
          data = await getWordDetail(word);
        }

        setWordData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadWordData();
  }, [word]);

  // ...
}
```

### **効果測定**

| 指標 | 従来 | Pre-flight | 改善 |
|------|------|-----------|------|
| ページ表示開始 | 500ms | 100ms | **-400ms** ⚡ |
| データ表示完了 | 600ms | 500ms | -100ms |
| 体感速度 | 🐢 遅い | ✅ 速い | 4倍高速 |

---

## 📝 生成内容の仕様

### **データスキーマ**

```typescript
interface WordDetailResponse {
  // 基本情報
  headword: {
    lemma: string;           // "study"
    pronunciation: string;   // "/ˈstʌdi/"
    pos: string[];          // ["noun", "verb"]
  };

  // 定義（品詞ごと）
  senses: Array<{
    pos: string;            // "verb"
    glossShort: string;     // "勉強する"
    glossLong: string;      // "知識や技能を習得するために..."
    register?: string;      // "formal", "informal", "slang"
  }>;

  // メトリクス（AI生成）
  metrics: {
    frequency: number;      // 1-10（使用頻度）
    difficulty: number;     // 1-10（難易度）
    nuance: string;        // "カジュアル"/"フォーマル"
  };

  // 例文（3-5個、AI生成）
  examples: Array<{
    textSrc: string;       // "I study English every day."
    textDst: string;       // "私は毎日英語を勉強します。"
    context?: string;      // "日常会話"
  }>;

  // 語源（AI生成）
  etymology?: {
    origin: string;        // "ラテン語 studium（熱意）"
    explanation: string;   // "もともとは..."
  };

  // 関連語（AI生成）
  related?: {
    synonyms: string[];    // ["learn", "research"]
    antonyms: string[];    // ["ignore", "neglect"]
    collocations: string[]; // ["study hard", "study abroad"]
  };

  // メタデータ
  metadata: {
    source: 'ai' | 'cache';
    generatedAt: string;   // ISO 8601
    cacheVersion: number;  // キャッシュ無効化用
  };
}
```

### **AIプロンプト設計（最適化版）**

#### **2段階生成戦略**

トークン使用量を40-50%削減するため、2つのプロンプトを使い分けます：

##### **1. 基本情報プロンプト（Stage 1）**

超高速表示用（0.2-0.3秒）：

```typescript
// services/ai/prompt-generator.ts: createBasicInfoPrompt()

const BASIC_INFO_PROMPT = `
{lang}の単語"{word}"の基本情報を以下のJSON構造で最小限のトークンで生成：

{
  "headword": {"lemma": "{word}", "lang": "{targetLang}", "pos": ["品詞（英語、例: verb, noun）"]},
  "senses": [{"id": "1", "glossShort": "簡潔な{nativeLang}の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}]
}

要件:
- sensesは2-3個、主要な意味のみ（各10文字以内）
- {nativeLang}の説明は簡潔で分かりやすく
- 超高速レスポンス用のため最小限の情報のみ
`;
```

**トークン数**: 200-300トークン

##### **2. 追加詳細プロンプト（Stage 2）**

hint + metrics + examples のみ生成（最適化版）：

```typescript
// services/ai/prompt-generator.ts: createAdditionalDetailsPrompt()

const ADDITIONAL_DETAILS_PROMPT = `
{lang}の単語"{word}"について、以下の追加情報のみを生成してください：

{
  "hint": {"text": "{nativeLang}で2〜3文の簡潔な説明（使用場面・ニュアンス・類似語との違いなど、学習に最も重要な特徴2点）"},
  "metrics": {"frequency": 頻出度0-100, "difficulty": 難易度0-100, "nuance": ニュアンスの強さ0-100},
  "examples": [
    {"textSrc": "自然な{lang}の例文", "textDst": "自然な{nativeLang}訳"},
    {"textSrc": "{lang}例文2", "textDst": "{nativeLang}訳2"},
    {"textSrc": "{lang}例文3", "textDst": "{nativeLang}訳3"}
  ]
}

要件:
- hint, metrics, examples のみを生成（headwordとsensesは不要）
- hintは{nativeLang}で2〜3文、学習に最も重要な2つの特徴（使用場面・ニュアンス・文法・類似語との違いなど）
- 例文は3-5個、実用的で自然な{lang}の文
- metricsは実際の使用頻度を反映
- {nativeLang}の説明は自然で分かりやすく
`;
```

**トークン数**: 400-600トークン（従来の800-1200から50%削減）

##### **3. 完全辞書プロンプト（レガシー・フォールバック用）**

シングルリクエストで全データを生成する場合のみ使用：

```typescript
// services/ai/prompt-generator.ts: createDictionaryPrompt()

const DICTIONARY_PROMPT = `
{lang}の単語"{word}"の辞書情報を以下のJSON構造で生成してください：

{
  "headword": {"lemma": "{word}", "lang": "{targetLang}", "pos": ["品詞（英語、例: verb, noun）"]},
  "senses": [{"id": "1", "glossShort": "簡潔な{nativeLang}の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}],
  "hint": {"text": "{nativeLang}で2〜3文の簡潔な説明（使用場面・ニュアンス・類似語との違いなど、学習に最も重要な特徴2点）"},
  "metrics": {"frequency": 頻出度0-100, "difficulty": 難易度0-100, "nuance": ニュアンスの強さ0-100},
  "examples": [
    {"textSrc": "自然な{lang}の例文", "textDst": "自然な{nativeLang}訳"},
    {"textSrc": "{lang}例文2", "textDst": "{nativeLang}訳2"},
    {"textSrc": "{lang}例文3", "textDst": "{nativeLang}訳3"}
  ]
}

要件:
- この順序（headword → senses → hint → metrics → examples）で必ず生成
- hintは{nativeLang}で2〜3文、学習に最も重要な2つの特徴（使用場面・ニュアンス・文法・類似語との違いなど）
- sensesは2-3個、主要な意味のみ（各10文字以内）
- 例文は3-5個、実用的で自然な{lang}の文
- metricsは実際の使用頻度を反映
- {nativeLang}の説明は自然で分かりやすく
`;
```

**トークン数**: 800-1200トークン

#### **実装フロー**

```typescript
// services/ai/dictionary-generator.ts: generateWordDetailTwoStage()

async function generateWordDetailTwoStage(word, targetLang, nativeLang) {
  // Stage 1: 基本情報を超高速取得（0.2-0.3秒）
  const basicPrompt = createBasicInfoPrompt(word, targetLang, nativeLang);
  const basicPromise = generateBasicInfo(basicPrompt);

  // Stage 2: 追加詳細のみを生成（~1.5秒、最適化により高速化）
  const additionalPrompt = createAdditionalDetailsPrompt(word, targetLang, nativeLang);
  const additionalPromise = generateJSONProgressive(additionalPrompt);

  // 基本情報が来たら即表示（0.2-0.3秒）
  const basicResult = await basicPromise;
  onProgress(30, basicResult.data); // ヘッダー + 意味だけ表示

  // 追加詳細を待つ（~1.5秒）
  const additionalResult = await additionalPromise;

  // 基本情報と追加詳細をマージ
  const mergedData = {
    ...basicResult.data,
    ...additionalResult.data,
  };

  onProgress(100, mergedData); // 完全なデータを表示
  return mergedData;
}
```

#### **最適化効果**

| 指標 | 従来 | 最適化後 | 削減率 |
|------|------|---------|--------|
| **Stage 1 トークン** | 200-300 | 200-300 | 0% |
| **Stage 2 トークン** | 800-1200 | 400-600 | **50%** |
| **合計トークン** | 1000-1500 | 600-900 | **40-50%** |
| **Stage 2 レイテンシ** | 2.5秒 | 1.5秒 | **40%** |
| **コスト削減** | - | - | **40-50%** |

**注意**:
- `createBasicInfoPrompt()`: Stage 1専用（headword + senses のみ）
- `createAdditionalDetailsPrompt()`: Stage 2専用（hint + metrics + examples のみ）⭐ **新規追加**
- `createDictionaryPrompt()`: レガシー・フォールバック用（全フィールド）

---

## 💾 キャッシング戦略

### **3層キャッシュ構造**

```
┌─────────────────────────────────┐
│ Layer 1: メモリキャッシュ       │ ← 最速、<10ms
│ (React State)                  │
└─────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────┐
│ Layer 2: ローカルDB             │ ← 50-100ms
│ (SQLite)                       │
└─────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────┐
│ Layer 3: クラウドDB             │ ← 200-500ms
│ (Supabase - 全ユーザー共有)    │
└─────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────┐
│ AI生成 (Gemini Flash)          │ ← 1500-3000ms
│ → 全層に保存                    │
└─────────────────────────────────┘
```

### **キャッシュ無効化戦略**

```typescript
interface CacheEntry {
  word: string;
  data: WordDetailResponse;
  version: number;        // スキーマバージョン
  createdAt: number;      // timestamp
  accessCount: number;    // 人気度
  lastAccessedAt: number; // 最終アクセス
}

// キャッシュ無効化ルール
const CACHE_RULES = {
  // 古いバージョンは無効化
  invalidateIfVersionOld: true,

  // 30日間アクセスなし = 削除
  maxAge: 30 * 24 * 60 * 60 * 1000,

  // 人気な単語は優先保持
  keepIfAccessCountOver: 10,
};
```

### **SQLiteスキーマ**

```sql
CREATE TABLE dictionary_cache (
  word TEXT PRIMARY KEY,
  data TEXT NOT NULL,           -- JSON
  version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER NOT NULL
);

CREATE INDEX idx_access_count ON dictionary_cache(access_count DESC);
CREATE INDEX idx_last_accessed ON dictionary_cache(last_accessed_at DESC);
```

---

## 🚨 エラーハンドリング

### **エラー分類**

| エラー | 原因 | 対処 |
|--------|------|------|
| **Network Error** | ネット接続なし | キャッシュのみ表示 + オフライン通知 |
| **API Rate Limit** | リクエスト過多 | 1分待って再試行 |
| **API Error 500** | サーバーエラー | フォールバック辞書API使用 |
| **Invalid JSON** | AI生成失敗 | 再生成（3回まで） |
| **Word Not Found** | 造語・誤字 | タイポ補正提案 |

### **フォールバック戦略**

```typescript
async function getWordDetail(word: string): Promise<WordDetailResponse> {
  try {
    // 1. キャッシュチェック
    const cached = await checkCache(word);
    if (cached) return cached;

    // 2. AI生成
    const result = await generateWithAI(word);
    await saveToCache(word, result);
    return result;

  } catch (error) {
    if (error.type === 'network') {
      // オフライン: キャッシュのみ
      return getCachedOrNull(word);
    }

    if (error.type === 'rate_limit') {
      // レート制限: Free Dictionary APIへ
      return await fallbackToFreeDictionary(word);
    }

    // その他: エラー表示
    throw new UserFriendlyError(
      `「${word}」の取得に失敗しました。もう一度お試しください。`
    );
  }
}
```

---

## 🎨 ユーザー体験設計

### **ローディング状態**

```typescript
// 状態管理
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number } // 0-100
  | { status: 'streaming'; text: string }   // 段階的表示
  | { status: 'success'; data: WordDetailResponse }
  | { status: 'error'; error: string };
```

**UIの遷移:**

```
[idle]
  ↓ 検索ボタン押下
[loading: 0%] - スケルトン表示
  ↓ 100ms
[loading: 30%] - 「生成中...」
  ↓ 500ms
[streaming] - 定義から順次表示
  ↓ 1500ms
[success] - 完全表示
```

### **プログレッシブレンダリング**

```typescript
// 段階的に表示
const renderOrder = [
  'headword',      // 0.5秒
  'senses',        // 1.0秒
  'metrics',       // 1.5秒
  'examples',      // 2.0秒
  'etymology',     // 2.5秒
  'related',       // 3.0秒
];
```

**効果:**
- 3秒待つ → 0.5秒で何か見える
- 体感速度が大幅向上

---

## 📊 コスト管理

### **リクエスト予測**

| DAU | 1日検索数 | ユニーク単語 | AI呼び出し | 月額コスト |
|-----|-----------|-------------|------------|-----------|
| 100 | 1,000 | 200 | 200/日 | ¥200 |
| 500 | 5,000 | 800 | 800/日 | ¥800 |
| 1,000 | 10,000 | 1,500 | 1,500/日 | ¥1,500 |
| 5,000 | 50,000 | 5,000 | 5,000/日 | ¥5,000 |

**重複率:** 85-90%（キャッシュヒット率）

### **コスト最適化**

1. **バッチプリキャッシュ**
   - 頻出5,000語を事前生成
   - 初期コスト: ¥150
   - カバー率: 95%

2. **スマートキャッシング**
   - 人気単語は永久保存
   - 低頻度単語は30日で削除

3. **Pro版への誘導**
   - 無料版: 1日10検索まで
   - Pro版: 無制限（¥500/月）

---

## 🚦 レート制限の実装

### **Upstash Redis によるレート制限**

Nani Translateと同様に、無料版ユーザーの検索回数を制限してコストをコントロールします。

### **なぜ Upstash Redis？**

| 機能 | 説明 | メリット |
|------|------|----------|
| **エッジ最適化** | グローバルに分散配置 | 低レイテンシ（<50ms） |
| **従量課金** | リクエスト数に応じた課金 | 小規模でも低コスト |
| **REST API** | HTTP経由で利用可能 | モバイルから直接アクセス可 |
| **無料枠** | 10,000 requests/日 | 開発・テスト段階は無料 |

### **実装: レート制限サービス**

```typescript
// services/rate-limit/upstash.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash Redis クライアント
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// レート制限設定
const ratelimits = {
  // 無料版: 1日10検索
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 d"),
    analytics: true,
    prefix: "ratelimit:free",
  }),

  // Pro版: 1日1000検索（実質無制限）
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 d"),
    analytics: true,
    prefix: "ratelimit:pro",
  }),
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp
}

/**
 * レート制限をチェック
 */
export async function checkRateLimit(
  userId: string,
  tier: 'free' | 'pro' = 'free'
): Promise<RateLimitResult> {
  const limiter = ratelimits[tier];
  const identifier = `${tier}:${userId}`;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    remaining,
    limit,
    reset,
  };
}

/**
 * 残り検索回数を取得
 */
export async function getRemainingSearches(
  userId: string,
  tier: 'free' | 'pro' = 'free'
): Promise<number> {
  const result = await checkRateLimit(userId, tier);
  return result.remaining;
}
```

### **統合: 検索APIに組み込む**

```typescript
// hooks/use-search.ts の更新

import { checkRateLimit } from '@/services/rate-limit/upstash';
import { getUserId, getUserTier } from '@/services/auth';

export function useSearch() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string): Promise<boolean> => {
    // 1. 入力検証
    const validation = validateSearchInput(query);
    if (!validation.valid) {
      setError(validation.error || '入力エラー');
      return false;
    }

    // 2. レート制限チェック
    const userId = await getUserId();
    const tier = await getUserTier();

    const rateLimit = await checkRateLimit(userId, tier);

    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset * 1000);
      const resetTime = resetDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setError(
        `本日の検索上限（${rateLimit.limit}回）に達しました。\n` +
        `次回リセット: ${resetTime}\n\n` +
        `Pro版にアップグレードして無制限に検索しましょう！`
      );
      return false;
    }

    // 残り回数を表示（3回以下の場合）
    if (rateLimit.remaining <= 3) {
      console.log(`残り検索回数: ${rateLimit.remaining}回`);
    }

    setError(null);
    setIsLoading(true);

    try {
      // 3. 検索実行
      const normalizedQuery = normalizeQuery(query);
      const detectedLang = detectLang(normalizedQuery);
      const resolvedLang = resolveMixedLanguage(detectedLang);

      if (resolvedLang === 'ja') {
        await searchAndNavigateToJp(normalizedQuery);
      } else {
        await searchAndNavigateToEn(normalizedQuery);
      }

      return true;
    } catch (err) {
      const searchError = err as SearchError;
      setError(searchError.message || '検索中にエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ...
}
```

### **UI表示: 残り回数の通知**

```typescript
// components/ui/search-quota-badge.tsx

interface SearchQuotaBadgeProps {
  remaining: number;
  limit: number;
  tier: 'free' | 'pro';
}

export function SearchQuotaBadge({ remaining, limit, tier }: SearchQuotaBadgeProps) {
  if (tier === 'pro') {
    return (
      <View style={styles.badge}>
        <CrownIcon size={16} color="#FFD700" />
        <Text style={styles.proText}>Pro版 - 無制限</Text>
      </View>
    );
  }

  const percentage = (remaining / limit) * 100;
  const isLow = remaining <= 3;

  return (
    <View style={[styles.badge, isLow && styles.badgeLow]}>
      <Text style={[styles.text, isLow && styles.textLow]}>
        残り {remaining}/{limit} 回
      </Text>
      {isLow && (
        <Text style={styles.upgradeHint}>Pro版で無制限に！</Text>
      )}
    </View>
  );
}
```

### **コスト効果**

| ユーザー層 | 1日検索数 | AI呼び出し | 月額コスト |
|-----------|-----------|------------|-----------|
| **無料版 (90%)** | 平均 3回 | 3回/日 | ¥0.09/ユーザー |
| **Pro版 (10%)** | 平均 30回 | 30回/日 | ¥0.90/ユーザー |
| **平均** | - | - | **¥0.18/ユーザー** |

1000 DAU の場合: **¥180/月**（レート制限なしだと ¥1,500/月）

---

## 🎌 日本語IME対応

### **問題: IME入力時のプリフェッチ誤動作**

日本語入力時、変換確定前の「未確定文字（composing）」でもAPI呼び出しが発生し、無駄なリクエストが増える：

```
ユーザー入力: 「べ」「ん」「きょ」「う」（変換前）
  ↓ 各入力でAPI呼び出し（4回）

確定: 「勉強」
  ↓ さらにAPI呼び出し（1回）

= 合計 5回（本来1回で済む）
```

### **解決策: IME状態の検出**

React Native では `onCompositionStart`/`onCompositionEnd` が使えないため、別の方法で対応：

```typescript
// components/ui/search-bar.tsx

import { TextInput } from 'react-native';
import { useState, useRef } from 'react';

export function SearchBar({ onSearch, ...props }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const isComposing = useRef(false);
  const lastInputTime = useRef(0);

  const handleChangeText = (text: string) => {
    setInputValue(text);

    // IME入力中の判定（簡易版）
    // 日本語入力時は入力速度が速いため、短時間での変更を検出
    const now = Date.now();
    const timeDiff = now - lastInputTime.current;
    lastInputTime.current = now;

    if (timeDiff < 100) {
      // 100ms以内の入力 = IME入力中の可能性が高い
      isComposing.current = true;
      return;
    }

    isComposing.current = false;

    // プリフェッチは確定後のみ
    if (text.length >= 3 && !isComposing.current) {
      debouncedPrefetch(text);
    }
  };

  const handleSubmitEditing = () => {
    // 検索実行時は必ず実行
    isComposing.current = false;
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  return (
    <TextInput
      value={inputValue}
      onChangeText={handleChangeText}
      onSubmitEditing={handleSubmitEditing}
      autoComplete="off"
      autoCorrect={false}
      {...props}
    />
  );
}
```

### **より正確な検出: デバウンス併用**

```typescript
// hooks/use-debounced-prefetch.ts

import { useRef, useCallback } from 'react';
import { debounce } from 'lodash';

export function useDebouncedPrefetch(
  prefetchFn: (query: string) => void,
  delay: number = 500 // IME確定を待つ
) {
  // デバウンスされたプリフェッチ
  const debouncedPrefetch = useRef(
    debounce((query: string) => {
      prefetchFn(query);
    }, delay)
  ).current;

  return debouncedPrefetch;
}
```

### **効果**

| 指標 | IME対応前 | IME対応後 | 削減率 |
|------|-----------|-----------|--------|
| 日本語検索時のAPI呼び出し | 5-10回 | 1回 | **-80%** |
| 無駄なコスト | ¥0.30 | ¥0.03 | -90% |

---

## 📦 バンドルサイズ最適化

### **問題: アプリサイズの肥大化**

AI SDK、アニメーションライブラリ、アイコンなどで初期バンドルが大きくなりがち。

### **最適化戦略**

#### **1. AI SDK の Tree Shaking**

```typescript
// ❌ 悪い例: SDK全体をインポート
import * as GoogleAI from '@google/generative-ai';

// ✅ 良い例: 必要な機能のみインポート
import { GoogleGenerativeAI } from '@google/generative-ai';
```

#### **2. アイコンの最適化**

```typescript
// ❌ 悪い例: アイコンライブラリ全体
import Icon from 'react-native-vector-icons/MaterialIcons';

// ✅ 良い例: カスタムSVGアイコン（すでに実装済み）
import { SettingsIcon } from '@/components/ui/icons';
```

#### **3. 遅延ロード（Lazy Loading）**

```typescript
// services/ai/gemini-client.ts

let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Geminiクライアントを遅延初期化
 */
export async function getGeminiClient() {
  if (!geminiClient) {
    // 初回使用時のみインポート
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return geminiClient;
}
```

#### **4. Metro Bundler の最適化**

```javascript
// metro.config.js

module.exports = {
  transformer: {
    minifierConfig: {
      compress: {
        drop_console: true, // console.log削除
      },
    },
  },
  resolver: {
    // 未使用のプラットフォーム固有コードを除外
    platforms: ['ios', 'android'],
  },
};
```

### **バンドルサイズ目標**

| カテゴリ | サイズ | 備考 |
|---------|--------|------|
| **コアアプリ** | 2-3 MB | UI、ナビゲーション |
| **AI SDKs** | 500 KB | Tree shaking後 |
| **画像・アセット** | 1 MB | 最適化済みSVG |
| **合計** | **3.5-4.5 MB** | 許容範囲 |

---

## 🔄 段階的ロールアウト

### **Phase 1: MVP（2週間）**

**コア機能:**
- [ ] Gemini Flash API統合
- [ ] マルチモデルセレクター実装
- [ ] ローカルキャッシュ（SQLite）
- [ ] 基本的な生成機能
- [ ] エラーハンドリング

**速度最適化:**
- [ ] Pre-flight request実装
- [ ] ストリーミング表示
- [ ] IME対応（日本語入力）

**コスト管理:**
- [ ] Upstash Redis レート制限
- [ ] 無料版: 10検索/日

**目標:** 英語→日本語のみ、100 DAU、平均レスポンス<500ms

---

### **Phase 2: 最適化（1ヶ月）**

**キャッシング強化:**
- [ ] プリキャッシュ5,000語生成
- [ ] クラウドキャッシュ（Supabase）統合
- [ ] キャッシュヒット率 90%達成

**UX改善:**
- [ ] プログレッシブレンダリング
- [ ] 検索クォータバッジUI
- [ ] オフライン対応（基本）

**パフォーマンス:**
- [ ] Groqプリフェッチ導入
- [ ] バンドルサイズ最適化
- [ ] TTFT 300ms達成

**目標:** 500 DAU、体感速度<300ms、月額コスト¥200以下

---

### **Phase 3: スケール（3ヶ月）**

**多言語・機能拡張:**
- [ ] 多言語対応（中国語、韓国語）
- [ ] チャット機能（Claude Sonnet）
- [ ] パーソナライズ学習履歴

**Pro版機能:**
- [ ] 無制限検索
- [ ] 高品質AI（Claude）
- [ ] オフライン完全対応
- [ ] 音声認識検索

**スケーリング:**
- [ ] エッジキャッシング
- [ ] 複数リージョン対応
- [ ] Analytics & A/Bテスト

**目標:** 5,000 DAU、収益化、Net Promoter Score 50+

---

## 📊 最適化の総合効果

### **Nani Translate からの学習を適用した結果**

| 指標 | 従来想定 | 最適化後 | 改善率 |
|------|---------|---------|--------|
| **TTFT（初回表示）** | 1500ms | **300ms** | -80% ⚡ |
| **ページ遷移速度** | 600ms | **100ms** | -83% ⚡ |
| **月額コスト (1000 DAU)** | ¥1,500 | **¥180** | -88% 💰 |
| **キャッシュヒット率** | 85% | **95%** | +12% |
| **アプリバンドルサイズ** | 8 MB | **4 MB** | -50% |
| **日本語検索の無駄なAPI** | 5-10回 | **1回** | -90% |

### **コスト内訳（最適化後）**

```
1000 DAU の月額コスト: ¥180

内訳:
- AI生成 (Gemini Flash):    ¥120 (67%)
  - キャッシュミス: 5% × 10,000検索/日 = 500生成
  - プリフェッチ (Groq):      ¥30 (17%)
  - ¥0.01/request × 1,000/日 × 30日 = ¥30

- Upstash Redis (レート制限): ¥20 (11%)
  - 無料枠内: 10,000 requests/日

- Supabase (クラウドキャッシュ): ¥10 (5%)
  - 無料枠内: 500MB + 2M reads

合計: ¥180/月（従来比 88% 削減）
```

### **速度改善の内訳**

```
従来: ユーザーが検索 → API待機(1500ms) → ページ遷移(100ms) = 1600ms

最適化後:
1. Pre-flight: ページ遷移とAPI並列化 → 100ms でページ表示
2. Streaming: 300ms で最初の定義表示
3. Progressive: 500ms で全コンテンツ表示
4. Cache hit (95%): 50ms で即座表示

体感速度: 1600ms → 100-300ms（5倍以上高速化）
```

---

## ⚠️ リスクと対策

### **リスク1: AI生成の品質**

**問題:** たまに間違った情報を生成

**対策:**
1. プロンプトエンジニアリング
2. バリデーション（スキーマ検証）
3. ユーザーフィードバック機能
4. 人間によるレビュー（人気単語のみ）

### **リスク2: コスト爆発**

**問題:** 急激なユーザー増でコスト増

**対策:**
1. レート制限（1ユーザー10検索/日）
2. アラート設定（日額¥500超えたら通知）
3. 段階的スケーリング

### **リスク3: API障害**

**問題:** Gemini APIがダウン

**対策:**
1. キャッシュ優先
2. Free Dictionary APIへフォールバック
3. エラーメッセージで説明

---

## 📈 成功指標

| 指標 | 目標 | 測定方法 |
|------|------|----------|
| **検索成功率** | 99%+ | 失敗ログを追跡 |
| **平均レスポンス時間** | <500ms | Analytics |
| **キャッシュヒット率** | 90%+ | ログ分析 |
| **ユーザー満足度** | 4.5+ / 5.0 | アプリ内評価 |
| **月額コスト** | <¥3,000 | 請求書 |

---

## 🚀 次のアクション

### **優先度順の実装タスク**

1. **Phase 1 - MVP実装（2週間）**
   - [ ] Gemini Flash API統合とモデルセレクター
   - [ ] SQLiteローカルキャッシュ
   - [ ] Pre-flight request最適化
   - [ ] Upstash Redis レート制限
   - [ ] IME対応の検索バー

2. **Phase 1 - パフォーマンステスト**
   - [ ] TTFT測定（目標: <500ms）
   - [ ] キャッシュヒット率測定（目標: 90%+）
   - [ ] バンドルサイズ確認（目標: <5MB）

3. **Phase 2 - 最適化（1ヶ月後）**
   - [ ] プリキャッシュ5,000語生成スクリプト
   - [ ] Groqプリフェッチ導入
   - [ ] Supabaseクラウドキャッシュ
   - [ ] プログレッシブレンダリング

4. **コストモニタリング**
   - [ ] 日次コストアラート設定（上限: ¥10/日）
   - [ ] API使用量ダッシュボード
   - [ ] キャッシュヒット率の可視化

---

## 📚 参考資料

### **技術ドキュメント**
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)
- [React Native Performance](https://reactnative.dev/docs/performance)

### **参考実装**
- **[Nani Translate 技術選定](https://zenn.dev/catnose99/articles/nani-translate)** ⭐
  - マルチモデル戦略
  - Pre-flight request最適化
  - レート制限実装
  - IME対応

---

## 💡 設計の要点まとめ

### **3つの核心戦略**

1. **速度最優先 (TTFT < 300ms)**
   - Pre-flight request で並列化
   - Streaming で段階的表示
   - 95%キャッシュヒット率

2. **コスト効率 (¥180/月 for 1000 DAU)**
   - マルチモデル使い分け
   - レート制限で無料版を制御
   - IME対応で無駄なAPI削減

3. **100%カバレッジ**
   - AIベース生成で全単語対応
   - フォールバックAPIで信頼性確保
   - エラーハンドリングで品質保証

### **成功の鍵**

✅ **Nani Translateからの学び** を徹底的に適用
✅ **段階的ロールアウト** で早期フィードバック
✅ **データ駆動** でコスト・速度を継続改善
