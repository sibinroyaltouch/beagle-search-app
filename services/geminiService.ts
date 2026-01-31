
import { GoogleGenAI, Type } from "@google/genai";
import { CompanyInfo } from "../types";

const MAX_RETRIES = 3;

/**
 * Helper to handle retries with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      const delay = Math.pow(2, MAX_RETRIES - retries + 1) * 1000;
      console.warn(`API error (${error.status}). Retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export const searchCompanies = async (
  query: string, 
  existingNames: string[] = []
): Promise<CompanyInfo[]> => {
  const ai = new GoogleGenAI({ apiKey: 'AIzaSyChCya7k76mvYmdP47AOUmVMpgDPfAkSWI'});
  
  const avoidanceInstruction = existingNames.length > 0 
    ? `IMPORTANT: I have already found the following companies: ${existingNames.join(', ')}. Please find DIFFERENT and NEW companies related to the query. Do not repeat these.`
    : "";

  const prompt = `
    Perform an exhaustive search for companies using the context of the Programmable Search Engine.
    Search query: "${query}".
    
    Task: Find a high-quality list of companies matching this query. 
    ${avoidanceInstruction}
    
    Focus on finding accurate information. Verify the website and LinkedIn URLs are correct.
    Aim for 15-20 new results if they exist.
    
    For each company, provide:
    - Company Name
    - Website URL (must be valid)
    - LinkedIn URL (must be valid)
    - Country
    - State (if available, else N/A)
    - Industry
    
    If details are missing, use "N/A".
    Return a JSON object with a "companies" array.
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 }, // Allocate budget for high-quality reasoning
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  website: { type: Type.STRING },
                  linkedin: { type: Type.STRING },
                  country: { type: Type.STRING },
                  state: { type: Type.STRING },
                  industry: { type: Type.STRING },
                },
                required: ["name", "website", "linkedin", "country", "state", "industry"],
              },
            },
          },
          required: ["companies"],
        },
      },
    });

    const jsonStr = response.text || '{"companies": []}';
    const parsed = JSON.parse(jsonStr);
    return parsed.companies || [];
  });
};
