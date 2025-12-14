

import { GoogleGenAI } from "@google/genai";
import { GroundingChunk, GeminiSettings } from "../types";
import { MODELS } from "./constants";

// --- Types for Interactions API (Deep Research) ---
// Matches official docs: https://ai.google.dev/gemini-api/docs/interactions

interface InteractionRequest {
  agent: string;
  input: string;
  background: boolean;
  agent_config?: {
    type: string;
    thinking_summaries?: string;
  };
  stream?: boolean;
}

interface InteractionResponse {
  name: string; // The resource name e.g., "interactions/123..."
  state: 'STATE_UNSPECIFIED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  error?: { message: string; code: number };
  // Docs specify interaction.outputs[-1].text
  outputs?: {
    content?: { parts: { text: string }[] };
  }[];
}

/**
 * Estimates token count based on character length.
 * Rough approximation: 4 chars ~= 1 token.
 */
export const estimateTokens = (text: string) => Math.ceil((text || '').length / 4);

/**
 * Accurately counts tokens using the Gemini API.
 * Returns estimated count if API call fails.
 */
export const getExactTokenCount = async (
  text: string,
  modelName: string,
  apiKey: string
): Promise<number> => {
  if (!text || !apiKey) return estimateTokens(text);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.countTokens({
      model: modelName,
      contents: text // Pass string directly to contents for simpler handling
    });

    // Safety check for response structure
    if (typeof response.totalTokens === 'number') {
      return response.totalTokens;
    }
    return estimateTokens(text);
  } catch (e) {
    console.warn("Token counting failed, falling back to estimation:", e);
    return estimateTokens(text);
  }
};

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

    // Auth errors should NOT be retried
    const isAuthError = error?.status === 400 || error?.status === 401 || error?.status === 403;

    if (retries === 0 || !isRetryable || isAuthError) {
      // Enhance error message if possible
      let enhancedMessage = error?.message || "Unknown error occurred during Gemini API call.";
      if (error?.status === 400) enhancedMessage = "Invalid request or API Key (400).";
      if (error?.status === 401) enhancedMessage = "Unauthorized. Please check your API key (401).";
      if (error?.status === 403) enhancedMessage = "Permission denied. Check API key scope (403).";
      if (error?.status === 429) enhancedMessage = "Quota exceeded. Please try again later.";

      console.error(`Gemini API Fatal Error: ${enhancedMessage}`, error);
      // Propagate error with original status attached for context handling
      const finalError: any = new Error(enhancedMessage);
      finalError.status = error?.status;
      throw finalError;
    }

    console.warn(`Gemini API Error (Retrying in ${baseDelay}ms...):`, error.message);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
    return retryWithBackoff(operation, retries - 1, baseDelay * 2);
  }
};

/**
 * Streams deep research content from Gemini, optionally using Google Search grounding.
 * This is the FALLBACK method using standard GenerateContent.
 * 
 * @param prompt - The user prompt for research.
 * @param settings - Gemini configuration settings.
 * @param apiKey - The Google API Key.
 * @param onChunk - Callback function triggered on each stream chunk.
 * @param onStatusUpdate - Callback for status messages (Thinking, Searching, etc).
 * @param signal - AbortSignal for cancellation.
 * @returns Object containing the full text and grounding sources.
 */
