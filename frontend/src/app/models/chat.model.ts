export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceDocuments?: SourceDocument[];
  isLoading?: boolean;
}

export interface SourceDocument {
  page_content: string;   // snake_case — matches FastAPI response
  metadata: {
    source?: string;
    page?: number;
    chunk_index?: number;
    relevance?: number;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryRequest {
  question: string;
  sessionId?: string;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sourceDocuments: SourceDocument[];
  metadata: {
    question: string;
    timestamp: string;
    sourcesCount: number;
  };
}