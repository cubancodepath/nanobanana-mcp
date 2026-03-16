import type { ParsedTaskResult } from "../api/types.js";

interface PollOptions {
  taskId: string;
  statusFn: (taskId: string) => Promise<ParsedTaskResult>;
  initialDelayMs?: number;
  intervalMs?: number;
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollForResult(opts: PollOptions): Promise<ParsedTaskResult> {
  const {
    taskId,
    statusFn,
    initialDelayMs = 3000,
    intervalMs = 1500,
    timeoutMs = 60000,
  } = opts;

  await sleep(initialDelayMs);

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await statusFn(taskId);

    if (result.status === "completed") {
      return result;
    }

    if (result.status === "failed") {
      throw new Error(
        result.errorMessage ?? "Task failed without an error message."
      );
    }

    await sleep(intervalMs);
  }

  return {
    taskId,
    status: "processing",
    imageUrls: [],
    prompt: "",
    credits: 0,
    createdAt: "",
    errorMessage: `Polling timed out after ${timeoutMs / 1000}s. Use check_task_status with task_id "${taskId}" to check later.`,
  };
}
