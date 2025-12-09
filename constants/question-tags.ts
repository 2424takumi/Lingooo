/**
 * 質問タグの定義
 * 画面・コンテキストごとに異なる質問タグを提供
 */

export interface QuestionTag {
  id: string;
  label: string;
  icon?: string;
  prompt: string; // Deprecated: Will be removed after migration to backend prompts
  description?: string;
  promptId?: string; // Langfuse prompt ID (used by backend)
  isCustom?: boolean; // Whether this is a custom question tag
}

export interface QuestionTag {
  id: string;
  label: string;
  icon?: string;
  prompt: string; // Used as the message content sent to backend
  description?: string;
  promptId?: string; // Langfuse prompt ID (used by backend)
  isCustom?: boolean; // Whether this is a custom question tag
}

// NOTE: Question tags are now generated dynamically in `components/ui/chat-section/use-question-tags.ts`
// to support localization (i18n). The static arrays previously defined here have been removed.

