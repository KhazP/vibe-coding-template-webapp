import { GroundingChunk, GeminiSettings } from "../types";

const OPENAI_API_BASE = 'https://api.openai.com/v1';

interface OpenAIResponse {
    output_text?: string;
    output?: any; // Can vary, but typically has message objects
    tools?: any[];
}

// Polling configuration for background mode
const POLLING_INTERVAL_MS = 5000; // 5 seconds between polls
const MAX_POLLING_DURATION_MS = 60 * 60 * 1000; // 60 minutes max (OpenAI limit)

/**
 * Parses OpenAI response data to extract text and sources.
 */
const parseOpenAIResponse = (data: any): { text: string; sources: GroundingChunk[] } => {
    let text = data.output_text || "";
    let sources: GroundingChunk[] = [];

    // Check for output_text first (simplest path from SDK)
    if (data.output_text) {
        text = data.output_text;
    }

    // If we have a list of outputs/events (raw API response)
    const outputItems = Array.isArray(data) ? data : (data.output || []);

    // Iterate to find the final message
    const messageItem = outputItems.find((item: any) => item.type === 'message');
    if (messageItem && messageItem.content) {
        const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
        if (textContent) {
            text = textContent.text || text;
            if (textContent.annotations) {
                textContent.annotations.forEach((ann: any) => {
                    if (ann.url && ann.title) {
                        sources.push({
                            web: {
                                uri: ann.url,
                                title: ann.title
                            }
                        });
                    }
                });
            }
        }
    } else {
        // Fallback: Parse markdown links [Title](url) from text
        const sourceRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;
        while ((match = sourceRegex.exec(text)) !== null) {
            const uri = match[2];
            if (!sources.some(s => s.web?.uri === uri)) {
                sources.push({
                    web: { title: match[1], uri: uri }
                });
            }
        }
    }

    return { text, sources };
};

/**
 * Polls for OpenAI response completion when using background mode.
 */
const pollForCompletion = async (
    responseId: string,
    apiKey: string,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
): Promise<any> => {
    const startTime = Date.now();
    let pollCount = 0;

    while (Date.now() - startTime < MAX_POLLING_DURATION_MS) {
        if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        pollCount++;
        const elapsedMins = Math.floor((Date.now() - startTime) / 60000);
        const elapsedSecs = Math.floor(((Date.now() - startTime) % 60000) / 1000);
        onStatusUpdate?.(`Agent researching... (${elapsedMins}m ${elapsedSecs}s elapsed)`);

        const pollResponse = await fetch(`${OPENAI_API_BASE}/responses/${responseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            signal: signal
        });

        if (!pollResponse.ok) {
            const errorData = await pollResponse.json().catch(() => ({}));
            throw new Error(`OpenAI Polling Error: ${errorData?.error?.message || pollResponse.statusText}`);
        }

        const data = await pollResponse.json();

        // Check status - OpenAI uses 'status' field for background responses
        // Possible values: 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
        if (data.status === 'completed') {
            onStatusUpdate?.("Research complete! Processing results...");
            return data;
        } else if (data.status === 'failed') {
            throw new Error(`OpenAI Deep Research failed: ${data.error?.message || 'Unknown error'}`);
        } else if (data.status === 'cancelled') {
            throw new DOMException("Research was cancelled", "AbortError");
        }

        // Still in progress - wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    throw new Error("OpenAI Deep Research timed out after 60 minutes");
};

/**
 * Runs OpenAI Deep Research using the Responses API with background mode.
 * Uses background=true for reliability and polls for completion.
 * 
 * @param prompt - The user prompt for research.
 * @param modelId - The OpenAI model ID (e.g., o3-deep-research).
 * @param apiKey - The OpenAI API Key.
 * @param onStatusUpdate - Callback for status messages.
 * @param signal - AbortSignal for cancellation.
 * @param customInstructions - Optional global instructions.
 */
export const runOpenAIDeepResearch = async (
    prompt: string,
    modelId: string,
    apiKey: string,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal,
    customInstructions?: string
): Promise<{ text: string; sources: GroundingChunk[] }> => {
    if (!apiKey) throw new Error("OpenAI API Key is missing.");

    onStatusUpdate?.("Initializing OpenAI Deep Research Agent...");

    // Construct the Tools payload
    const tools = [
        { type: "web_search_preview" }
        // file_search or code_interpreter can be added here if we support them later
    ];

    // Construct the Request Body with background=true for reliability
    // Per OpenAI docs: "Deep research requests can take a long time, so we recommend running them in background mode"
    const body: Record<string, any> = {
        model: modelId,
        input: prompt,
        tools: tools,
        background: true, // Critical: Enables async processing with polling
    };

    if (customInstructions) {
        body.instructions = customInstructions;
    }

    try {
        onStatusUpdate?.("Starting background research task...");

        // Initial request to start the research
        const response = await fetch(`${OPENAI_API_BASE}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${errorData?.error?.message || response.statusText}`);
        }

        const initialData: any = await response.json();

        // With background=true, the response contains an 'id' to poll
        const responseId = initialData.id;

        if (!responseId) {
            // Fallback: If no ID, the response might be synchronous (shouldn't happen with background=true)
            // Parse and return directly
            return parseOpenAIResponse(initialData);
        }

        onStatusUpdate?.("Agent is thinking & researching (this takes 2-10 mins)...");

        // Poll for completion
        const completedData = await pollForCompletion(responseId, apiKey, onStatusUpdate, signal);

        // Parse the completed response
        return parseOpenAIResponse(completedData);

    } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }
        throw error;
    }
};

/**
 * Streams text generation using OpenAI Chat Completions API.
 * Used for standard artifacts (PRD, Tech, etc.) when OpenAI is the selected provider.
 * 
 * @param systemInstruction - System prompt.
 * @param prompt - User prompt.
 * @param settings - Configuration settings (model, temp, etc.)
 * @param apiKey - OpenAI API Key.
 * @param onChunk - Callback for text chunks.
 * @param onStatusUpdate - Callback for status updates.
 * @param signal - AbortSignal.
 */
export const streamOpenAI = async (
    systemInstruction: string,
    prompt: string,
    settings: GeminiSettings,
    apiKey: string,
    onChunk: (text: string) => void,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    if (!apiKey) throw new Error("OpenAI API Key is missing.");

    onStatusUpdate?.("Initializing OpenAI...");

    const messages = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
    ];

    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                messages: messages,
                stream: true,
                temperature: settings.temperature,
                top_p: settings.topP,
                // max_tokens: settings.maxOutputTokens // Add if available in settings
            }),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${errorData?.error?.message || response.statusText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let isFirst = true;

        onStatusUpdate?.("Streaming Response...");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0]?.delta?.content;
                        if (content) {
                            if (isFirst) {
                                isFirst = false;
                                onStatusUpdate?.("Generating...");
                            }
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        return fullText;

    } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }
        throw error;
    }
};
