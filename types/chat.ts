export type ChatScope =
  | 'word'
  | 'search'
  | 'word-detail'
  | 'general'
  | 'grammar'
  | 'pronunciation'
  | 'translate'; // 翻訳機能用のスコープ

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: ChatMessageStatus;
  error?: string;
  displayContent?: string; // UI表示用のコンテンツ（プロンプト指示を除いたもの）
}

export interface ChatSessionKey {
  scope: ChatScope;
  identifier: string;
}

export interface ChatSessionState {
  key: ChatSessionKey;
  sessionId: string;
  messages: ChatMessage[];
  followUps: string[];
  isStreaming: boolean;
  error?: string | null;
}

export interface ChatRequestContext {
  headword?: string;
  senses?: string[];
  examples?: Array<{ english: string; japanese: string }>; // 簡易表現
  searchSuggestions?: Array<{ lemma: string; shortSense: string[] }>;

  // 翻訳コンテキスト
  originalText?: string;
  translatedText?: string;
  sourceLang?: string;
  targetLang?: string;
  selectedText?: string;
  selectedType?: 'original' | 'translated';
}

export interface ChatRequest {
  sessionId: string;
  scope: ChatScope;
  identifier: string;
  messages: ChatMessage[];
  context?: ChatRequestContext;
  targetLanguage?: string; // 学習言語コード (e.g., 'en', 'pt', 'es')
  nativeLanguage?: string; // ユーザーの母国語コード (e.g., 'ja', 'en', 'pt')
}

export interface ChatCompletion {
  message: ChatMessage;
  followUps?: string[];
}

export type ChatStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'metadata'; followUps?: string[] }
  | { type: 'end'; message: string; followUps?: string[] };

export type QAPairStatus = 'pending' | 'completed' | 'error';

export interface QAPair {
  id: string;
  q: string;
  a?: string;
  status: QAPairStatus;
  errorMessage?: string;
  context?: {
    originalText?: string;
    translatedText?: string;
    sourceLang?: string;
    targetLang?: string;
  };
  followUpQAs?: Array<{
    id: string;
    q: string;
    a?: string;
    status: QAPairStatus;
    errorMessage?: string;
  }>;
}
