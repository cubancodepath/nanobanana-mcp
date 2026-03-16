import type { GenerationResult } from "../api/types.js";

export function formatResult(result: GenerationResult) {
  const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];

  if (result.text) {
    content.push({ type: "text" as const, text: result.text });
  }

  for (const image of result.images) {
    content.push({
      type: "image" as const,
      data: image.base64Data,
      mimeType: image.mimeType,
    });
  }

  if (content.length === 0) {
    content.push({ type: "text" as const, text: "No image or text was returned." });
  }

  return { content };
}
