/**
 * 品詞の英語表記を日本語に変換する
 */
export function translatePosToJa(pos: string): string {
  const posMap: Record<string, string> = {
    // 基本的な品詞
    'verb': '動詞',
    'noun': '名詞',
    'adjective': '形容詞',
    'adverb': '副詞',
    'pronoun': '代名詞',
    'preposition': '前置詞',
    'conjunction': '接続詞',
    'interjection': '間投詞',
    'article': '冠詞',
    'determiner': '限定詞',

    // 動詞関連
    'auxiliary': '助動詞',
    'modal': '法助動詞',
    'transitive': '他動詞',
    'intransitive': '自動詞',

    // その他の品詞
    'participle': '分詞',
    'infinitive': '不定詞',
    'gerund': '動名詞',
    'numeral': '数詞',
    'particle': '不変化詞',

    // 形容詞・副詞の詳細
    'comparative': '比較級',
    'superlative': '最上級',

    // 省略形
    'v.': '動詞',
    'n.': '名詞',
    'adj.': '形容詞',
    'adv.': '副詞',
    'prep.': '前置詞',
    'conj.': '接続詞',
    'pron.': '代名詞',
    'interj.': '間投詞',

    // 複合形
    'phrasal verb': '句動詞',
    'proper noun': '固有名詞',
    'common noun': '普通名詞',
  };

  // 小文字に変換してマッピング
  const normalized = pos.toLowerCase().trim();

  return posMap[normalized] || pos; // マッピングがない場合は元の値を返す
}
