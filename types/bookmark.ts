export interface ChatBookmark {
  id: string;
  question: string;
  answer: string;
  scope: string;
  identifier: string;
  timestamp: number;
  folder?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}
