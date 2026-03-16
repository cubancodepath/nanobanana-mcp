// --- Request types ---

export interface GenerateRequest {
  prompt: string;
}

export interface EditRequest {
  prompt: string;
  images: string[];
}

export interface GenerateProRequest {
  prompt: string;
  aspect_ratio?: string;
  size?: string;
  format?: string;
  images?: string[];
}

// --- Response types ---

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  task_id?: string;
}

export interface TaskSubmitData {
  task_id: string;
}

export interface TaskStatusData {
  task_id: string;
  request: string; // JSON string
  response: string | null; // JSON string with image URLs array, or null
  type?: number;
  status: number; // 0 = processing, 1 = completed, -1 = failed
  consumed_credit?: number;
  consumed_credits?: number;
  created_at: string;
  updated_at?: string;
  error_message?: string | null;
}

export interface ParsedTaskResult {
  taskId: string;
  status: "processing" | "completed" | "failed";
  imageUrls: string[];
  prompt: string;
  credits: number;
  createdAt: string;
  errorMessage?: string;
}
