/**
 * Anthropic (Claude) API Utilities
 * 
 * Uses the official @anthropic-ai/sdk with dangerouslyAllowBrowser 
 * to enable browser-based API calls with proper CORS handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeminiSettings } from "../types";
import { getModelById } from "./modelUtils";

/**
 * Converts Anthropic errors to short user-friendly messages.
 */
const getShortAnthropicError = (error: any): string => {
    // Try to extract error type from the error object
    let errorType = error?.error?.type || error?.type || '';
    let message = error?.error?.message || error?.message || '';

    // Handle SDK errors where message is "400 {json}" format
    if (message && typeof message === 'string') {
        const jsonMatch = message.match(/^\d{3}\s*(\{.+\})$/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                errorType = parsed?.error?.type || errorType;
                message = parsed?.error?.message || message;
            } catch (e) {
                // Ignore parse errors
            }
        }
    }

    switch (errorType) {
        case 'invalid_request_error':
            if (message.includes('balance is too low') || message.includes('credit')) {
                return 'Anthropic balance too low. Please add credits.';
            }
            return 'Invalid request to Anthropic API.';
        case 'authentication_error':
            return 'Invalid Anthropic API key.';
        case 'permission_error':
            return 'Permission denied. Check your API access.';
        case 'rate_limit_error':
            return 'Rate limit exceeded. Please try again.';
        case 'api_error':
            return 'Anthropic server error. Please retry.';
        case 'overloaded_error':
            return 'Anthropic API overloaded. Try again later.';
        default:
            // Truncate long messages
            const shortMsg = message.length > 60 ? message.substring(0, 57) + '...' : message;
            return shortMsg || 'Anthropic API error';
    }
};

/**
 * Streams text generation using Anthropic Messages API via official SDK.
 * Uses dangerouslyAllowBrowser: true to enable browser CORS.
 * 
 * Note: This exposes API key to browser. For production, consider a backend proxy.
 * 
 * @param systemInstruction - System prompt.
 * @param prompt - User prompt.
 * @param settings - Configuration settings (model, temp, etc.)
 * @param apiKey - Anthropic API Key.
 * @param onChunk - Callback for text chunks.
 * @param onStatusUpdate - Callback for status updates.
 * @param signal - AbortSignal.
 */
export const streamAnthropic = async (
    systemInstruction: string,
    prompt: string,
    settings: GeminiSettings,
    apiKey: string,
    onChunk: (text: string) => void,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    if (!apiKey) throw new Error("Anthropic API Key is missing.");

    onStatusUpdate?.("Initializing Claude...");

    // Initialize client with browser mode enabled
    const client = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });

    // Get max_tokens from model config, with sensible default
    const modelConfig = getModelById(settings.modelName);
    const maxTokens = modelConfig?.outputContextLimit || 16384;

    try {
        let fullText = "";
        let isFirst = true;

        onStatusUpdate?.("Streaming Response...");

        // Use the SDK's streaming method
        const stream = await client.messages.stream({
            model: settings.modelName,
            max_tokens: maxTokens,
            system: systemInstruction,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: settings.temperature,
            top_p: settings.topP,
        });

        // Handle streaming events
        for await (const event of stream) {
            // Check for abort
            if (signal?.aborted) {
                stream.controller.abort();
                throw new DOMException("Aborted", "AbortError");
            }

            if (event.type === 'content_block_delta') {
                const delta = event.delta as { type: string; text?: string };
                if (delta.type === 'text_delta' && delta.text) {
                    if (isFirst) {
                        isFirst = false;
                        onStatusUpdate?.("Generating...");
                    }
                    fullText += delta.text;
                    onChunk(delta.text);
                }
            }
        }

        // Get final message for usage tracking
        const finalMessage = await stream.finalMessage();
        // Could extract finalMessage.usage for cost tracking

        return fullText;

    } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        // Check for CORS errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            throw new Error("Anthropic CORS error. Use OpenRouter instead.");
        }

        // Log full error for debugging
        console.error('Anthropic API Error:', error);

        // Throw user-friendly error
        throw new Error(getShortAnthropicError(error));
    }
};
