/**
 * 検索関連の型定義
 * 仕様: docs/lingooo_search_spec.md セクション2.3参照
 */

/**
 * 日本語検索結果の候補アイテム
 */
export interface SuggestionItem {
  /** 基本形（見出し語） */
  lemma: string;
  /** 品詞のリスト */
  pos: string[];
  /** 短義（日本語） */
  shortSenseJa: string;
  /** 信頼度スコア (0.0-1.0) */
  confidence: number;
}

/**
 * 日本語検索のAPIレスポンス
 */
export interface SuggestionResponse {
  /** 候補アイテムのリスト */
  items: SuggestionItem[];
}

/**
 * 単語の詳細情報
 */
export interface WordDetailResponse {
  /** 見出し情報 */
  headword: {
    /** 基本形 */
    lemma: string;
    /** 言語コード */
    lang: string;
    /** 品詞のリスト */
    pos: string[];
  };
  /** 意味のリスト */
  senses: Array<{
    /** 意味ID */
    id: string;
    /** 短義 */
    glossShort: string;
  }>;
  /** 例文のリスト */
  examples: Array<{
    /** 原文（英語など） */
    textSrc: string;
    /** 翻訳文（日本語） */
    textDst: string;
  }>;
  /** コロケーション（連語）のリスト */
  collocations: Array<{
    /** フレーズ */
    phrase: string;
  }>;
  /** ヒント・解説 */
  hint?: {
    /** ヒントテキスト */
    text: string;
  };
  /** メトリクス情報 */
  metrics?: {
    /** 使用頻度 (0-100) */
    frequency: number;
    /** 難易度 (0-100) */
    difficulty: number;
    /** ニュアンス (0=casual, 50=normal, 100=formal) */
    nuance: number;
  };
}

/**
 * 検索エラーの種類
 */
export type SearchErrorType =
  | 'network_error'
  | 'not_found'
  | 'invalid_input'
  | 'server_error'
  | 'timeout';

/**
 * 検索エラー
 */
export interface SearchError {
  /** エラーの種類 */
  type: SearchErrorType;
  /** エラーメッセージ */
  message: string;
}
