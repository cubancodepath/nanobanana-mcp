// --- Request types ---

export interface ContentPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

export interface GenerateContentRequest {
  contents: {
    parts: ContentPart[];
  }[];
  generationConfig?: {
    responseModalities?: string[];
    imageConfig?: {
      aspectRatio?: string;
      imageSize?: string;
    };
  };
}

// --- Response types ---

export interface InlineData {
  mimeType: string;
  data: string;
}

export interface ResponsePart {
  text?: string;
  inlineData?: InlineData;
}

export interface GenerateContentResponse {
  candidates?: {
    content: {
      parts: ResponsePart[];
    };
  }[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export interface GeneratedImage {
  mimeType: string;
  base64Data: string;
}

export interface GenerationResult {
  text?: string;
  images: GeneratedImage[];
}