export const streamDeepResearch = async (
  prompt: string,
  settings: GeminiSettings,
  apiKey: string,
  onChunk: (text: string) => void,
  onStatusUpdate?: (status: string) => void,
  signal?: AbortSignal
): Promise<{ text: string; sources: GroundingChunk[] }> => {
  try {
    if (!apiKey) throw new Error("API Key is missing. Please provide a valid Gemini API Key.");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ai = new GoogleGenAI({ apiKey });

    let researchPrompt = `You are an expert product researcher and technical architect. 
Please conduct a deep research analysis based on the following request. 
Use Google Search to find real-time information, competitors, and technical tools.

REQUEST:
${prompt}`;

    if (settings.customInstructions) {
      researchPrompt += `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${settings.customInstructions}`;
    }

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

    // Determine initial status based on config
    if (settings.thinkingBudget > 0) {
      onStatusUpdate?.("Thinking (Deep Reasoning)...");
    } else if (settings.useGrounding) {
      onStatusUpdate?.("Searching Google (Grounding)...");
    } else {
      onStatusUpdate?.("Initializing AI...");
    }

    // Wrap the stream creation in retry logic
    const responseStream = await retryWithBackoff(() => ai.models.generateContentStream({
      model: settings.modelName,
      contents: researchPrompt,
      config: config,
    })) as any;

    let fullText = "";
    let finalSources: GroundingChunk[] = [];
    let isFirstChunk = true;

    for await (const chunk of responseStream) {
      // Check cancellation signal in the loop
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      if (isFirstChunk) {
        isFirstChunk = false;
        onStatusUpdate?.("Generating Report...");
      }

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
    throw error;
  }
};

/**
 * Runs deep research in a non-streaming fashion (awaits full completion).
 * Wrapper around `streamDeepResearch`.
 */
export const runDeepResearch = async (prompt: string, settings: GeminiSettings, apiKey: string): Promise<{ text: string; sources: GroundingChunk[] }> => {
  return streamDeepResearch(prompt, settings, apiKey, () => { });
};

/**
 * Executes a Deep Research Interaction via the SDK with Streaming.
 * Uses the stream=true option to get real-time thoughts and incremental text.
 * 
 * Docs: https://ai.google.dev/gemini-api/docs/deep-research
 */
export const runDeepResearchInteraction = async (
  prompt: string,
  apiKey: string,
  onChunk: (text: string) => void,
  onStatusUpdate?: (status: string) => void,
  signal?: AbortSignal,
  customInstructions?: string
): Promise<{ text: string; sources: GroundingChunk[] }> => {
  if (!apiKey) throw new Error("API Key is missing.");

  // Initialize Client (Standard SDK usage)
  const client = new GoogleGenAI({ apiKey });

  let finalInput = prompt;
  if (customInstructions) {
    finalInput += `\n\n(Global Instructions: ${customInstructions})`;
  }

  onStatusUpdate?.("Initializing Deep Research Agent...");

  try {
    // Start Streaming Interaction
    // Note: 'model' parameter is intentionally omitted as it conflicts with 'agent_config'
    const stream = await client.interactions.create({
      agent: MODELS.DEEP_RESEARCH,
      input: finalInput,
      background: true,
      stream: true,
      agent_config: {
        type: 'deep-research',
        thinking_summaries: 'auto'
      }
    });

    let fullText = "";
    let finalSources: GroundingChunk[] = [];
    let interactionId = "";

    // Iterate over the stream
    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      // Capture Interaction ID
      if (chunk.event_type === 'interaction.start') {
        interactionId = chunk.interaction?.id;
        console.log(`Interaction started: ${interactionId}`);
      }

      // Handle Content
      if (chunk.event_type === 'content.delta') {
        if (chunk.delta && 'text' in chunk.delta) {
          const textPart = chunk.delta.text;
          if (textPart) {
            fullText += textPart;
            onChunk(textPart);
          }
        } else if (chunk.delta && 'content' in chunk.delta) {
          // Fallback or specific thought handling if structure differs
          // For now, type guard prevents crash.
          // If thought_summary is in delta.content?
        }

        // Re-adding thought summary check if needed, but carefully typed.
        // The previous code checked chunk.delta?.type === 'thought_summary'
        // If TS says 'TextContent | ImageContent', then 'thought_summary' might not be on 'type'.
        // Let's rely on 'text' property existence for text.

        // For thought summaries:
        // SDK might type it differently. 
        // If the user hasn't seen thought summaries working, maybe we just fix the crash first.
        // But let's try to preserve logic if possible.

        if ((chunk.delta as any)?.type === 'thought_summary') {
          const thought = (chunk.delta as any).content?.text;
          if (thought) onStatusUpdate?.(`Thinking: ${thought}`);
        }
      }

      // Handle Completion
      else if (chunk.event_type === 'interaction.complete') {
        onStatusUpdate?.("Research Complete. Finalizing...");
      }

      // Handle Error Events
      else if (chunk.event_type === 'error') {
        throw new Error(`Deep Research Stream Error: ${chunk.error?.message}`);
      }
    }

    // Extraction Logic
    const extractedSources: GroundingChunk[] = [];
    const sourceRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;

    while ((match = sourceRegex.exec(fullText)) !== null) {
      const uri = match[2];
      if (!extractedSources.some(s => s.web?.uri === uri)) {
        extractedSources.push({
          web: { title: match[1], uri: uri }
        });
      }
    }

    return { text: fullText, sources: extractedSources };

  } catch (error: any) {
    // Reconnection logic could go here
    throw error;
  }
};

/**
 * Streams artifact generation (PRD, Tech Design, etc.) based on a system instruction.
 * 
 * @param systemInstruction - The persona/role definition for the AI.
 * @param prompt - The specific task or user input.
 * @param settings - Gemini configuration settings.
 * @param apiKey - The Google API Key.
 * @param onChunk - Callback function triggered on each stream chunk.
 * @param onStatusUpdate - Callback for status messages.
 * @param signal - AbortSignal for cancellation.
 * @returns The full generated text.
 */
export const streamArtifact = async (
  systemInstruction: string,
  prompt: string,
  settings: GeminiSettings,
  apiKey: string,
  onChunk: (text: string) => void,
  onStatusUpdate?: (status: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  try {
    if (!apiKey) throw new Error("API Key is missing. Please provide a valid Gemini API Key.");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const ai = new GoogleGenAI({ apiKey });

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

    if (settings.thinkingBudget > 0) {
      onStatusUpdate?.("Thinking (Deep Reasoning)...");
    } else if (settings.useGrounding) {
      onStatusUpdate?.("Accessing Knowledge Base...");
    } else {
      onStatusUpdate?.("Initializing AI...");
    }

    const responseStream = await retryWithBackoff(() => ai.models.generateContentStream({
      model: settings.modelName,
      contents: prompt,
      config: config
    })) as any;

    let fullText = "";
    let isFirstChunk = true;

    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      if (isFirstChunk) {
        isFirstChunk = false;
        onStatusUpdate?.("Streaming Response...");
      }

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
export const generateArtifact = async (systemInstruction: string, prompt: string, settings: GeminiSettings, apiKey: string): Promise<string> => {
  return streamArtifact(systemInstruction, prompt, settings, apiKey, () => { });
}

// ============================================================================
// DYNAMIC MODEL RETRIEVAL
// ============================================================================

export interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTemperature?: number;
}

export const getGeminiModels = async (apiKey: string): Promise<GeminiModel[]> => {
  if (!apiKey) return [];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      console.warn(`Failed to fetch Gemini models: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.models || []) as GeminiModel[];
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    return [];
  }
};
