export type ChatScope = 'word' | 'search';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: ChatMessageStatus;
  error?: string;
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
  searchSuggestions?: Array<{ lemma: string; shortSenseJa: string }>;
}

export interface ChatRequest {
  sessionId: string;
  scope: ChatScope;
  identifier: string;
  messages: ChatMessage[];
  context?: ChatRequestContext;
  detailLevel?: 'concise' | 'detailed';
  targetLanguage?: string; // 学習言語コード (e.g., 'en', 'pt', 'es')
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
}
