import type { ParsedTaskResult } from "../api/types.js";

export function formatResult(result: ParsedTaskResult) {
  const lines: string[] = [];

  if (result.status === "completed") {
    lines.push("Image generated successfully.");
    if (result.prompt) lines.push(`\nPrompt: ${result.prompt}`);
    if (result.credits) lines.push(`Credits used: ${result.credits}`);
    lines.push(`\nImage URLs:`);
    for (const url of result.imageUrls) {
      lines.push(`- ${url}`);
    }
  } else if (result.status === "failed") {
    lines.push("Image generation failed.");
    if (result.errorMessage) lines.push(`Error: ${result.errorMessage}`);
  } else {
    lines.push("Task is still processing.");
    lines.push(`Task ID: ${result.taskId}`);
    if (result.errorMessage) lines.push(result.errorMessage);
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
