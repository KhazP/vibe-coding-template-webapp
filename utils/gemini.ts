
import { GoogleGenAI } from "@google/genai";
import { GroundingChunk, GeminiSettings } from "../types";

/**
 * Retries an asynchronous operation with exponential backoff.
 * 
 * @param operation - The async function to retry.
 * @param retries - Number of retry attempts.
 * @param baseDelay - Initial delay in milliseconds.
 */
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Check if error is retryable (rate limits, server errors, network issues)
    const isRetryable = 
        error?.status === 429 || 
        error?.status >= 500 || 
        error?.message?.includes('fetch') || 
        error?.message?.includes('network') ||
        error?.message?.includes('overloaded') ||
        error?.message?.includes('aborted');
    
    if (retries === 0 || !isRetryable) {
      // Enhance error message if possible
      let enhancedMessage = error?.message || "Unknown error occurred during Gemini API call.";
      if (error?.status === 400) enhancedMessage = "Invalid request. Please check your prompt or settings.";
      if (error?.status === 401) enhancedMessage = "Unauthorized. Please check your API key.";
      if (error?.status === 429) enhancedMessage = "Quota exceeded. Please try again later.";
      
      console.error(`Gemini API Fatal Error: ${enhancedMessage}`, error);
      throw new Error(enhancedMessage);
    }

    console.warn(`Gemini API Error (Retrying in ${baseDelay}ms...):`, error.message);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    return retryWithBackoff(operation, retries - 1, baseDelay * 2);
  }
};

/**
 * Streams deep research content from Gemini, optionally using Google Search grounding.
 * 
 * @param prompt - The user prompt for research.
 * @param settings - Gemini configuration settings.
 * @param onChunk - Callback function triggered on each stream chunk.
 * @returns Object containing the full text and grounding sources.
 */
export const streamDeepResearch = async (
  prompt: string, 
  settings: GeminiSettings,
  onChunk: (text: string) => void
): Promise<{ text: string; sources: GroundingChunk[] }> => {
  try {
    // Initialize Gemini API with environment variable inside the function to avoid crash on load
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const researchPrompt = `You are an expert product researcher and technical architect. 
Please conduct a deep research analysis based on the following request. 
Use Google Search to find real-time information, competitors, and technical tools.

REQUEST:
${prompt}`;

    const tools: any[] = [];
    if (settings.useGrounding) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
      temperature: settings.temperature,
      topK: settings.topK,
      topP: settings.topP,
    };

    if (settings.thinkingBudget > 0) {
      config.thinkingConfig = {
        thinkingBudget: settings.thinkingBudget
      };
    }

    // Wrap the stream creation in retry logic
    const responseStream = await retryWithBackoff(() => ai.models.generateContentStream({
      model: settings.modelName,
      contents: researchPrompt,
      config: config,
    }));

    let fullText = "";
    let finalSources: GroundingChunk[] = [];

    for await (const chunk of responseStream) {
       const textPart = chunk.text;
       if (textPart) {
         fullText += textPart;
         onChunk(textPart);
       }
       
       // Capture grounding metadata if available in the chunk
       if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
         finalSources = chunk.candidates[0].groundingMetadata.groundingChunks;
       }
    }

    return { text: fullText, sources: finalSources };
  } catch (error) {
    // Re-throw to be caught by the calling component's toast handler
    throw error;
  }
};

/**
 * Runs deep research in a non-streaming fashion (awaits full completion).
 * Wrapper around `streamDeepResearch`.
 */
export const runDeepResearch = async (prompt: string, settings: GeminiSettings): Promise<{ text: string; sources: GroundingChunk[] }> => {
  return streamDeepResearch(prompt, settings, () => {});
};

/**
 * Streams artifact generation (PRD, Tech Design, etc.) based on a system instruction.
 * 
 * @param systemInstruction - The persona/role definition for the AI.
 * @param prompt - The specific task or user input.
 * @param settings - Gemini configuration settings.
 * @param onChunk - Callback function triggered on each stream chunk.
 * @returns The full generated text.
 */
export const streamArtifact = async (
  systemInstruction: string, 
  prompt: string, 
  settings: GeminiSettings,
  onChunk: (text: string) => void
): Promise<string> => {
    try {
        // Initialize Gemini API with environment variable inside the function to avoid crash on load
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const tools: any[] = [];
        if (settings.useGrounding) {
            tools.push({ googleSearch: {} });
        }

        const config: any = {
            systemInstruction: systemInstruction,
            tools: tools.length > 0 ? tools : undefined,
            temperature: settings.temperature,
            topK: settings.topK,
            topP: settings.topP,
        };

        if (settings.thinkingBudget > 0) {
            config.thinkingConfig = {
                thinkingBudget: settings.thinkingBudget
            };
        }

        const responseStream = await retryWithBackoff(() => ai.models.generateContentStream({
            model: settings.modelName,
            contents: prompt,
            config: config
        }));

        let fullText = "";
        for await (const chunk of responseStream) {
            const textPart = chunk.text;
            if (textPart) {
                fullText += textPart;
                onChunk(textPart);
            }
        }
        return fullText || "No content generated.";
    } catch (error) {
        throw error;
    }
}

/**
 * Generates an artifact in a non-streaming fashion.
 * Wrapper around `streamArtifact`.
 */
export const generateArtifact = async (systemInstruction: string, prompt: string, settings: GeminiSettings): Promise<string> => {
     return streamArtifact(systemInstruction, prompt, settings, () => {});
}
