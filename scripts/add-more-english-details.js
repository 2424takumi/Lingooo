const fs = require('fs');
const path = require('path');

// 現在の辞書を読み込む
const dictionaryPath = path.join(__dirname, '../data/mock-dictionary.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

// さらに追加の英語詳細エントリ（50語以上）
const moreDetails = {
  "work": {
    headword: { lemma: "work", lang: "en", pos: ["verb", "noun"], pronunciation: "/wɜːrk/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "働く", glossLong: "仕事をする", examples: ["work hard", "work at"] },
      { id: "n1", pos: "noun", glossShort: "仕事", glossLong: "労働・職", examples: ["go to work", "at work"] }
    ],
    examples: [
      { textSrc: "I work at a hospital.", textDst: "私は病院で働いています。" },
      { textSrc: "I go to work by train.", textDst: "私は電車で通勤します。" }
    ],
    collocations: [
      { phrase: "work hard", meaning: "一生懸命働く" },
      { phrase: "go to work", meaning: "仕事に行く" },
      { phrase: "at work", meaning: "職場で" }
    ]
  },
  "school": {
    headword: { lemma: "school", lang: "en", pos: ["noun"], pronunciation: "/skuːl/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "学校", glossLong: "教育機関", examples: ["go to school", "at school"] }
    ],
    examples: [
      { textSrc: "I go to school every day.", textDst: "私は毎日学校に行きます。" },
      { textSrc: "My school is near here.", textDst: "私の学校はここの近くです。" }
    ],
    collocations: [
      { phrase: "go to school", meaning: "学校に行く" },
      { phrase: "at school", meaning: "学校で" },
      { phrase: "high school", meaning: "高校" }
    ]
  },
  "house": {
    headword: { lemma: "house", lang: "en", pos: ["noun"], pronunciation: "/haʊs/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "家", glossLong: "住居", examples: ["my house", "old house"] }
    ],
    examples: [
      { textSrc: "This is my house.", textDst: "これは私の家です。" },
      { textSrc: "I want to buy a house.", textDst: "家を買いたいです。" }
    ],
    collocations: [
      { phrase: "my house", meaning: "私の家" },
      { phrase: "go home", meaning: "家に帰る" },
      { phrase: "at home", meaning: "家で" }
    ]
  },
  "family": {
    headword: { lemma: "family", lang: "en", pos: ["noun"], pronunciation: "/ˈfæməli/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "家族", glossLong: "親族", examples: ["my family", "big family"] }
    ],
    examples: [
      { textSrc: "I love my family.", textDst: "私は家族を愛しています。" },
      { textSrc: "How many people are in your family?", textDst: "あなたの家族は何人ですか？" }
    ],
    collocations: [
      { phrase: "my family", meaning: "私の家族" },
      { phrase: "family member", meaning: "家族の一員" },
      { phrase: "big family", meaning: "大家族" }
    ]
  },
  "friend": {
    headword: { lemma: "friend", lang: "en", pos: ["noun"], pronunciation: "/frend/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "友達", glossLong: "友人", examples: ["good friend", "best friend"] }
    ],
    examples: [
      { textSrc: "She is my best friend.", textDst: "彼女は私の親友です。" },
      { textSrc: "I want to make friends.", textDst: "友達を作りたいです。" }
    ],
    collocations: [
      { phrase: "best friend", meaning: "親友" },
      { phrase: "make friends", meaning: "友達を作る" },
      { phrase: "close friend", meaning: "親しい友人" }
    ]
  },
  "teacher": {
    headword: { lemma: "teacher", lang: "en", pos: ["noun"], pronunciation: "/ˈtiːtʃər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "教師", glossLong: "先生", examples: ["English teacher", "my teacher"] }
    ],
    examples: [
      { textSrc: "My teacher is very kind.", textDst: "私の先生はとても親切です。" },
      { textSrc: "I want to be a teacher.", textDst: "教師になりたいです。" }
    ],
    collocations: [
      { phrase: "English teacher", meaning: "英語教師" },
      { phrase: "my teacher", meaning: "私の先生" },
      { phrase: "good teacher", meaning: "良い先生" }
    ]
  },
  "student": {
    headword: { lemma: "student", lang: "en", pos: ["noun"], pronunciation: "/ˈstuːdnt/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "学生", glossLong: "生徒", examples: ["college student", "high school student"] }
    ],
    examples: [
      { textSrc: "I'm a college student.", textDst: "私は大学生です。" },
      { textSrc: "There are many students here.", textDst: "ここにはたくさんの学生がいます。" }
    ],
    collocations: [
      { phrase: "college student", meaning: "大学生" },
      { phrase: "high school student", meaning: "高校生" },
      { phrase: "good student", meaning: "優秀な学生" }
    ]
  },
  "mother": {
    headword: { lemma: "mother", lang: "en", pos: ["noun"], pronunciation: "/ˈmʌðər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "母", glossLong: "母親", examples: ["my mother", "young mother"] }
    ],
    examples: [
      { textSrc: "My mother is a doctor.", textDst: "私の母は医者です。" },
      { textSrc: "I love my mother.", textDst: "私は母を愛しています。" }
    ],
    collocations: [
      { phrase: "my mother", meaning: "私の母" },
      { phrase: "young mother", meaning: "若い母親" },
      { phrase: "mother tongue", meaning: "母語" }
    ]
  },
  "father": {
    headword: { lemma: "father", lang: "en", pos: ["noun"], pronunciation: "/ˈfɑːðər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "父", glossLong: "父親", examples: ["my father", "young father"] }
    ],
    examples: [
      { textSrc: "My father is a teacher.", textDst: "私の父は教師です。" },
      { textSrc: "I love my father.", textDst: "私は父を愛しています。" }
    ],
    collocations: [
      { phrase: "my father", meaning: "私の父" },
      { phrase: "young father", meaning: "若い父親" },
      { phrase: "like father", meaning: "父のように" }
    ]
  },
  "child": {
    headword: { lemma: "child", lang: "en", pos: ["noun"], pronunciation: "/tʃaɪld/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "子供", glossLong: "幼い人", examples: ["young child", "my child"] }
    ],
    examples: [
      { textSrc: "I have two children.", textDst: "私には2人の子供がいます。" },
      { textSrc: "Children are playing.", textDst: "子供たちが遊んでいます。" }
    ],
    collocations: [
      { phrase: "young child", meaning: "幼い子供" },
      { phrase: "my child", meaning: "私の子供" },
      { phrase: "only child", meaning: "一人っ子" }
    ]
  },
  "city": {
    headword: { lemma: "city", lang: "en", pos: ["noun"], pronunciation: "/ˈsɪti/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "都市", glossLong: "大きな町", examples: ["big city", "beautiful city"] }
    ],
    examples: [
      { textSrc: "Tokyo is a big city.", textDst: "東京は大都市です。" },
      { textSrc: "I live in the city.", textDst: "私は都会に住んでいます。" }
    ],
    collocations: [
      { phrase: "big city", meaning: "大都市" },
      { phrase: "in the city", meaning: "都会で" },
      { phrase: "city life", meaning: "都会の生活" }
    ]
  },
  "country": {
    headword: { lemma: "country", lang: "en", pos: ["noun"], pronunciation: "/ˈkʌntri/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "国", glossLong: "国家", examples: ["my country", "foreign country"] },
      { id: "n2", pos: "noun", glossShort: "田舎", glossLong: "rural area", examples: ["in the country", "country life"] }
    ],
    examples: [
      { textSrc: "Japan is my country.", textDst: "日本は私の国です。" },
      { textSrc: "I live in the country.", textDst: "私は田舎に住んでいます。" }
    ],
    collocations: [
      { phrase: "my country", meaning: "私の国" },
      { phrase: "foreign country", meaning: "外国" },
      { phrase: "country life", meaning: "田舎生活" }
    ]
  },
  "weather": {
    headword: { lemma: "weather", lang: "en", pos: ["noun"], pronunciation: "/ˈweðər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "天気", glossLong: "気象", examples: ["good weather", "bad weather"] }
    ],
    examples: [
      { textSrc: "The weather is nice today.", textDst: "今日は天気が良いです。" },
      { textSrc: "How's the weather?", textDst: "天気はどうですか？" }
    ],
    collocations: [
      { phrase: "good weather", meaning: "良い天気" },
      { phrase: "bad weather", meaning: "悪い天気" },
      { phrase: "weather forecast", meaning: "天気予報" }
    ]
  },
  "season": {
    headword: { lemma: "season", lang: "en", pos: ["noun"], pronunciation: "/ˈsiːzn/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "季節", glossLong: "春夏秋冬", examples: ["favorite season", "rainy season"] }
    ],
    examples: [
      { textSrc: "What's your favorite season?", textDst: "好きな季節は何ですか？" },
      { textSrc: "Spring is a beautiful season.", textDst: "春は美しい季節です。" }
    ],
    collocations: [
      { phrase: "favorite season", meaning: "好きな季節" },
      { phrase: "rainy season", meaning: "雨季" },
      { phrase: "four seasons", meaning: "四季" }
    ]
  },
  "morning": {
    headword: { lemma: "morning", lang: "en", pos: ["noun"], pronunciation: "/ˈmɔːrnɪŋ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "朝", glossLong: "午前中", examples: ["this morning", "every morning"] }
    ],
    examples: [
      { textSrc: "Good morning!", textDst: "おはようございます！" },
      { textSrc: "I run every morning.", textDst: "私は毎朝走ります。" }
    ],
    collocations: [
      { phrase: "good morning", meaning: "おはよう" },
      { phrase: "this morning", meaning: "今朝" },
      { phrase: "every morning", meaning: "毎朝" }
    ]
  },
  "evening": {
    headword: { lemma: "evening", lang: "en", pos: ["noun"], pronunciation: "/ˈiːvnɪŋ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "夕方", glossLong: "evening", examples: ["this evening", "every evening"] }
    ],
    examples: [
      { textSrc: "Good evening!", textDst: "こんばんは！" },
      { textSrc: "I watch TV every evening.", textDst: "私は毎晩テレビを見ます。" }
    ],
    collocations: [
      { phrase: "good evening", meaning: "こんばんは" },
      { phrase: "this evening", meaning: "今晩" },
      { phrase: "every evening", meaning: "毎晩" }
    ]
  },
  "week": {
    headword: { lemma: "week", lang: "en", pos: ["noun"], pronunciation: "/wiːk/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "週", glossLong: "7日間", examples: ["this week", "next week"] }
    ],
    examples: [
      { textSrc: "I'm busy this week.", textDst: "今週は忙しいです。" },
      { textSrc: "See you next week.", textDst: "また来週会いましょう。" }
    ],
    collocations: [
      { phrase: "this week", meaning: "今週" },
      { phrase: "next week", meaning: "来週" },
      { phrase: "last week", meaning: "先週" }
    ]
  },
  "month": {
    headword: { lemma: "month", lang: "en", pos: ["noun"], pronunciation: "/mʌnθ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "月", glossLong: "1ヶ月", examples: ["this month", "next month"] }
    ],
    examples: [
      { textSrc: "I'll visit Japan next month.", textDst: "来月日本を訪れます。" },
      { textSrc: "It's been a month.", textDst: "1ヶ月経ちました。" }
    ],
    collocations: [
      { phrase: "this month", meaning: "今月" },
      { phrase: "next month", meaning: "来月" },
      { phrase: "last month", meaning: "先月" }
    ]
  },
  "food": {
    headword: { lemma: "food", lang: "en", pos: ["noun"], pronunciation: "/fuːd/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "食べ物", glossLong: "food", examples: ["good food", "delicious food"] }
    ],
    examples: [
      { textSrc: "I like Japanese food.", textDst: "私は日本食が好きです。" },
      { textSrc: "This food is delicious.", textDst: "この食べ物は美味しいです。" }
    ],
    collocations: [
      { phrase: "good food", meaning: "美味しい食べ物" },
      { phrase: "fast food", meaning: "ファーストフード" },
      { phrase: "Japanese food", meaning: "日本食" }
    ]
  },
  "restaurant": {
    headword: { lemma: "restaurant", lang: "en", pos: ["noun"], pronunciation: "/ˈrestrɑːnt/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "レストラン", glossLong: "飲食店", examples: ["good restaurant", "Italian restaurant"] }
    ],
    examples: [
      { textSrc: "Let's go to a restaurant.", textDst: "レストランに行きましょう。" },
      { textSrc: "This is a good restaurant.", textDst: "ここは良いレストランです。" }
    ],
    collocations: [
      { phrase: "good restaurant", meaning: "良いレストラン" },
      { phrase: "Italian restaurant", meaning: "イタリアンレストラン" },
      { phrase: "at the restaurant", meaning: "レストランで" }
    ]
  },
  "hospital": {
    headword: { lemma: "hospital", lang: "en", pos: ["noun"], pronunciation: "/ˈhɑːspɪtl/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "病院", glossLong: "medical facility", examples: ["go to hospital", "in hospital"] }
    ],
    examples: [
      { textSrc: "I went to the hospital.", textDst: "私は病院に行きました。" },
      { textSrc: "She is in the hospital.", textDst: "彼女は入院しています。" }
    ],
    collocations: [
      { phrase: "go to hospital", meaning: "病院に行く" },
      { phrase: "in hospital", meaning: "入院中" },
      { phrase: "leave hospital", meaning: "退院する" }
    ]
  },
  "station": {
    headword: { lemma: "station", lang: "en", pos: ["noun"], pronunciation: "/ˈsteɪʃn/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "駅", glossLong: "train station", examples: ["train station", "bus station"] }
    ],
    examples: [
      { textSrc: "Where is the station?", textDst: "駅はどこですか？" },
      { textSrc: "I'll meet you at the station.", textDst: "駅で会いましょう。" }
    ],
    collocations: [
      { phrase: "train station", meaning: "鉄道駅" },
      { phrase: "bus station", meaning: "バス停" },
      { phrase: "at the station", meaning: "駅で" }
    ]
  },
  "airport": {
    headword: { lemma: "airport", lang: "en", pos: ["noun"], pronunciation: "/ˈerpɔːrt/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "空港", glossLong: "airport", examples: ["international airport", "at the airport"] }
    ],
    examples: [
      { textSrc: "I'll pick you up at the airport.", textDst: "空港まで迎えに行きます。" },
      { textSrc: "The airport is far from here.", textDst: "空港はここから遠いです。" }
    ],
    collocations: [
      { phrase: "international airport", meaning: "国際空港" },
      { phrase: "at the airport", meaning: "空港で" },
      { phrase: "go to airport", meaning: "空港に行く" }
    ]
  },
  "shop": {
    headword: { lemma: "shop", lang: "en", pos: ["noun", "verb"], pronunciation: "/ʃɑːp/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "店", glossLong: "store", examples: ["book shop", "coffee shop"] },
      { id: "v1", pos: "verb", glossShort: "買い物する", glossLong: "shopping", examples: ["go shopping", "shop online"] }
    ],
    examples: [
      { textSrc: "There's a shop nearby.", textDst: "近くに店があります。" },
      { textSrc: "I shop online.", textDst: "私はオンラインで買い物します。" }
    ],
    collocations: [
      { phrase: "book shop", meaning: "書店" },
      { phrase: "coffee shop", meaning: "喫茶店" },
      { phrase: "go shopping", meaning: "買い物に行く" }
    ]
  },
  "store": {
    headword: { lemma: "store", lang: "en", pos: ["noun", "verb"], pronunciation: "/stɔːr/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "店", glossLong: "shop", examples: ["department store", "grocery store"] },
      { id: "v1", pos: "verb", glossShort: "保管する", glossLong: "storage", examples: ["store food", "store data"] }
    ],
    examples: [
      { textSrc: "I work at a store.", textDst: "私は店で働いています。" },
      { textSrc: "Store it in a cool place.", textDst: "涼しい場所に保管してください。" }
    ],
    collocations: [
      { phrase: "department store", meaning: "デパート" },
      { phrase: "grocery store", meaning: "食料品店" },
      { phrase: "in store", meaning: "店内で" }
    ]
  },
  "park": {
    headword: { lemma: "park", lang: "en", pos: ["noun", "verb"], pronunciation: "/pɑːrk/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "公園", glossLong: "public garden", examples: ["national park", "in the park"] },
      { id: "v1", pos: "verb", glossShort: "駐車する", glossLong: "parking", examples: ["park the car", "park here"] }
    ],
    examples: [
      { textSrc: "Let's go to the park.", textDst: "公園に行きましょう。" },
      { textSrc: "You can park here.", textDst: "ここに駐車できます。" }
    ],
    collocations: [
      { phrase: "national park", meaning: "国立公園" },
      { phrase: "in the park", meaning: "公園で" },
      { phrase: "park the car", meaning: "車を駐車する" }
    ]
  },
  "library": {
    headword: { lemma: "library", lang: "en", pos: ["noun"], pronunciation: "/ˈlaɪbreri/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "図書館", glossLong: "library", examples: ["public library", "at the library"] }
    ],
    examples: [
      { textSrc: "I study at the library.", textDst: "私は図書館で勉強します。" },
      { textSrc: "The library is open.", textDst: "図書館は開いています。" }
    ],
    collocations: [
      { phrase: "public library", meaning: "公共図書館" },
      { phrase: "at the library", meaning: "図書館で" },
      { phrase: "school library", meaning: "学校図書館" }
    ]
  },
  "bank": {
    headword: { lemma: "bank", lang: "en", pos: ["noun"], pronunciation: "/bæŋk/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "銀行", glossLong: "financial institution", examples: ["go to bank", "at the bank"] }
    ],
    examples: [
      { textSrc: "I went to the bank.", textDst: "私は銀行に行きました。" },
      { textSrc: "Where is the nearest bank?", textDst: "最寄りの銀行はどこですか？" }
    ],
    collocations: [
      { phrase: "go to bank", meaning: "銀行に行く" },
      { phrase: "at the bank", meaning: "銀行で" },
      { phrase: "bank account", meaning: "銀行口座" }
    ]
  },
  "office": {
    headword: { lemma: "office", lang: "en", pos: ["noun"], pronunciation: "/ˈɔːfɪs/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "事務所", glossLong: "workplace", examples: ["go to office", "at the office"] }
    ],
    examples: [
      { textSrc: "I work in an office.", textDst: "私はオフィスで働いています。" },
      { textSrc: "He's at the office.", textDst: "彼はオフィスにいます。" }
    ],
    collocations: [
      { phrase: "go to office", meaning: "オフィスに行く" },
      { phrase: "at the office", meaning: "オフィスで" },
      { phrase: "office worker", meaning: "会社員" }
    ]
  },
  "room": {
    headword: { lemma: "room", lang: "en", pos: ["noun"], pronunciation: "/ruːm/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "部屋", glossLong: "space", examples: ["my room", "living room"] }
    ],
    examples: [
      { textSrc: "This is my room.", textDst: "これは私の部屋です。" },
      { textSrc: "The room is big.", textDst: "その部屋は大きいです。" }
    ],
    collocations: [
      { phrase: "my room", meaning: "私の部屋" },
      { phrase: "living room", meaning: "居間" },
      { phrase: "meeting room", meaning: "会議室" }
    ]
  },
  "window": {
    headword: { lemma: "window", lang: "en", pos: ["noun"], pronunciation: "/ˈwɪndoʊ/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "窓", glossLong: "window", examples: ["open window", "by the window"] }
    ],
    examples: [
      { textSrc: "Open the window please.", textDst: "窓を開けてください。" },
      { textSrc: "I sit by the window.", textDst: "私は窓際に座ります。" }
    ],
    collocations: [
      { phrase: "open window", meaning: "窓を開ける" },
      { phrase: "close window", meaning: "窓を閉める" },
      { phrase: "by the window", meaning: "窓際に" }
    ]
  },
  "door": {
    headword: { lemma: "door", lang: "en", pos: ["noun"], pronunciation: "/dɔːr/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "ドア", glossLong: "entrance", examples: ["open door", "front door"] }
    ],
    examples: [
      { textSrc: "Close the door please.", textDst: "ドアを閉めてください。" },
      { textSrc: "Someone is at the door.", textDst: "誰かがドアのところにいます。" }
    ],
    collocations: [
      { phrase: "open door", meaning: "ドアを開ける" },
      { phrase: "close door", meaning: "ドアを閉める" },
      { phrase: "front door", meaning: "玄関" }
    ]
  },
  "table": {
    headword: { lemma: "table", lang: "en", pos: ["noun"], pronunciation: "/ˈteɪbl/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "テーブル", glossLong: "table", examples: ["dining table", "on the table"] }
    ],
    examples: [
      { textSrc: "Sit at the table.", textDst: "テーブルに座ってください。" },
      { textSrc: "The book is on the table.", textDst: "本はテーブルの上にあります。" }
    ],
    collocations: [
      { phrase: "dining table", meaning: "食卓" },
      { phrase: "on the table", meaning: "テーブルの上に" },
      { phrase: "at the table", meaning: "テーブルについて" }
    ]
  },
  "chair": {
    headword: { lemma: "chair", lang: "en", pos: ["noun"], pronunciation: "/tʃer/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "椅子", glossLong: "seat", examples: ["comfortable chair", "sit on chair"] }
    ],
    examples: [
      { textSrc: "Please sit on the chair.", textDst: "椅子に座ってください。" },
      { textSrc: "This chair is comfortable.", textDst: "この椅子は快適です。" }
    ],
    collocations: [
      { phrase: "comfortable chair", meaning: "快適な椅子" },
      { phrase: "sit on chair", meaning: "椅子に座る" },
      { phrase: "office chair", meaning: "オフィスチェア" }
    ]
  },
  "desk": {
    headword: { lemma: "desk", lang: "en", pos: ["noun"], pronunciation: "/desk/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "机", glossLong: "work table", examples: ["at the desk", "study desk"] }
    ],
    examples: [
      { textSrc: "I study at my desk.", textDst: "私は机で勉強します。" },
      { textSrc: "There's a lamp on the desk.", textDst: "机の上にランプがあります。" }
    ],
    collocations: [
      { phrase: "at the desk", meaning: "机で" },
      { phrase: "study desk", meaning: "学習机" },
      { phrase: "office desk", meaning: "オフィスデスク" }
    ]
  },
  "bed": {
    headword: { lemma: "bed", lang: "en", pos: ["noun"], pronunciation: "/bed/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "ベッド", glossLong: "bed", examples: ["go to bed", "in bed"] }
    ],
    examples: [
      { textSrc: "I go to bed at 11.", textDst: "私は11時に寝ます。" },
      { textSrc: "She's still in bed.", textDst: "彼女はまだベッドにいます。" }
    ],
    collocations: [
      { phrase: "go to bed", meaning: "寝る" },
      { phrase: "in bed", meaning: "ベッドで" },
      { phrase: "make the bed", meaning: "ベッドを整える" }
    ]
  },
  "phone": {
    headword: { lemma: "phone", lang: "en", pos: ["noun", "verb"], pronunciation: "/foʊn/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "電話", glossLong: "telephone", examples: ["mobile phone", "on the phone"] },
      { id: "v1", pos: "verb", glossShort: "電話する", glossLong: "call", examples: ["phone me", "phone home"] }
    ],
    examples: [
      { textSrc: "My phone is ringing.", textDst: "私の電話が鳴っています。" },
      { textSrc: "I'll phone you later.", textDst: "後で電話します。" }
    ],
    collocations: [
      { phrase: "mobile phone", meaning: "携帯電話" },
      { phrase: "on the phone", meaning: "電話中" },
      { phrase: "phone call", meaning: "電話" }
    ]
  },
  "computer": {
    headword: { lemma: "computer", lang: "en", pos: ["noun"], pronunciation: "/kəmˈpjuːtər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "コンピュータ", glossLong: "computer", examples: ["personal computer", "use computer"] }
    ],
    examples: [
      { textSrc: "I use a computer every day.", textDst: "私は毎日コンピュータを使います。" },
      { textSrc: "My computer is slow.", textDst: "私のコンピュータは遅いです。" }
    ],
    collocations: [
      { phrase: "personal computer", meaning: "パソコン" },
      { phrase: "use computer", meaning: "コンピュータを使う" },
      { phrase: "computer game", meaning: "コンピュータゲーム" }
    ]
  },
  "car": {
    headword: { lemma: "car", lang: "en", pos: ["noun"], pronunciation: "/kɑːr/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "車", glossLong: "automobile", examples: ["my car", "by car"] }
    ],
    examples: [
      { textSrc: "I go to work by car.", textDst: "私は車で通勤します。" },
      { textSrc: "This is my car.", textDst: "これは私の車です。" }
    ],
    collocations: [
      { phrase: "my car", meaning: "私の車" },
      { phrase: "by car", meaning: "車で" },
      { phrase: "car park", meaning: "駐車場" }
    ]
  },
  "train": {
    headword: { lemma: "train", lang: "en", pos: ["noun", "verb"], pronunciation: "/treɪn/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "電車", glossLong: "railway", examples: ["by train", "catch train"] },
      { id: "v1", pos: "verb", glossShort: "訓練する", glossLong: "practice", examples: ["train hard", "train for"] }
    ],
    examples: [
      { textSrc: "I go to work by train.", textDst: "私は電車で通勤します。" },
      { textSrc: "I train every day.", textDst: "私は毎日トレーニングします。" }
    ],
    collocations: [
      { phrase: "by train", meaning: "電車で" },
      { phrase: "catch train", meaning: "電車に乗る" },
      { phrase: "train station", meaning: "駅" }
    ]
  },
  "bus": {
    headword: { lemma: "bus", lang: "en", pos: ["noun"], pronunciation: "/bʌs/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "バス", glossLong: "bus", examples: ["by bus", "bus stop"] }
    ],
    examples: [
      { textSrc: "I go to school by bus.", textDst: "私はバスで学校に行きます。" },
      { textSrc: "The bus is late.", textDst: "バスが遅れています。" }
    ],
    collocations: [
      { phrase: "by bus", meaning: "バスで" },
      { phrase: "bus stop", meaning: "バス停" },
      { phrase: "catch bus", meaning: "バスに乗る" }
    ]
  },
  "bike": {
    headword: { lemma: "bike", lang: "en", pos: ["noun", "verb"], pronunciation: "/baɪk/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "自転車", glossLong: "bicycle", examples: ["by bike", "ride bike"] },
      { id: "v1", pos: "verb", glossShort: "自転車に乗る", glossLong: "cycling", examples: ["bike to work", "bike around"] }
    ],
    examples: [
      { textSrc: "I go to school by bike.", textDst: "私は自転車で学校に行きます。" },
      { textSrc: "I bike to work.", textDst: "私は自転車で通勤します。" }
    ],
    collocations: [
      { phrase: "by bike", meaning: "自転車で" },
      { phrase: "ride bike", meaning: "自転車に乗る" },
      { phrase: "mountain bike", meaning: "マウンテンバイク" }
    ]
  },
  "question": {
    headword: { lemma: "question", lang: "en", pos: ["noun", "verb"], pronunciation: "/ˈkwestʃən/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "質問", glossLong: "inquiry", examples: ["good question", "ask question"] },
      { id: "v1", pos: "verb", glossShort: "質問する", glossLong: "ask", examples: ["question about", "question someone"] }
    ],
    examples: [
      { textSrc: "Do you have any questions?", textDst: "何か質問はありますか？" },
      { textSrc: "I'll question him about it.", textDst: "それについて彼に質問します。" }
    ],
    collocations: [
      { phrase: "good question", meaning: "良い質問" },
      { phrase: "ask question", meaning: "質問する" },
      { phrase: "difficult question", meaning: "難しい質問" }
    ]
  },
  "answer": {
    headword: { lemma: "answer", lang: "en", pos: ["noun", "verb"], pronunciation: "/ˈænsər/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "答え", glossLong: "response", examples: ["right answer", "give answer"] },
      { id: "v1", pos: "verb", glossShort: "答える", glossLong: "reply", examples: ["answer question", "answer phone"] }
    ],
    examples: [
      { textSrc: "What's the answer?", textDst: "答えは何ですか？" },
      { textSrc: "Please answer my question.", textDst: "私の質問に答えてください。" }
    ],
    collocations: [
      { phrase: "right answer", meaning: "正しい答え" },
      { phrase: "give answer", meaning: "答えを出す" },
      { phrase: "answer phone", meaning: "電話に出る" }
    ]
  },
  "problem": {
    headword: { lemma: "problem", lang: "en", pos: ["noun"], pronunciation: "/ˈprɑːbləm/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "問題", glossLong: "difficulty", examples: ["big problem", "solve problem"] }
    ],
    examples: [
      { textSrc: "I have a problem.", textDst: "問題があります。" },
      { textSrc: "No problem!", textDst: "問題ありません！" }
    ],
    collocations: [
      { phrase: "big problem", meaning: "大きな問題" },
      { phrase: "solve problem", meaning: "問題を解決する" },
      { phrase: "no problem", meaning: "問題ない" }
    ]
  },
  "idea": {
    headword: { lemma: "idea", lang: "en", pos: ["noun"], pronunciation: "/aɪˈdiːə/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "考え", glossLong: "thought", examples: ["good idea", "have idea"] }
    ],
    examples: [
      { textSrc: "That's a good idea!", textDst: "それは良い考えです！" },
      { textSrc: "I have an idea.", textDst: "考えがあります。" }
    ],
    collocations: [
      { phrase: "good idea", meaning: "良い考え" },
      { phrase: "have idea", meaning: "考えがある" },
      { phrase: "no idea", meaning: "わからない" }
    ]
  },
  "help": {
    headword: { lemma: "help", lang: "en", pos: ["verb", "noun"], pronunciation: "/help/" },
    senses: [
      { id: "v1", pos: "verb", glossShort: "助ける", glossLong: "assist", examples: ["help me", "help with"] },
      { id: "n1", pos: "noun", glossShort: "助け", glossLong: "assistance", examples: ["need help", "ask for help"] }
    ],
    examples: [
      { textSrc: "Can you help me?", textDst: "手伝ってくれますか？" },
      { textSrc: "I need your help.", textDst: "あなたの助けが必要です。" }
    ],
    collocations: [
      { phrase: "help me", meaning: "私を助けて" },
      { phrase: "need help", meaning: "助けが必要" },
      { phrase: "help with", meaning: "〜を手伝う" }
    ]
  },
  "money": {
    headword: { lemma: "money", lang: "en", pos: ["noun"], pronunciation: "/ˈmʌni/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "お金", glossLong: "currency", examples: ["have money", "need money"] }
    ],
    examples: [
      { textSrc: "I don't have much money.", textDst: "私はあまりお金を持っていません。" },
      { textSrc: "Money isn't everything.", textDst: "お金が全てではありません。" }
    ],
    collocations: [
      { phrase: "have money", meaning: "お金を持つ" },
      { phrase: "need money", meaning: "お金が必要" },
      { phrase: "save money", meaning: "お金を節約する" }
    ]
  },
  "price": {
    headword: { lemma: "price", lang: "en", pos: ["noun"], pronunciation: "/praɪs/" },
    senses: [
      { id: "n1", pos: "noun", glossShort: "価格", glossLong: "cost", examples: ["good price", "high price"] }
    ],
    examples: [
      { textSrc: "What's the price?", textDst: "価格はいくらですか？" },
      { textSrc: "The price is too high.", textDst: "価格が高すぎます。" }
    ],
    collocations: [
      { phrase: "good price", meaning: "良い価格" },
      { phrase: "high price", meaning: "高い価格" },
      { phrase: "low price", meaning: "低い価格" }
    ]
  }
};

// 既存の辞書にマージ
Object.assign(dictionary.en_details, moreDetails);

// ファイルに書き込み
fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), 'utf8');

console.log('More English details added successfully!');
console.log(`Total English detail entries: ${Object.keys(dictionary.en_details).length}`);
