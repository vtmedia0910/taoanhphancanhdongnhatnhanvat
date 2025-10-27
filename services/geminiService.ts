import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse, Part } from "@google/genai";

// Utility to convert a data URL to a base64 string and mimeType
const dataUrlToInfo = (dataUrl: string): { base64: string; mimeType: string } | null => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

export const generateImage = async (
  prompt: string,
  characterImages: string[],
  apiKey: string,
  aspectRatioHint: 'landscape' | 'portrait' | 'square' = 'square'
): Promise<string> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please enter and save your API key.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    let finalPrompt = prompt;
    // Be more specific with the prompt to better guide the model.
    if (aspectRatioHint === 'landscape') {
        finalPrompt += ', landscape orientation, wide aspect ratio';
    } else if (aspectRatioHint === 'portrait') {
        finalPrompt += ', portrait orientation, tall aspect ratio';
    } else {
        finalPrompt += ', square aspect ratio';
    }


    const parts: Part[] = [{ text: finalPrompt }];

    for (const characterImage of characterImages) {
        const imageInfo = dataUrlToInfo(characterImage);
        if (imageInfo) {
          parts.unshift({
            inlineData: {
              data: imageInfo.base64,
              mimeType: imageInfo.mimeType,
            },
          });
        }
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image was generated.");

  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("Your API Key is not valid. Please check and save it again.");
    }
    throw new Error("Failed to generate image. Please check the console for details.");
  }
};
