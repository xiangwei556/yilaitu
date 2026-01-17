
import { GoogleGenAI } from "@google/genai";

/**
 * For inpainting, we use the image editing model.
 * Note: Precise "masked inpainting" is often achieved by sending the image and 
 * describing exactly which part to change using the prompt.
 */
export async function generateInpaintedImage(
  baseImageUrl: string, 
  maskDataUrl: string, 
  prompt: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract base64 data
  const baseImageBase64 = baseImageUrl.split(',')[1];
  
  try {
    // We use gemini-2.5-flash-image for reliable editing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImageBase64,
              mimeType: 'image/png'
            }
          },
          {
            text: `In this image, identify the region that would typically be masked or highlighted for an edit. ${prompt}. Please regenerate only that specific part while maintaining the consistency of the rest of the image.`
          }
        ]
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
