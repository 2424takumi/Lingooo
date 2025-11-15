export interface FollowUpQA {
  id: string;
  q: string;
  a: string;
  status: 'pending' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ChatBookmark {
  id: string;
  question: string;
  answer: string;
  scope: string;
  identifier: string;
  timestamp: number;
  folder?: string;
  followUpQAs?: FollowUpQA[];
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}
