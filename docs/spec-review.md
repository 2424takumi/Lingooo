# 📊 Lingooo検索機能 要件定義レビュー

レビュー日: 2025年11月1日
レビュワー: Claude Code

---

## ✅ 総合評価

**評価: 優秀（5/5）**

非常に詳細で実装可能な要件定義です。以下の点が特に優れています：
- 明確な性能目標（SLO）
- 段階的な開発計画
- エッジケース対応の考慮
- AI補助機能の分離設計

---

## 🎯 現在のプロジェクト状態との照らし合わせ

### ✅ 既に完了している項目

#### 0) 基盤構築
- ✅ Expo/TypeScript 初期化完了
- ✅ 3ページ雛形完成
  - `HomePage` (`app/(tabs)/index.tsx`)
  - `JpSearchPage` (`app/(tabs)/search.tsx`)
  - `WordDetailPage` (`app/(tabs)/word-detail.tsx`)
- ✅ コンポーネント作成済み
  - HeaderBar, SearchBar, WordCard, ExampleGroup
  - WordDetailHeader, FrequencyBar, ChatSection など15+コンポーネント
- ⚠️ **未完了**: Zustand導入（現在は状態管理なし）

#### Figmaデザイン実装
- ✅ 3画面すべてのデザイン実装完了
- ✅ React Native StyleSheetで実装（Tailwind不使用）
- ✅ テーマ対応（ライト/ダークモード）

### ❌ 未実装の重要項目

#### 1) 検索コア（最優先）
- ❌ 正規化関数 `normalizeQuery`
- ❌ 言語判定 `detectLang`
- ❌ ローカルLite辞書
- ❌ タイポ補正

#### 2) データ取得・API統合
- ❌ `/api/suggest` スタブ
- ❌ `/api/entry` スタブ
- ❌ キャッシュ実装（L1/L2）

#### 3) ページ遷移ロジック
- ❌ 検索ボタン → ページ遷移の実装
- ❌ パラメータ受け渡し

---

## 💡 技術的フィードバック

### 1. 言語判定について

**仕様の提案:**
```typescript
// 現実的な実装案
function detectLang(text: string): 'ja' | 'en' | 'mixed' {
  const jaRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const enRegex = /^[a-zA-Z\s'-]+$/;

  const hasJapanese = jaRegex.test(text);
  const isEnglishOnly = enRegex.test(text);

  if (hasJapanese) return 'ja';
  if (isEnglishOnly) return 'en';
  return 'mixed'; // エッジケース
}
```

**仕様書との整合性:**
- ✅ CLD3相当は過剰。文字種ヒューリスティックで十分
- ⚠️ **追加提案**: `mixed`の場合の処理を定義すべき
  - 案: 日本語を含む場合は日本語検索として扱う

### 2. パフォーマンス要件（SLO）について

**現状分析:**
| 項目 | 目標 | 現状 | 実現可能性 |
|------|------|------|------------|
| 候補表示 | ≤300ms | 未実装 | ✅ 可能（ローカルJSON検索） |
| 詳細表示 | ≤1000ms | 未実装 | ✅ 可能 |
| AI応答 | ≤1500ms | 未実装 | ⚠️ 要検証（APIレイテンシ依存） |
| 1秒即答率 | ≥80% | - | ✅ 可能（キャッシュ活用） |

**懸念点:**
- AI応答1500msは、OpenAI APIのレスポンスタイム次第
- **推奨**: AI応答は非同期にし、先に辞書データを表示

### 3. データ構造について

**仕様書のJSON構造は良好ですが、TypeScript型定義が必要:**

```typescript
// 追加すべき型定義
interface SuggestionItem {
  lemma: string;
  pos: string[];
  shortSenseJa: string;
  confidence: number;
}

interface WordDetailResponse {
  headword: {
    lemma: string;
    lang: string;
    pos: string[];
  };
  senses: Array<{
    id: string;
    glossShort: string;
  }>;
  examples: Array<{
    textSrc: string;
    textDst: string;
  }>;
  collocations: Array<{
    phrase: string;
  }>;
  hint?: {
    text: string;
  };
}
```

### 4. キャッシュ戦略について

**仕様書の提案は良いが、実装優先度を調整すべき:**

**MVP（v1.0）で実装すべき:**
- ✅ L1メモリキャッシュ（直近10語）
- ✅ React Queryのような既存ライブラリ活用を推奨

**v1.1以降で実装:**
- ⬜ L2 AsyncStorage（LRU200語）
- ⬜ プリフェッチ

**理由**:
- MVPでは速度よりも機能実装を優先
- React QueryやSWRを使えば、キャッシュは自動で管理される

### 5. AI補助機能（Intent API）について

**素晴らしい設計！** しかし、MVP範囲を明確にすべき：

**MVP（v1.0）:**
- ✅ スタブ実装（固定レスポンス）
- ✅ UIのみ実装（ChatSection既存）

**v1.1以降:**
- ⬜ 実際のOpenAI統合
- ⬜ 5つのIntentすべて

**理由**: AI機能なしでも辞書として使えることが重要

---

## 📋 実装優先度の再編成

### Phase 1: 最小限動作（1-2日）
**目標**: 検索→遷移が動く

1. ✅ 正規化関数実装
2. ✅ 言語判定実装
3. ✅ モックデータ準備
4. ✅ 検索ボタン → ページ遷移実装
5. ✅ パラメータ受け渡し

