/**
 * 1個しか候補がない単語に、複数の候補を追加するスクリプト
 *
 * Gemini APIを使用して同義語・関連語を自動生成します
 */

const fs = require('fs');
const path = require('path');

// 環境変数からGemini API Keyを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY environment variable is not set');
  console.error('Usage: GEMINI_API_KEY=your_key node scripts/expand-single-entries.js');
  process.exit(1);
}

// 辞書を読み込む
const dictionaryPath = path.join(__dirname, '../data/mock-dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const jaToEn = dictionary.ja_to_en;

// 1個しか候補がない単語を抽出
const singleEntries = Object.entries(jaToEn).filter(([_, items]) => items.length === 1);

console.log(`📊 Total entries: ${Object.keys(jaToEn).length}`);
console.log(`🎯 Single-item entries: ${singleEntries.length}`);
console.log('');

// Gemini APIを呼び出して同義語を取得
async function fetchSynonyms(japaneseWord, existingWord, pos) {
  const prompt = `Generate 2-3 English word alternatives for the Japanese word "${japaneseWord}".
The primary translation is "${existingWord}" (${pos.join(', ')}).

Return ONLY a JSON array of alternative words with their confidence scores and short Japanese meanings.
Format:
[
  {"lemma": "alternative1", "pos": ["${pos[0]}"], "shortSense": ["簡潔な日本語の意味1", "意味2", "意味3"], "confidence": 0.85},
  {"lemma": "alternative2", "pos": ["${pos[0]}"], "shortSense": ["簡潔な日本語の意味1", "意味2", "意味3"], "confidence": 0.80}
]

Requirements:
- confidence should be lower than the primary translation (< 0.95)
- shortSense should be 3 concise Japanese meanings (max 10 chars each)
- Only include common, natural alternatives
- Return empty array [] if no good alternatives exist
- Return ONLY valid JSON, no explanations`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(`  ⚠️  No response text for "${japaneseWord}"`);
      return [];
    }

    // JSONを抽出（コードブロックの場合もある）
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`  ⚠️  No JSON found in response for "${japaneseWord}"`);
      return [];
    }

    const alternatives = JSON.parse(jsonMatch[0]);
    return Array.isArray(alternatives) ? alternatives : [];
  } catch (error) {
    console.error(`  ❌ Error fetching synonyms for "${japaneseWord}":`, error.message);
    return [];
  }
}

// メイン処理
async function main() {
  console.log('🚀 Starting to expand single-entry words...\n');

  let processedCount = 0;
  let expandedCount = 0;
  const maxToProcess = parseInt(process.argv[2]) || 50; // デフォルトは50個

  for (const [japaneseWord, items] of singleEntries) {
    if (processedCount >= maxToProcess) {
      console.log(`\n⏸️  Reached limit of ${maxToProcess} words. Use argument to process more.`);
      console.log(`   Example: node scripts/expand-single-entries.js 100`);
      break;
    }

    const existingItem = items[0];
    const existingWord = existingItem.lemma;
    const pos = existingItem.pos || ['noun'];

    console.log(`[${processedCount + 1}/${Math.min(maxToProcess, singleEntries.length)}] Processing: ${japaneseWord} → ${existingWord}`);

    // 同義語を取得
    const alternatives = await fetchSynonyms(japaneseWord, existingWord, pos);

    if (alternatives.length > 0) {
      console.log(`  ✅ Added ${alternatives.length} alternatives:`, alternatives.map(a => a.lemma).join(', '));

      // 既存のアイテムに追加
      jaToEn[japaneseWord] = [existingItem, ...alternatives];
      expandedCount++;
    } else {
      console.log(`  ⏭️  No alternatives found`);
    }

    processedCount++;

    // Rate limiting: 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 更新された辞書を保存
  dictionary.ja_to_en = jaToEn;

  // バックアップを作成
  const backupPath = dictionaryPath.replace('.json', `.backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(dictionary, null, 2), 'utf8');
  console.log(`\n💾 Backup saved: ${backupPath}`);

  // 元のファイルを更新
  fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), 'utf8');
  console.log(`✅ Dictionary updated: ${dictionaryPath}`);

  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processedCount} words`);
  console.log(`   Expanded: ${expandedCount} words`);
  console.log(`   Remaining single-entry words: ${singleEntries.length - processedCount}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
