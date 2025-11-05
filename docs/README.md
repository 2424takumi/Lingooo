# Lingooo Mobile - ドキュメント

このディレクトリには、Lingooモバイルアプリの開発ドキュメントが含まれています。

## 📚 ドキュメント一覧

### 機能仕様書
- **[lingooo_search_spec.md](./lingooo_search_spec.md)** - 検索機能の要件定義と開発計画（公式仕様書）
- **[search-requirements.md](./search-requirements.md)** - 検索機能の詳細要件定義（初期版）
- **[spec-review.md](./spec-review.md)** - 公式仕様書のレビューと実装推奨事項

### 開発ガイド
- 今後追加予定

## 🎯 現在の実装状況

### Phase 1: 基盤構築 ✅ 完了
- ✅ Expo/TypeScript初期化
- ✅ 3ページ実装（HomePage, JpSearchPage, WordDetailPage）
- ✅ 15+UIコンポーネント実装
- ✅ Figmaデザイン実装

### Phase 2: 検索コア 🔄 進行中
- [ ] 言語判定関数
- [ ] 正規化関数
- [ ] モック辞書データ
- [ ] 検索フック
- [ ] ページ遷移ロジック

### Phase 3: データ連携 ⏳ 未着手
- [ ] API統合
- [ ] キャッシュ実装
- [ ] エラーハンドリング

### Phase 4: AI統合 ⏳ 未着手
- [ ] Intent API
- [ ] OpenAI統合

## 📖 参照優先順位

1. **[lingooo_search_spec.md](./lingooo_search_spec.md)** - 最優先（公式仕様）
2. **[spec-review.md](./spec-review.md)** - 実装時の注意事項
3. **[search-requirements.md](./search-requirements.md)** - 追加の詳細情報
