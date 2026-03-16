import type {
  GenerateRequest,
  EditRequest,
  GenerateProRequest,
  ApiResponse,
  TaskSubmitData,
  TaskStatusData,
  ParsedTaskResult,
} from "./types.js";

export class NanoBananaClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = "https://nanobnana.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as ApiResponse<T>;

    if (json.code !== 200) {
      throw new Error(`API error ${json.code}: ${json.message}`);
    }

    return json;
  }

  async generate(params: GenerateRequest): Promise<string> {
    const res = await this.request<TaskSubmitData>("POST", "/api/generate", params);
    return res.task_id ?? res.data!.task_id;
  }

  async edit(params: EditRequest): Promise<string> {
    const res = await this.request<TaskSubmitData>("POST", "/api/edit", params);
    return res.task_id ?? res.data!.task_id;
  }

  async generatePro(params: GenerateProRequest): Promise<string> {
    const res = await this.request<TaskSubmitData>("POST", "/api/v2/generate", params);
    return res.data!.task_id;
  }

  async getStatus(taskId: string): Promise<ParsedTaskResult> {
    const res = await this.request<TaskStatusData>(
      "GET",
      `/api/status?task_id=${encodeURIComponent(taskId)}`
    );
    return this.parseStatusData(res.data!);
  }

  async getStatusV2(taskId: string): Promise<ParsedTaskResult> {
    const res = await this.request<TaskStatusData>(
      "GET",
      `/api/v2/status?task_id=${encodeURIComponent(taskId)}`
    );
    return this.parseStatusData(res.data!);
  }

  private parseStatusData(data: TaskStatusData): ParsedTaskResult {
    let imageUrls: string[] = [];
    if (data.response) {
      try {
        imageUrls = JSON.parse(data.response);
      } catch {
        imageUrls = [];
      }
    }

    let prompt = "";
    try {
      const req = JSON.parse(data.request);
      prompt = req.prompt ?? "";
    } catch {
      prompt = "";
    }

    const statusMap: Record<number, ParsedTaskResult["status"]> = {
      0: "processing",
      1: "completed",
      [-1]: "failed",
    };

    return {
      taskId: data.task_id,
      status: statusMap[data.status] ?? "processing",
      imageUrls,
      prompt,
      credits: data.consumed_credits ?? data.consumed_credit ?? 0,
      createdAt: data.created_at,
      errorMessage: data.error_message ?? undefined,
    };
  }
}
