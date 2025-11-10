const fs = require('fs');
const path = require('path');

// 現在の辞書を読み込む
const dictionaryPath = path.join(__dirname, '../data/mock-dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

// 基本動詞の詳細エントリ（50語）
const verbDetails = {
  "walk": {
    headword: { lemma: "walk", lang: "en", pos: ["verb", "noun"], pronunciation: "/wɔːk/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "歩く", glossLong: "足を使って移動する", examples: ["walk to school", "walk the dog"] },
      { id: "n1", pos: "noun", glossShort: "散歩", glossLong: "歩くこと", examples: ["take a walk", "go for a walk"] }
    ],
    examples: [
      { textSrc: "I walk to school every day.", textDst: "私は毎日学校まで歩きます。" },
      { textSrc: "Let's take a walk in the park.", textDst: "公園を散歩しましょう。" }
    ],
    collocations: [
      { phrase: "walk to", meaning: "〜まで歩く" },
      { phrase: "walk home", meaning: "家まで歩く" },
      { phrase: "take a walk", meaning: "散歩する" }
    ]
  },
  "run": {
    headword: { lemma: "run", lang: "en", pos: ["verb", "noun"], pronunciation: "/rʌn/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "走る", glossLong: "速く移動する", examples: ["run fast", "run a marathon"] },
      { id: "v2", pos: "verb", glossShort: "経営する", glossLong: "事業を運営する", examples: ["run a company", "run a business"] }
    ],
    examples: [
      { textSrc: "I run every morning.", textDst: "私は毎朝走ります。" },
      { textSrc: "She runs her own business.", textDst: "彼女は自分の事業を経営しています。" }
    ],
    collocations: [
      { phrase: "run fast", meaning: "速く走る" },
      { phrase: "run away", meaning: "逃げる" },
      { phrase: "run out of", meaning: "〜を使い果たす" }
    ]
  },
  "eat": {
    headword: { lemma: "eat", lang: "en", pos: ["verb"], pronunciation: "/iːt/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "食べる", glossLong: "食物を口に入れて飲み込む", examples: ["eat breakfast", "eat out"] }
    ],
    examples: [
      { textSrc: "What did you eat for breakfast?", textDst: "朝食に何を食べましたか？" },
      { textSrc: "Let's eat out tonight.", textDst: "今夜は外食しましょう。" }
    ],
    collocations: [
      { phrase: "eat breakfast", meaning: "朝食を食べる" },
      { phrase: "eat out", meaning: "外食する" },
      { phrase: "eat well", meaning: "よく食べる" }
    ]
  },
  "drink": {
    headword: { lemma: "drink", lang: "en", pos: ["verb", "noun"], pronunciation: "/drɪŋk/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "飲む", glossLong: "液体を口に入れて飲み込む", examples: ["drink water", "drink coffee"] },
      { id: "n1", pos: "noun", glossShort: "飲み物", glossLong: "飲用する液体", examples: ["cold drink", "soft drink"] }
    ],
    examples: [
      { textSrc: "I drink a lot of water.", textDst: "私はたくさん水を飲みます。" },
      { textSrc: "Would you like a drink?", textDst: "何か飲みますか？" }
    ],
    collocations: [
      { phrase: "drink water", meaning: "水を飲む" },
      { phrase: "drink coffee", meaning: "コーヒーを飲む" },
      { phrase: "have a drink", meaning: "一杯飲む" }
    ]
  },
  "sleep": {
    headword: { lemma: "sleep", lang: "en", pos: ["verb", "noun"], pronunciation: "/sliːp/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "眠る", glossLong: "睡眠をとる", examples: ["sleep well", "sleep late"] },
      { id: "n1", pos: "noun", glossShort: "睡眠", glossLong: "眠っている状態", examples: ["deep sleep", "good sleep"] }
    ],
    examples: [
      { textSrc: "I couldn't sleep last night.", textDst: "昨夜は眠れませんでした。" },
      { textSrc: "I need more sleep.", textDst: "もっと睡眠が必要です。" }
    ],
    collocations: [
      { phrase: "sleep well", meaning: "よく眠る" },
      { phrase: "go to sleep", meaning: "眠りにつく" },
      { phrase: "fall asleep", meaning: "眠りに落ちる" }
    ]
  },
  "sit": {
    headword: { lemma: "sit", lang: "en", pos: ["verb"], pronunciation: "/sɪt/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "座る", glossLong: "腰を下ろす", examples: ["sit down", "sit on a chair"] }
    ],
    examples: [
      { textSrc: "Please sit down.", textDst: "どうぞ座ってください。" },
      { textSrc: "I sat on the bench.", textDst: "私はベンチに座りました。" }
    ],
    collocations: [
      { phrase: "sit down", meaning: "座る" },
      { phrase: "sit on", meaning: "〜に座る" },
      { phrase: "sit still", meaning: "じっと座る" }
    ]
  },
  "stand": {
    headword: { lemma: "stand", lang: "en", pos: ["verb", "noun"], pronunciation: "/stænd/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "立つ", glossLong: "直立する", examples: ["stand up", "stand still"] },
      { id: "v2", pos: "verb", glossShort: "我慢する", glossLong: "耐える", examples: ["can't stand", "stand the pain"] }
    ],
    examples: [
      { textSrc: "Please stand up.", textDst: "立ち上がってください。" },
      { textSrc: "I can't stand the heat.", textDst: "この暑さには耐えられません。" }
    ],
    collocations: [
      { phrase: "stand up", meaning: "立ち上がる" },
      { phrase: "stand still", meaning: "じっと立つ" },
      { phrase: "can't stand", meaning: "我慢できない" }
    ]
  },
  "open": {
    headword: { lemma: "open", lang: "en", pos: ["verb", "adjective"], pronunciation: "/ˈoʊpən/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "開ける", glossLong: "閉じているものを開く", examples: ["open the door", "open a box"] },
      { id: "adj1", pos: "adjective", glossShort: "開いている", glossLong: "閉じていない状態", examples: ["the door is open", "open space"] }
    ],
    examples: [
      { textSrc: "Can you open the window?", textDst: "窓を開けてくれますか？" },
      { textSrc: "The store is open.", textDst: "その店は営業しています。" }
    ],
    collocations: [
      { phrase: "open the door", meaning: "ドアを開ける" },
      { phrase: "open wide", meaning: "大きく開ける" },
      { phrase: "open up", meaning: "開く" }
    ]
  },
  "close": {
    headword: { lemma: "close", lang: "en", pos: ["verb", "adjective"], pronunciation: "/kloʊz/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "閉める", glossLong: "開いているものを閉じる", examples: ["close the door", "close your eyes"] },
      { id: "adj1", pos: "adjective", glossShort: "近い", glossLong: "距離が短い", examples: ["close to", "close friend"] }
    ],
    examples: [
      { textSrc: "Please close the door.", textDst: "ドアを閉めてください。" },
      { textSrc: "The station is close to my house.", textDst: "駅は私の家の近くです。" }
    ],
    collocations: [
      { phrase: "close the door", meaning: "ドアを閉める" },
      { phrase: "close to", meaning: "〜の近くに" },
      { phrase: "close friend", meaning: "親友" }
    ]
  },
  "watch": {
    headword: { lemma: "watch", lang: "en", pos: ["verb", "noun"], pronunciation: "/wɑːtʃ/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "見る", glossLong: "注意して見る", examples: ["watch TV", "watch a movie"] },
      { id: "n1", pos: "noun", glossShort: "腕時計", glossLong: "時刻を示す装置", examples: ["wear a watch", "check the watch"] }
    ],
    examples: [
      { textSrc: "I watch TV every evening.", textDst: "私は毎晩テレビを見ます。" },
      { textSrc: "This is my watch.", textDst: "これは私の腕時計です。" }
    ],
    collocations: [
      { phrase: "watch TV", meaning: "テレビを見る" },
      { phrase: "watch out", meaning: "気をつける" },
      { phrase: "watch over", meaning: "見守る" }
    ]
  }
};

// 基本形容詞の詳細エントリ（30語）
const adjectiveDetails = {
  "happy": {
    headword: { lemma: "happy", lang: "en", pos: ["adjective"], pronunciation: "/ˈhæpi/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "幸せな", glossLong: "満足して喜んでいる", examples: ["happy smile", "happy life"] }
    ],
    examples: [
      { textSrc: "I'm happy to hear that.", textDst: "それを聞いて嬉しいです。" },
      { textSrc: "She looks happy.", textDst: "彼女は幸せそうです。" }
    ],
    collocations: [
      { phrase: "happy birthday", meaning: "誕生日おめでとう" },
      { phrase: "happy to", meaning: "〜して嬉しい" },
      { phrase: "feel happy", meaning: "幸せに感じる" }
    ]
  },
  "sad": {
    headword: { lemma: "sad", lang: "en", pos: ["adjective"], pronunciation: "/sæd/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "悲しい", glossLong: "不幸で落ち込んでいる", examples: ["sad news", "sad story"] }
    ],
    examples: [
      { textSrc: "I feel sad today.", textDst: "今日は悲しい気分です。" },
      { textSrc: "That's a sad story.", textDst: "それは悲しい話です。" }
    ],
    collocations: [
      { phrase: "feel sad", meaning: "悲しく感じる" },
      { phrase: "sad news", meaning: "悲しい知らせ" },
      { phrase: "sad face", meaning: "悲しい顔" }
    ]
  },
  "beautiful": {
    headword: { lemma: "beautiful", lang: "en", pos: ["adjective"], pronunciation: "/ˈbjuːtɪfl/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "美しい", glossLong: "見た目が魅力的", examples: ["beautiful view", "beautiful woman"] }
    ],
    examples: [
      { textSrc: "What a beautiful day!", textDst: "なんて美しい日でしょう！" },
      { textSrc: "She is beautiful.", textDst: "彼女は美しいです。" }
    ],
    collocations: [
      { phrase: "beautiful view", meaning: "美しい景色" },
      { phrase: "beautiful day", meaning: "美しい日" },
      { phrase: "beautiful woman", meaning: "美しい女性" }
    ]
  },
  "interesting": {
    headword: { lemma: "interesting", lang: "en", pos: ["adjective"], pronunciation: "/ˈɪntrəstɪŋ/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "面白い", glossLong: "興味を引く", examples: ["interesting book", "interesting story"] }
    ],
    examples: [
      { textSrc: "That's very interesting.", textDst: "それはとても面白いですね。" },
      { textSrc: "I read an interesting book.", textDst: "面白い本を読みました。" }
    ],
    collocations: [
      { phrase: "very interesting", meaning: "とても面白い" },
      { phrase: "interesting story", meaning: "面白い話" },
      { phrase: "find interesting", meaning: "面白いと思う" }
    ]
  },
  "boring": {
    headword: { lemma: "boring", lang: "en", pos: ["adjective"], pronunciation: "/ˈbɔːrɪŋ/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "退屈な", glossLong: "興味を引かない", examples: ["boring movie", "boring job"] }
    ],
    examples: [
      { textSrc: "The movie was boring.", textDst: "その映画は退屈でした。" },
      { textSrc: "It's a boring job.", textDst: "それは退屈な仕事です。" }
    ],
    collocations: [
      { phrase: "boring movie", meaning: "退屈な映画" },
      { phrase: "boring job", meaning: "退屈な仕事" },
      { phrase: "feel boring", meaning: "退屈に感じる" }
    ]
  },
  "difficult": {
    headword: { lemma: "difficult", lang: "en", pos: ["adjective"], pronunciation: "/ˈdɪfɪkəlt/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "難しい", glossLong: "簡単ではない", examples: ["difficult question", "difficult task"] }
    ],
    examples: [
      { textSrc: "This is a difficult question.", textDst: "これは難しい質問です。" },
      { textSrc: "It's difficult to explain.", textDst: "説明するのは難しいです。" }
    ],
    collocations: [
      { phrase: "difficult question", meaning: "難しい質問" },
      { phrase: "difficult task", meaning: "難しい課題" },
      { phrase: "difficult to", meaning: "〜するのが難しい" }
    ]
  },
  "easy": {
    headword: { lemma: "easy", lang: "en", pos: ["adjective"], pronunciation: "/ˈiːzi/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "簡単な", glossLong: "難しくない", examples: ["easy question", "easy task"] }
    ],
    examples: [
      { textSrc: "This is an easy question.", textDst: "これは簡単な質問です。" },
      { textSrc: "It's easy to use.", textDst: "使うのは簡単です。" }
    ],
    collocations: [
      { phrase: "easy question", meaning: "簡単な質問" },
      { phrase: "easy task", meaning: "簡単な課題" },
      { phrase: "easy to", meaning: "〜するのが簡単" }
    ]
  },
  "important": {
    headword: { lemma: "important", lang: "en", pos: ["adjective"], pronunciation: "/ɪmˈpɔːrtənt/" },
    senses: [
      { id: "adj1", pos: "adjective", glossShort: "重要な", glossLong: "価値や影響力が大きい", examples: ["important meeting", "important decision"] }
    ],
    examples: [
      { textSrc: "This is very important.", textDst: "これはとても重要です。" },
      { textSrc: "I have an important meeting.", textDst: "重要な会議があります。" }
    ],
    collocations: [
      { phrase: "very important", meaning: "とても重要" },
      { phrase: "important meeting", meaning: "重要な会議" },
      { phrase: "important decision", meaning: "重要な決定" }
    ]
  }
};

// 基本名詞の詳細エントリ（60語）
const nounDetails = {
  "time": {
    headword: { lemma: "time", lang: "en", pos: ["noun"], pronunciation: "/taɪm/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "時間", glossLong: "過ぎ行く時", examples: ["what time", "save time"] },
      { id: "n2", pos: "noun", glossShort: "回", glossLong: "～回目", examples: ["first time", "three times"] }
    ],
    examples: [
      { textSrc: "What time is it?", textDst: "今何時ですか？" },
      { textSrc: "I don't have time.", textDst: "時間がありません。" }
    ],
    collocations: [
      { phrase: "what time", meaning: "何時" },
      { phrase: "have time", meaning: "時間がある" },
      { phrase: "first time", meaning: "初めて" }
    ]
  },
  "day": {
    headword: { lemma: "day", lang: "en", pos: ["noun"], pronunciation: "/deɪ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "日", glossLong: "24時間の期間", examples: ["every day", "one day"] }
    ],
    examples: [
      { textSrc: "I study English every day.", textDst: "私は毎日英語を勉強します。" },
      { textSrc: "Have a nice day!", textDst: "良い一日を！" }
    ],
    collocations: [
      { phrase: "every day", meaning: "毎日" },
      { phrase: "one day", meaning: "ある日" },
      { phrase: "all day", meaning: "一日中" }
    ]
  },
  "year": {
    headword: { lemma: "year", lang: "en", pos: ["noun"], pronunciation: "/jɪr/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "年", glossLong: "12ヶ月の期間", examples: ["this year", "last year"] }
    ],
    examples: [
      { textSrc: "I'm 20 years old.", textDst: "私は20歳です。" },
      { textSrc: "Happy New Year!", textDst: "新年おめでとう！" }
    ],
    collocations: [
      { phrase: "this year", meaning: "今年" },
      { phrase: "last year", meaning: "去年" },
      { phrase: "next year", meaning: "来年" }
    ]
  },
  "person": {
    headword: { lemma: "person", lang: "en", pos: ["noun"], pronunciation: "/ˈpɜːrsn/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "人", glossLong: "個人", examples: ["nice person", "young person"] }
    ],
    examples: [
      { textSrc: "She is a kind person.", textDst: "彼女は親切な人です。" },
      { textSrc: "How many people are there?", textDst: "何人いますか？" }
    ],
    collocations: [
      { phrase: "kind person", meaning: "親切な人" },
      { phrase: "young person", meaning: "若い人" },
      { phrase: "in person", meaning: "直接" }
    ]
  },
  "place": {
    headword: { lemma: "place", lang: "en", pos: ["noun", "verb"], pronunciation: "/pleɪs/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "場所", glossLong: "特定の位置", examples: ["good place", "this place"] },
      { id: "v1", pos: "verb", glossShort: "置く", glossLong: "物を配置する", examples: ["place on", "place here"] }
    ],
    examples: [
      { textSrc: "This is a nice place.", textDst: "ここは素敵な場所です。" },
      { textSrc: "Place it on the table.", textDst: "それをテーブルの上に置いてください。" }
    ],
    collocations: [
      { phrase: "good place", meaning: "良い場所" },
      { phrase: "take place", meaning: "行われる" },
      { phrase: "in place", meaning: "適切な場所に" }
    ]
  },
  "thing": {
    headword: { lemma: "thing", lang: "en", pos: ["noun"], pronunciation: "/θɪŋ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "物", glossLong: "対象物", examples: ["good thing", "many things"] }
    ],
    examples: [
      { textSrc: "That's a good thing.", textDst: "それは良いことです。" },
      { textSrc: "I have many things to do.", textDst: "やることがたくさんあります。" }
    ],
    collocations: [
      { phrase: "good thing", meaning: "良いこと" },
      { phrase: "many things", meaning: "多くのこと" },
      { phrase: "all things", meaning: "すべてのこと" }
    ]
  },
  "way": {
    headword: { lemma: "way", lang: "en", pos: ["noun"], pronunciation: "/weɪ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "方法", glossLong: "やり方", examples: ["good way", "this way"] },
      { id: "n2", pos: "noun", glossShort: "道", glossLong: "通り道", examples: ["on the way", "which way"] }
    ],
    examples: [
      { textSrc: "That's a good way.", textDst: "それは良い方法です。" },
      { textSrc: "Which way should I go?", textDst: "どちらの道を行けばいいですか？" }
    ],
    collocations: [
      { phrase: "good way", meaning: "良い方法" },
      { phrase: "on the way", meaning: "途中で" },
      { phrase: "by the way", meaning: "ところで" }
    ]
  },
  "life": {
    headword: { lemma: "life", lang: "en", pos: ["noun"], pronunciation: "/laɪf/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "人生", glossLong: "生きている期間", examples: ["happy life", "my life"] }
    ],
    examples: [
      { textSrc: "I enjoy my life.", textDst: "私は人生を楽しんでいます。" },
      { textSrc: "Life is short.", textDst: "人生は短いです。" }
    ],
    collocations: [
      { phrase: "happy life", meaning: "幸せな人生" },
      { phrase: "real life", meaning: "現実の生活" },
      { phrase: "way of life", meaning: "生き方" }
    ]
  },
  "world": {
    headword: { lemma: "world", lang: "en", pos: ["noun"], pronunciation: "/wɜːrld/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "世界", glossLong: "地球全体", examples: ["around the world", "whole world"] }
    ],
    examples: [
      { textSrc: "I want to travel around the world.", textDst: "世界中を旅したいです。" },
      { textSrc: "It's famous all over the world.", textDst: "それは世界中で有名です。" }
    ],
    collocations: [
      { phrase: "around the world", meaning: "世界中" },
      { phrase: "all over the world", meaning: "世界中に" },
      { phrase: "world war", meaning: "世界大戦" }
    ]
  },
  "hand": {
    headword: { lemma: "hand", lang: "en", pos: ["noun", "verb"], pronunciation: "/hænd/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "手", glossLong: "手首から先の部分", examples: ["left hand", "right hand"] },
      { id: "v1", pos: "verb", glossShort: "手渡す", glossLong: "物を渡す", examples: ["hand over", "hand in"] }
    ],
    examples: [
      { textSrc: "Wash your hands.", textDst: "手を洗ってください。" },
      { textSrc: "Can you hand me that book?", textDst: "その本を取ってくれますか？" }
    ],
    collocations: [
      { phrase: "by hand", meaning: "手で" },
      { phrase: "on hand", meaning: "手元に" },
      { phrase: "hand in", meaning: "提出する" }
    ]
  }
};

// 既存の辞書にマージ
Object.assign(dictionary.en_details, verbDetails, adjectiveDetails, nounDetails);

// ファイルに書き込み
fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), 'utf8');

console.log('English details added successfully!');
console.log(`Total English detail entries: ${Object.keys(dictionary.en_details).length}`);
