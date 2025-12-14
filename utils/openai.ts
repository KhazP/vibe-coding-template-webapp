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
 * Converts OpenAI error codes to short user-friendly messages.
 */
const getShortErrorMessage = (code: string, fullMessage?: string): string => {
    switch (code) {
        case 'insufficient_quota':
            return 'OpenAI quota exceeded. Please check your billing.';
        case 'invalid_api_key':
            return 'Invalid OpenAI API key.';
        case 'rate_limit_exceeded':
            return 'Rate limit exceeded. Please try again later.';
        case 'model_not_found':
            return 'Model not available. Check your API access.';
        case 'context_length_exceeded':
            return 'Input too long for this model.';
        case 'server_error':
            return 'OpenAI server error. Please retry.';
        default:
            // Truncate long messages
            const msg = fullMessage || 'Unknown error';
            return msg.length > 60 ? msg.substring(0, 57) + '...' : `OpenAI: ${msg}`;
    }
};

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
 * Streams text generation using OpenAI Responses API.
 * This is the recommended API for all new projects (replacing Chat Completions).
 * Used for standard artifacts (PRD, Tech, etc.) when OpenAI is the selected provider.
 * 
 * @param systemInstruction - System prompt (sent as 'instructions').
 * @param prompt - User prompt (sent as 'input').
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

    try {
        // Use the new Responses API format
        const response = await fetch(`${OPENAI_API_BASE}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                instructions: systemInstruction,
                input: prompt,
                stream: true
                // Note: temperature/top_p are not documented for Responses API
                // but may still work. Omitting for now to follow docs.
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
        let buffer = "";

        onStatusUpdate?.("Streaming Response...");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Append new data to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete events from buffer
            const lines = buffer.split('\n');
            // Keep the last potentially incomplete line in buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue; // Skip empty lines and comments

                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') continue;

                    try {
                        const event = JSON.parse(dataStr);

                        // Handle semantic streaming events from Responses API
                        // Event types: response.created, response.output_text.delta, response.completed, error, response.failed
                        if (event.type === 'response.output_text.delta') {
                            const delta = event.delta || '';
                            if (delta) {
                                if (isFirst) {
                                    isFirst = false;
                                    onStatusUpdate?.("Generating...");
                                }
                                fullText += delta;
                                onChunk(delta);
                            }
                        } else if (event.type === 'response.completed') {
                            // Response complete - we could extract final text here if needed
                            // but we've been accumulating it already
                        } else if (event.type === 'error') {
                            // Throw immediately - don't let this get caught by the parse error handler
                            const errorCode = event.error?.code || '';
                            const errorMsg = getShortErrorMessage(errorCode, event.error?.message);
                            console.error('OpenAI API Error:', event.error);
                            throw new Error(errorMsg);
                        } else if (event.type === 'response.failed') {
                            // Response failed event also contains error info
                            const errorCode = event.response?.error?.code || '';
                            const errorMsg = getShortErrorMessage(errorCode, event.response?.error?.message);
                            console.error('OpenAI Response Failed:', event.response?.error);
                            throw new Error(errorMsg);
                        }
                        // Ignore other event types like response.created, response.in_progress, etc.
                    } catch (e: any) {
                        // Re-throw actual errors, only ignore JSON parse errors
                        if (e.message?.startsWith('OpenAI')) {
                            throw e;
                        }
                        // Ignore parse errors for partial/malformed chunks
                    }
                } else if (line.startsWith('event: ')) {
                    // Some SSE implementations send separate event: lines
                    // We handle the data in the data: line, so we can skip this
                }
            }
        }

        // Process any remaining data in buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
            const dataStr = buffer.slice(6).trim();
            if (dataStr && dataStr !== '[DONE]') {
                try {
                    const event = JSON.parse(dataStr);
                    if (event.type === 'response.output_text.delta') {
                        const delta = event.delta || '';
                        if (delta) {
                            fullText += delta;
                            onChunk(delta);
                        }
                    }
                } catch (e) {
                    // Ignore
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
export interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

/**
 * Fetches available models from OpenAI API.
 * Filters for models that are likely chat/text generation models (gpt-*) to reduce noise.
 */
export const getOpenAIModels = async (apiKey: string): Promise<OpenAIModel[]> => {
    if (!apiKey) return [];

    try {
        const response = await fetch(`${OPENAI_API_BASE}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch OpenAI models: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const models = (data.data || []) as OpenAIModel[];

        // Filter for GPT models to keep the list relevant
        return models
            .filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
            .sort((a, b) => b.created - a.created); // Sort by newest first

    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
        return [];
    }
};
