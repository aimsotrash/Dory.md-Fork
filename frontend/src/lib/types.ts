export type Category = 'technical' | 'personal' | 'reference' | 'general';
export type Urgency = 'low' | 'medium' | 'high';
export type SourceType = 'file' | 'note' | 'url' | 'clipboard';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface Chunk {
  id: string;
  content: string;
  source_type: SourceType;
  source_name: string;
  category: Category;
  created_at: string;
  last_accessed: string;
  access_count: number;
  stability_S: number;
  complexity_k: number;
  retention?: number;
  tags?: string[];
}

export interface CategoryStat {
  name: Category;
  avg_retention: number;
  count: number;
  urgency: Urgency;
}

export interface HealthResponse {
  categories: CategoryStat[];
  total_chunks: number;
  time_offset_hours: number;
}

export type DiscoveryResponse =
  | { has_discovery: true; chunk: Chunk; reason: string }
  | { has_discovery: false };

export interface SearchResult {
  chunk: Chunk;
  score: number;
  highlight?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export interface QuizQuestion {
  id: string;
  chunk_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: QuizDifficulty;
  category: Category;
  hint?: string;
}

export interface QuizSession {
  session_id: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAnswer {
  question_id: string;
  selected_index: number;
  time_taken_ms: number;
}

export interface QuizResultItem {
  question_id: string;
  correct: boolean;
  selected_index: number;
  correct_index: number;
  stability_delta: number;
}

export interface QuizResults {
  session_id: string;
  score: number;
  total: number;
  results: QuizResultItem[];
  xp_earned: number;
  streaks: number;
}

export interface IngestResponse {
  chunk_id: string;
  category: Category;
  stability_S: number;
  complexity_k: number;
  message: string;
}

export interface FileIngestResponse {
  chunks_created: number;
  source: string;
}

export interface NotionStatus {
  connected: boolean;
  oauth_available: boolean;
  workspace?: string;
  avatar?: string;
}

export interface NotionPage {
  id: string;
  title: string;
}

export interface NotionConnectResponse {
  connected: boolean;
  workspace: string;
}

export interface NotionImportResponse {
  pages_imported: number;
  chunks_created: number;
}
