
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
  return streamDeepResearch(prompt, settings, apiKey, () => {});
};

/**
 * Executes a Deep Research Interaction via the REST API.
 * Uses the "Start + Poll" pattern required for Deep Research.
 * 
 * Docs: https://ai.google.dev/gemini-api/docs/deep-research
 */
export const runDeepResearchInteraction = async (
  prompt: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  signal?: AbortSignal
): Promise<{ text: string; sources: GroundingChunk[] }> => {
  if (!apiKey) throw new Error("API Key is missing.");
  
  // Endpoint matches Interactions API docs
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/interactions";

  // 1. Create Interaction
  onStatusUpdate?.("Initializing Deep Research Agent...");
  
  // Payload matches Deep Research docs: plain input string + background: true
  const payload: InteractionRequest = {
    agent: MODELS.DEEP_RESEARCH,
    input: prompt,
    background: true, 
  };

  // Outer Try/Catch for Creation Phase (Fail fast here is correct, as retry logic is inside fetch)
  let interactionName = "";
  try {
    const createRes = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!createRes.ok) {
       const err = await createRes.json().catch(() => ({}));
       
       // Handle 404 specifically for Fallback logic
       if (createRes.status === 404) {
           const error: any = new Error(`Deep Research Agent not found (404).`);
           error.status = 404;
           throw error;
       }
       
       throw new Error(`Deep Research Creation Failed: ${err?.error?.message || createRes.statusText}`);
    }

    const creationData: any = await createRes.json();
    interactionName = creationData.name; // e.g., "interactions/123..."

    if (!interactionName) {
        throw new Error("API did not return an interaction name.");
    }
  } catch (error: any) {
    throw error;
  }

  // 2. Poll for Completion (Long-running)
  onStatusUpdate?.("Agent is thinking & researching (this takes 2-5 mins)...");

  // Fix: Use Date.now() for timing instead of iteration counts to handle background throttling
  const startTime = Date.now();
  const maxDuration = 20 * 60 * 1000; // 20 minutes max duration
  const pollInterval = 10000; // 10s recommended by docs
  
  // Resiliency Counter
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  while (Date.now() - startTime < maxDuration) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      
      try {
          // GET interaction to check status
          const pollRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${interactionName}?key=${apiKey}`, {
              signal
          });
          
          if (!pollRes.ok) {
              // Treat server errors as transient failures inside the loop
              throw new Error(`Server returned ${pollRes.status}`);
          }

          const pollData: InteractionResponse = await pollRes.json();
          
          // Reset consecutive failure counter on success
          consecutiveFailures = 0;
          
          // Check Status
          if (pollData.state === 'SUCCEEDED') {
              // 3. Extract Output
              let text = '';
              
              // Check outputs array (Standard API behavior)
              const lastOutput = pollData.outputs?.[(pollData.outputs?.length || 1) - 1];
              
              if (lastOutput?.content?.parts) {
                  text = lastOutput.content.parts.map(p => p.text).join('');
              } else {
                  // Fallback debugging
                  text = JSON.stringify(pollData, null, 2);
              }
              
              // Deep Research embeds sources in the text. We extract them via regex for the UI.
              const extractedSources: GroundingChunk[] = [];
              const sourceRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
              let match;
              
              while ((match = sourceRegex.exec(text)) !== null) {
                  // Avoid duplicates based on URL
                  const uri = match[2];
                  if (!extractedSources.some(s => s.web?.uri === uri)) {
                      extractedSources.push({
                          web: { title: match[1], uri: uri }
                      });
                  }
              }

              return { text, sources: extractedSources };
              
          } else if (pollData.state === 'FAILED') {
              throw new Error(`Deep Research Failed: ${pollData.error?.message || 'Unknown error'}`);
          }

          // Processing / Unspecified -> Wait and Loop
          const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
          onStatusUpdate?.(`Researching... (${elapsedMinutes}m elapsed)`);

      } catch (pollError: any) {
          // Immediately propagate explicit aborts
          if (pollError.name === 'AbortError' || signal?.aborted) {
              throw new DOMException("Aborted", "AbortError");
          }

          consecutiveFailures++;
          console.warn(`Polling attempt failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, pollError.message);

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              throw new Error(`Deep Research Connection Lost: ${pollError.message}. The agent may still be running remotely, but local monitoring has stopped.`);
          }
          // Fall through to the wait logic below to retry
      }
      
      await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error("Deep Research timed out.");
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
     return streamArtifact(systemInstruction, prompt, settings, apiKey, () => {});
}
