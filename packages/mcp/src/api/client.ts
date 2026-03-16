import type {
  ContentPart,
  GenerateContentRequest,
  GenerateContentResponse,
  GenerationResult,
} from "./types.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const MODELS = {
  flash: "gemini-3.1-flash-image-preview",
  pro: "gemini-3-pro-image-preview",
} as const;

export type ModelId = keyof typeof MODELS;

export class NanoBananaClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(opts: {
    prompt: string;
    model?: ModelId;
    aspectRatio?: string;
    imageSize?: string;
  }): Promise<GenerationResult> {
    const parts: ContentPart[] = [{ text: opts.prompt }];
    return this.generate(parts, opts.model, opts.aspectRatio, opts.imageSize);
  }

  async editImage(opts: {
    prompt: string;
    imageBase64: string;
    imageMimeType: string;
    model?: ModelId;
    aspectRatio?: string;
    imageSize?: string;
  }): Promise<GenerationResult> {
    const parts: ContentPart[] = [
      { text: opts.prompt },
      {
        inline_data: {
          mime_type: opts.imageMimeType,
          data: opts.imageBase64,
        },
      },
    ];
    return this.generate(parts, opts.model, opts.aspectRatio, opts.imageSize);
  }

  private async generate(
    parts: ContentPart[],
    model: ModelId = "flash",
    aspectRatio?: string,
    imageSize?: string
  ): Promise<GenerationResult> {
    const modelName = MODELS[model];
    const url = `${BASE_URL}/models/${modelName}:generateContent`;

    const body: GenerateContentRequest = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        ...(aspectRatio || imageSize
          ? {
              imageConfig: {
                ...(aspectRatio && { aspectRatio }),
                ...(imageSize && { imageSize }),
              },
            }
          : {}),
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as GenerateContentResponse;

    if (json.error) {
      throw new Error(`API error ${json.error.code}: ${json.error.message}`);
    }

    if (!json.candidates?.length) {
      throw new Error("No candidates returned in the response.");
    }

    const responseParts = json.candidates[0].content.parts;
    const result: GenerationResult = { images: [] };

    for (const part of responseParts) {
      if (part.text) {
        result.text = (result.text ?? "") + part.text;
      }
      if (part.inlineData) {
        result.images.push({
          mimeType: part.inlineData.mimeType,
          base64Data: part.inlineData.data,
        });
      }
    }

    return result;
  }
}