### Phase 2: データ連携（2-3日）
**目標**: リアルなデータ表示

1. ✅ ローカルLite辞書（JSON）作成
2. ✅ 検索ロジック実装
3. ✅ データバインディング
4. ✅ ローディング状態

### Phase 3: UX向上（2-3日）
**目標**: 使いやすさ向上

1. ✅ エラーハンドリング
2. ✅ タイポ補正
3. ✅ キャッシュ（React Query）
4. ✅ デバウンス

### Phase 4: AI統合（3-4日）
**目標**: AI機能追加

1. ✅ Intent API スタブ
2. ✅ OpenAI統合
3. ✅ エラーフォールバック

---

## ⚠️ 懸念点と推奨事項

### 1. Zustand vs React Query

**仕様書**: Zustand導入
**現状**: 状態管理なし
**推奨**:

```typescript
// Zustandは検索状態管理に使用
// React Queryはデータ取得・キャッシュに使用
// 両方導入を推奨

// 例:
// zustand: 検索クエリ、フィルタ、UI状態
// react-query: API呼び出し、キャッシュ
```

### 2. NativeWindについて

**仕様書**: NativeWind記載あり
**現状**: StyleSheetで実装済み
**推奨**:

- ✅ 現状のStyleSheet実装を維持
- ❌ NativeWindへの移行は不要
- **理由**: 既に全コンポーネントが実装済み、移行コストが高い

### 3. ローカル辞書の形式

**仕様書**: SQLite or JSON
**推奨**:

**MVP → JSON**
- シンプル
- 検索対象が少ない（<1000語）場合は十分高速
- デバッグしやすい

**v1.1以降 → SQLite**
- 辞書規模が大きい（>10000語）場合
- 複雑なクエリが必要な場合

### 4. タイムライン調整

**仕様書**: 14日間
**現状**: 基盤完成済み（Day 0-1完了）

**調整後のタイムライン:**
```
✅ Day 0-1: 基盤構築（完了）
🔄 Day 2-3: 検索コア実装（次のステップ）
⬜ Day 4-5: 日本語→候補リスト
⬜ Day 6-7: 外国語→詳細
⬜ Day 8-9: キャッシュ&パフォーマンス
⬜ Day 10: AIスタブ
⬜ Day 11-12: エッジケース対応
⬜ Day 13-14: 最終調整

→ 実質12-13日で完成可能
```

---

## 🚀 次のステップ（推奨実装順序）

### 今すぐ実装すべき（最優先）

1. **言語判定ユーティリティ**
   ```bash
   services/utils/language-detect.ts
   ```

2. **検索ロジック**
   ```bash
   services/api/search.ts
   hooks/use-search.ts
   ```

3. **モックデータ**
   ```bash
   data/mock-dictionary.json
   ```

4. **ページ遷移実装**
   - SearchBarにonSubmitハンドラ追加
   - useRouter()で遷移

### 中期（1週間以内）

5. React Query導入
6. Zustand導入
7. エラーハンドリング
8. タイポ補正

### 長期（2週間以内）

9. AI統合スタブ
10. 実際のAPI接続
11. パフォーマンス最適化

---

## 📝 修正提案

### 仕様書への追加提案

**セクション2.2に追加すべき:**
```markdown
| 条件 | 遷移ページ | 内容 |
|------|-------------|------|
| 入力が日本語 | **JpSearchPage** | 日本語→外国語候補一覧 |
| 入力が外国語 | **WordDetailPage** | 単語の意味・例文・コロケ表示 |
| **入力が混在** | **JpSearchPage** | 日本語を含む場合は日本語検索 |
| **空文字** | （遷移なし） | エラーメッセージ表示 |
```

**セクション2.8に追加すべき:**
```markdown
### エラーメッセージ仕様
- 空文字: "単語を入力してください"
- 未ヒット: "該当する単語が見つかりませんでした。近い単語: ..."
- ネットワークエラー: "接続できませんでした。オフラインモードで表示しています"
- タイムアウト: "応答が遅れています。しばらくお待ちください..."
```

---

## 🎯 結論

### 優れている点
1. ✅ 詳細なパフォーマンス目標（SLO）
2. ✅ AI機能の分離設計
3. ✅ エッジケース対応の考慮
4. ✅ 段階的な開発計画
5. ✅ 将来の拡張性を考慮

### 改善すべき点
1. ⚠️ 混在入力の処理を明記
2. ⚠️ エラーメッセージ仕様を追加
3. ⚠️ MVP範囲を明確化（AI機能は後回し推奨）
4. ⚠️ NativeWindは不要（既にStyleSheet実装済み）

### 総合評価
**非常に実装可能な仕様書です。現在のプロジェクトの進捗を考えると、残り10-12日でMVP完成が現実的です。**

---

## 🔥 アクションアイテム

### 今日実装すべきこと（最優先）

1. [ ] `services/utils/language-detect.ts` 作成
2. [ ] `data/mock-dictionary.json` 作成
3. [ ] `hooks/use-search.ts` 作成
4. [ ] SearchBarに検索ロジック追加
5. [ ] ページ遷移テスト

**これらが完成すれば、検索→遷移が動作します！**

---

準備できましたか？実装を始めますか？
