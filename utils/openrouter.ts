/**
 * OpenRouter Streaming Utility
 * 
 * Provides streaming text generation via OpenRouter's OpenAI-compatible API.
 * Handles SSE (Server-Sent Events) parsing with proper buffering, keep-alive
 * comment filtering, and mid-stream error handling.
 * 
 * @see https://openrouter.ai/docs/api/reference/streaming
 */

import { GeminiSettings } from "../types";
import { PROVIDERS } from "./providers";

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * Converts OpenRouter error codes to short, user-friendly messages.
 */
const getShortOpenRouterError = (code: string | number, fullMessage?: string): string => {
    const codeStr = String(code);

    switch (codeStr) {
        case '400':
            return 'Invalid request parameters';
        case '401':
            return 'Invalid API key';
        case '402':
            return 'Insufficient credits';
        case '403':
            return 'Access denied';
        case '404':
            return 'Model not found';
        case '429':
            return 'Rate limited - try again shortly';
        case '500':
        case '502':
        case '503':
            return 'Provider error - try again';
        case 'context_length_exceeded':
            return 'Prompt too long for model';
        case 'server_error':
            return 'Provider disconnected';
        default:
            // Return the full message if it's short enough, otherwise truncate
            if (fullMessage && fullMessage.length < 100) {
                return fullMessage;
            }
            return fullMessage?.slice(0, 80) + '...' || `Error: ${codeStr}`;
    }
};

/**
 * Streams text generation using OpenRouter's OpenAI-compatible Chat Completions API.
 * 
 * OpenRouter uses SSE (Server-Sent Events) with the format:
 * - `data: {"choices":[{"delta":{"content":"..."}}]}`
 * - `data: [DONE]` signals end of stream
 * - `: OPENROUTER PROCESSING` keep-alive comments (ignored)
 * 
 * @param systemInstruction - System prompt for the model.
 * @param prompt - User prompt.
 * @param settings - Configuration settings (model, temperature, etc.).
 * @param apiKey - OpenRouter API Key.
 * @param onChunk - Callback for each text chunk received.
 * @param onStatusUpdate - Optional callback for status updates.
 * @param signal - Optional AbortSignal for cancellation.
 * @returns The complete generated text.
 */
// Helper for exponential backoff with jitter
const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    onStatus: (msg: string) => void,
    retries = 3,
    baseDelay = 1000
): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            return await operation();
        } catch (error: any) {
            attempt++;
            if (attempt > retries) throw error;

            // Identify retryable errors
            const msg = error?.message || String(error);
            const isRetryable =
                msg.includes('429') ||
                msg.includes('502') ||
                msg.includes('503') ||
                msg.includes('Network error') ||
                msg.includes('Failed to fetch');

            if (!isRetryable) throw error;

            // Calculate delay: 2^attempt * baseDelay + jitter
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
            const jitter = delay * 0.25 * (Math.random() * 2 - 1);
            const finalDelay = Math.max(0, delay + jitter);

            onStatus(`Retry ${attempt}/${retries} in ${Math.round(finalDelay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
    }
};

export const streamOpenRouter = async (
    systemInstruction: string,
    prompt: string,
    settings: GeminiSettings,
    apiKey: string,
    onChunk: (text: string) => void,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    onStatusUpdate?.('Connecting to OpenRouter...');

    const provider = PROVIDERS.openrouter;
    const modelId = settings.modelName;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];

    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    // Build request body with all supported parameters
    const requestBody: Record<string, unknown> = {
        model: modelId,
        messages,
        stream: true,
        temperature: settings.temperature ?? 0.7,
    };

    // Apply optional parameters if they exist
    if (settings.maxOutputTokens) requestBody.max_tokens = settings.maxOutputTokens;
    if (settings.topP !== undefined) requestBody.top_p = settings.topP;
    if (settings.topK !== undefined) requestBody.top_k = settings.topK;
    if (settings.seed !== undefined) requestBody.seed = settings.seed;
    if (settings.stopSequences && settings.stopSequences.length > 0) {
        requestBody.stop = settings.stopSequences;
    }

    try {
        const response = await retryWithBackoff(async () => {
            const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
                method: 'POST',
                headers: provider.getHeaders(apiKey),
                body: JSON.stringify(requestBody),
                signal,
            });

            // Fast-fail on non-retryable errors
            if (res.status === 400 || res.status === 401 || res.status === 402 || res.status === 403 || res.status === 404) {
                const err = await res.json().catch(() => ({}));
                throw new Error(getShortOpenRouterError(res.status, err?.error?.message));
            }

            return res;
        }, (msg) => onStatusUpdate?.(msg));

        // Handle other pre-stream errors if they passed the retry check
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
            const errorCode = errorData?.error?.code || response.status;
            throw new Error(getShortOpenRouterError(errorCode, errorMessage));
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        onStatusUpdate?.('Generating...');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Append new chunk to buffer
                buffer += decoder.decode(value, { stream: true });

                // Process complete lines from buffer
                while (true) {
                    const lineEnd = buffer.indexOf('\n');
                    if (lineEnd === -1) break;

                    const line = buffer.slice(0, lineEnd).trim();
                    buffer = buffer.slice(lineEnd + 1);

                    // Skip empty lines
                    if (!line) continue;

                    // Ignore SSE comments (keep-alive signals like `: OPENROUTER PROCESSING`)
                    if (line.startsWith(':')) continue;

                    // Process data lines
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // Remove 'data: ' prefix

                        // Check for end of stream
                        if (data === '[DONE]') {
                            return fullText;
                        }

                        try {
                            const parsed = JSON.parse(data);

                            // Check for mid-stream errors
                            if (parsed.error) {
                                const errorCode = parsed.error.code || 'unknown';
                                const errorMessage = parsed.error.message || 'Stream error';
                                console.error('OpenRouter mid-stream error:', parsed.error);
                                throw new Error(getShortOpenRouterError(errorCode, errorMessage));
                            }

                            // Extract content from delta
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                fullText += content;
                                onChunk(content);
                            }

                            // Check for error finish_reason
                            const finishReason = parsed.choices?.[0]?.finish_reason;
                            if (finishReason === 'error') {
                                throw new Error('Generation terminated due to error');
                            }

                        } catch (parseError) {
                            // If it's our own error, rethrow it
                            if (parseError instanceof Error &&
                                (parseError.message.includes('error') ||
                                    parseError.message.includes('Error') ||
                                    parseError.message.includes('terminated'))) {
                                throw parseError;
                            }
                            // Otherwise ignore JSON parse errors (malformed chunks)
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } finally {
            reader.cancel().catch(() => { });
        }

        return fullText;

    } catch (error: unknown) {
        // Handle abort
        if (error instanceof Error) {
            if (error.name === 'AbortError' || signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
            }
        }

        // Check for network/CORS errors
        if (error instanceof Error &&
            (error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError'))) {
            throw new Error("Network error connecting to OpenRouter");
        }

        // Log full error for debugging
        console.error('OpenRouter API Error:', error);

        // Rethrow with user-friendly message if not already formatted
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown OpenRouter error');
    }
};
