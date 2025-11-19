# Performance Anti-Patterns

Lingoooプロジェクトでよく見られるパフォーマンスアンチパターンと修正例

## React Native

### 1. ScrollView flex:1 問題

```typescript
// ❌ アンチパターン
const styles = StyleSheet.create({
  scrollView: {
    flex: 1, // これがスクロールを制限する
  },
});

<ScrollView style={styles.scrollView}>
  <View style={styles.content}>
    {/* コンテンツ */}
  </View>
</ScrollView>

// ✅ 正しいパターン
const styles = StyleSheet.create({
  scrollView: {
    // flex: 1 を削除
  },
  content: {
    paddingBottom: 20, // 最後までスクロール可能に
  },
});

<ScrollView style={styles.scrollView}>
  <View style={styles.content}>
    {/* コンテンツ */}
  </View>
</ScrollView>
```

### 2. useEffect クリーンアップ漏れ

```typescript
// ❌ アンチパターン
useEffect(() => {
  const timer = setInterval(() => {
    checkStatus();
  }, 1000);
  // クリーンアップなし → メモリリーク
}, []);

// ✅ 正しいパターン
useEffect(() => {
  const timer = setInterval(() => {
    checkStatus();
  }, 1000);

  return () => clearInterval(timer); // クリーンアップ
}, []);
```

### 3. オブジェクトを依存配列に入れる

```typescript
// ❌ アンチパターン
const config = { apiKey: 'xxx', endpoint: 'yyy' };

useEffect(() => {
  fetchData(config);
}, [config]); // configは毎回新しいオブジェクト → 無限ループ

// ✅ 正しいパターン1: useMemo
const config = useMemo(
  () => ({ apiKey: 'xxx', endpoint: 'yyy' }),
  []
);

useEffect(() => {
  fetchData(config);
}, [config]);

// ✅ 正しいパターン2: 個別の値を依存配列に
useEffect(() => {
  fetchData({ apiKey, endpoint });
}, [apiKey, endpoint]);
```

### 4. インライン関数をpropsで渡す

```typescript
// ❌ アンチパターン
function ParentComponent() {
  const [count, setCount] = useState(0);

  return (
    <ChildComponent
      onPress={() => setCount(count + 1)} // 毎回新しい関数
    />
  );
}

// ✅ 正しいパターン
function ParentComponent() {
  const [count, setCount] = useState(0);

  const handlePress = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <ChildComponent onPress={handlePress} />;
}

const ChildComponent = React.memo(({ onPress }) => {
  return <TouchableOpacity onPress={onPress}>...</TouchableOpacity>;
});
```

### 5. 大量のリストを map でレンダリング

```typescript
// ❌ アンチパターン
<ScrollView>
  {items.map((item) => (
    <ItemCard key={item.id} {...item} />
  ))}
</ScrollView>

// ✅ 正しいパターン
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard {...item} />}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true} // オフスクリーンのビューを削除
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### 6. 計算をレンダリング内で実行

```typescript
// ❌ アンチパターン
function Component({ items }) {
  return (
    <View>
      <Text>合計: {items.reduce((sum, i) => sum + i.price, 0)}</Text>
      {/* 毎回計算される */}
    </View>
  );
}

// ✅ 正しいパターン
function Component({ items }) {
  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price, 0),
    [items]
  );

  return (
    <View>
      <Text>合計: {total}</Text>
    </View>
  );
}
```

### 7. ネストしたScrollView

```typescript
// ❌ アンチパターン
<ScrollView> {/* 外側: 垂直 */}
  <ScrollView horizontal> {/* 内側: 水平 - OK */}
    ...
  </ScrollView>

  <ScrollView> {/* 内側: 垂直 - NG! */}
    ...
  </ScrollView>
</ScrollView>

// ✅ 正しいパターン
<ScrollView>
  <ScrollView horizontal> {/* 水平はOK */}
    ...
  </ScrollView>

  <View> {/* ネストせず、単一のScrollViewに統合 */}
    ...
  </View>
</ScrollView>
```

## Backend (Node.js)

### 8. N+1 クエリ問題

```typescript
// ❌ アンチパターン
async function getUsersWithProfiles(userIds: string[]) {
  const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [userIds]);

  for (const user of users) {
    user.profile = await db.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    ); // N+1クエリ
  }

  return users;
}

// ✅ 正しいパターン
async function getUsersWithProfiles(userIds: string[]) {
  const [users, profiles] = await Promise.all([
    db.query('SELECT * FROM users WHERE id = ANY($1)', [userIds]),
    db.query('SELECT * FROM profiles WHERE user_id = ANY($1)', [userIds]),
  ]);

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  return users.map(user => ({
    ...user,
    profile: profileMap.get(user.id),
  }));
}
```

### 9. 同期処理でブロッキング

```typescript
// ❌ アンチパターン
app.post('/process', (req, res) => {
  const result = heavyComputation(req.body); // ブロッキング
  res.json(result);
});

// ✅ 正しいパターン
app.post('/process', async (req, res) => {
  const result = await processInBackground(req.body); // 非同期
  res.json(result);
});
```

### 10. ストリーム処理でバッファリング

```typescript
// ❌ アンチパターン
async function processLargeFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8'); // 全体をメモリに
  // 大きなファイルでメモリ不足
  return content.split('\n').map(processLine);
}

// ✅ 正しいパターン
async function processLargeFile(filePath: string) {
  const stream = fs.createReadStream(filePath);
  const reader = readline.createInterface({ input: stream });

  const results = [];
  for await (const line of reader) {
    results.push(processLine(line));
  }

  return results;
}
```

## 共通

### 11. 過度なログ出力

```typescript
// ❌ アンチパターン
items.forEach((item) => {
  console.log('Processing:', item); // ループ内でログ
  process(item);
});

// ✅ 正しいパターン
logger.debug(`Processing ${items.length} items`);
items.forEach(process);
```

### 12. 不要な try-catch

```typescript
// ❌ アンチパターン
try {
  const result = await fetchData(); // エラーハンドリングしていない
  return result;
} catch (error) {
  throw error; // 再スロー → try-catchの意味がない
}

// ✅ 正しいパターン
const result = await fetchData(); // 上位でハンドリング
return result;

// または
try {
  const result = await fetchData();
  return result;
} catch (error) {
  logger.error('Failed to fetch data:', error);
  return defaultValue; // フォールバック
}
```
