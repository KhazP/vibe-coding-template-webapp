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
            throw new Error("Anthropic API CORS error. If your organization has CORS disabled, use OpenRouter for Claude access instead.");
        }

        // Include request_id if available for debugging
        const requestId = error?.request_id || error?.headers?.get?.('x-request-id') || 'unknown';
        throw new Error(`Anthropic API Error (request_id: ${requestId}): ${error.message}`);
    }
};
