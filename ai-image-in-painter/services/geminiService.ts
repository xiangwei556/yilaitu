
import { GoogleGenAI } from "@google/genai";

export const generateInpaint = async (
  baseImageBase64: string,
  doodleImageBase64: string,
  prompt: string
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImageBase64.split(',')[1],
              mimeType: 'image/png',
            },
          },
          {
            inlineData: {
              data: doodleImageBase64.split(',')[1],
              mimeType: 'image/png',
            },
          },
          {
            text: `I have provided an original image and a "mask" image (where the red/purple areas indicate regions to edit). Please redraw the parts of the original image that correspond to the mask based on this prompt: "${prompt}". Ensure the edit blends seamlessly with the original background. Return the modified image.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
