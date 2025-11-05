/**
 * 段階的生成の部分結果を保存するメモリストア
 *
 * フロントエンドがポーリングで取得できるように、
 * 各生成タスクの進捗と部分データを保存します。
 */

interface ProgressiveData {
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
  partialData: any; // 段階的に構築されるデータ
  error?: string;
  timestamp: number;
}

// タスクID → データ
const store = new Map<string, ProgressiveData>();

// 5分でタイムアウト
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 古いエントリをクリーンアップ
 */
function cleanup() {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now - data.timestamp > TIMEOUT_MS) {
      store.delete(key);
    }
  }
}

/**
 * タスクを初期化
 */
export function initTask(taskId: string): void {
  cleanup();
  store.set(taskId, {
    status: 'pending',
    progress: 0,
    partialData: {},
    timestamp: Date.now(),
  });
}

/**
 * タスクの状態を更新
 */
export function updateTask(
  taskId: string,
  updates: {
    status?: ProgressiveData['status'];
    progress?: number;
    partialData?: any;
    error?: string;
  }
): void {
  const existing = store.get(taskId);
  if (!existing) {
    console.warn('[ProgressiveStore] Task not found:', taskId);
    return;
  }

  store.set(taskId, {
    ...existing,
    ...updates,
    timestamp: Date.now(),
  });
}

/**
 * タスクの現在の状態を取得
 */
export function getTask(taskId: string): ProgressiveData | undefined {
  cleanup();
  return store.get(taskId);
}

/**
 * タスクを削除
 */
export function deleteTask(taskId: string): void {
  store.delete(taskId);
}

/**
 * ストア全体をクリア（テスト用）
 */
export function clearStore(): void {
  store.clear();
}
