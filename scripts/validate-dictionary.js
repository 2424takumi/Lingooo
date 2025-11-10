const fs = require('fs');
const path = require('path');

// 辞書を読み込む
const dictionaryPath = path.join(__dirname, '../data/mock-dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

console.log('=== Dictionary Validation Report ===\n');

// 1. 基本統計
console.log('📊 Basic Statistics:');
console.log(`  Japanese entries (ja_to_en): ${Object.keys(dictionary.ja_to_en).length}`);
console.log(`  English details (en_details): ${Object.keys(dictionary.en_details).length}`);
console.log();

// 2. ja_to_en の検証
console.log('🔍 Validating ja_to_en entries...');
let jaErrors = 0;
let totalSuggestions = 0;

for (const [japWord, suggestions] of Object.entries(dictionary.ja_to_en)) {
  if (!Array.isArray(suggestions)) {
    console.log(`  ❌ ERROR: "${japWord}" - not an array`);
    jaErrors++;
    continue;
  }

  totalSuggestions += suggestions.length;

  for (let i = 0; i < suggestions.length; i++) {
    const item = suggestions[i];

    // 必須フィールドチェック
    if (!item.lemma) {
      console.log(`  ❌ ERROR: "${japWord}[${i}]" - missing lemma`);
      jaErrors++;
    }
    if (!Array.isArray(item.pos)) {
      console.log(`  ❌ ERROR: "${japWord}[${i}]" - pos is not array`);
      jaErrors++;
    }
    if (!item.shortSenseJa) {
      console.log(`  ❌ ERROR: "${japWord}[${i}]" - missing shortSenseJa`);
      jaErrors++;
    }
    if (typeof item.confidence !== 'number') {
      console.log(`  ❌ ERROR: "${japWord}[${i}]" - confidence is not number`);
      jaErrors++;
    }
  }
}

if (jaErrors === 0) {
  console.log(`  ✅ All ${Object.keys(dictionary.ja_to_en).length} entries are valid!`);
  console.log(`  Total suggestions: ${totalSuggestions}`);
  console.log(`  Average suggestions per entry: ${(totalSuggestions / Object.keys(dictionary.ja_to_en).length).toFixed(2)}`);
} else {
  console.log(`  ⚠️  Found ${jaErrors} errors in ja_to_en`);
}
console.log();

// 3. en_details の検証
console.log('🔍 Validating en_details entries...');
let enErrors = 0;

for (const [word, details] of Object.entries(dictionary.en_details)) {
  // headword チェック
  if (!details.headword) {
    console.log(`  ❌ ERROR: "${word}" - missing headword`);
    enErrors++;
  } else {
    if (!details.headword.lemma) {
      console.log(`  ❌ ERROR: "${word}" - missing headword.lemma`);
      enErrors++;
    }
    if (!details.headword.lang) {
      console.log(`  ❌ ERROR: "${word}" - missing headword.lang`);
      enErrors++;
    }
    if (!Array.isArray(details.headword.pos)) {
      console.log(`  ❌ ERROR: "${word}" - headword.pos is not array`);
      enErrors++;
    }
  }

  // senses チェック
  if (!Array.isArray(details.senses)) {
    console.log(`  ❌ ERROR: "${word}" - senses is not array`);
    enErrors++;
  } else if (details.senses.length === 0) {
    console.log(`  ⚠️  WARNING: "${word}" - senses is empty`);
  }

  // examples チェック
  if (!Array.isArray(details.examples)) {
    console.log(`  ❌ ERROR: "${word}" - examples is not array`);
    enErrors++;
  } else if (details.examples.length === 0) {
    console.log(`  ⚠️  WARNING: "${word}" - examples is empty`);
  }

  // collocations チェック (optional)
  if (details.collocations && !Array.isArray(details.collocations)) {
    console.log(`  ❌ ERROR: "${word}" - collocations is not array`);
    enErrors++;
  }
}

if (enErrors === 0) {
  console.log(`  ✅ All ${Object.keys(dictionary.en_details).length} entries are valid!`);
} else {
  console.log(`  ⚠️  Found ${enErrors} errors in en_details`);
}
console.log();

// 4. カバレッジチェック
console.log('📈 Coverage Analysis:');
const jaWords = Object.keys(dictionary.ja_to_en);
const enWords = Object.keys(dictionary.en_details);

// ja_to_enに出てくる英単語を収集
const suggestedWords = new Set();
for (const suggestions of Object.values(dictionary.ja_to_en)) {
  for (const item of suggestions) {
    suggestedWords.add(item.lemma.toLowerCase());
  }
}

// en_detailsでカバーされている単語数
let covered = 0;
for (const word of suggestedWords) {
  if (enWords.includes(word)) {
    covered++;
  }
}

console.log(`  Total unique English words suggested: ${suggestedWords.size}`);
console.log(`  English words with details: ${enWords.length}`);
console.log(`  Coverage: ${covered}/${suggestedWords.size} (${(covered/suggestedWords.size*100).toFixed(1)}%)`);
console.log();

// 5. サンプルチェック
console.log('📝 Sample Entries:');
const sampleJa = Object.keys(dictionary.ja_to_en).slice(0, 3);
console.log('  Japanese entries:');
for (const word of sampleJa) {
  const suggestions = dictionary.ja_to_en[word];
  console.log(`    "${word}" → ${suggestions.map(s => s.lemma).join(', ')}`);
}
console.log();

const sampleEn = Object.keys(dictionary.en_details).slice(0, 3);
console.log('  English details:');
for (const word of sampleEn) {
  const details = dictionary.en_details[word];
  console.log(`    "${word}" - ${details.senses.length} senses, ${details.examples.length} examples`);
}
console.log();

// 最終サマリー
console.log('=== Summary ===');
const totalErrors = jaErrors + enErrors;
if (totalErrors === 0) {
  console.log('✅ Dictionary validation PASSED!');
  console.log(`   - ${Object.keys(dictionary.ja_to_en).length} Japanese entries`);
  console.log(`   - ${Object.keys(dictionary.en_details).length} English detail entries`);
  console.log(`   - ${totalSuggestions} total suggestions`);
  console.log(`   - ${(covered/suggestedWords.size*100).toFixed(1)}% coverage`);
} else {
  console.log(`⚠️  Dictionary validation FAILED with ${totalErrors} errors`);
}

process.exit(totalErrors === 0 ? 0 : 1);
