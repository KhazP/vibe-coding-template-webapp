/**
 * Multi-Provider API Configuration
 * 
 * Defines the registry of supported AI providers with their authentication
 * requirements, endpoints, and configuration.
 */

import type { ProviderCapabilities, GeminiSafetyPreset } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface ProviderConfig {
    id: ProviderId;
    displayName: string;
    envVar: string;              // Environment variable name (for server-side)
    storageKey: string;          // localStorage key (for client-side)
    baseURL: string;
    getHeaders: (apiKey: string) => Record<string, string>;
    keyPrefix?: string;          // For validation (e.g., 'sk-' for OpenAI)
    keyMinLength?: number;       // Minimum key length for validation
    keyPlaceholder: string;
    docsUrl: string;
    getKeyUrl: string;           // URL to create/manage API keys
    logoPath: string;            // Path to logo in public/providers
    enabled: boolean;
    defaultModels: string[];
    capabilities: ProviderCapabilities;  // Expert settings capability flags
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface SendChatOptions {
    providerId: ProviderId;
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    signal?: AbortSignal;
    // Expert settings (v1)
    stopSequences?: string[];
    seed?: number;
    safetyPreset?: GeminiSafetyPreset;  // Gemini only
}

export interface SendChatResult {
    text: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
    gemini: {
        id: 'gemini',
        displayName: 'Google Gemini',
        envVar: 'GEMINI_API_KEY',
        storageKey: 'VIBE_GEMINI_API_KEY',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        getHeaders: () => ({
            'Content-Type': 'application/json',
        }),
        keyPrefix: 'AIza',
        keyMinLength: 35,
        keyPlaceholder: 'Paste key (starts with AIza...)',
        docsUrl: 'https://ai.google.dev/docs',
        getKeyUrl: 'https://aistudio.google.com/app/apikey',
        logoPath: '/providers/gemini.svg',
        enabled: true,
        defaultModels: ['gemini-3-pro', 'gemini-2.5-pro', 'gemini-2.5-flash'],
        capabilities: {
            supportsMaxTokens: true,
            supportsStop: true,
            supportsSeed: false,  // Gemini doesn't support seed
            supportsSafety: true,
        },
    },

    openai: {
        id: 'openai',
        displayName: 'OpenAI',
        envVar: 'OPENAI_API_KEY',
        storageKey: 'VIBE_OPENAI_API_KEY',
        baseURL: 'https://api.openai.com/v1',
        getHeaders: (apiKey: string) => ({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        }),
        keyPrefix: 'sk-',
        keyMinLength: 20,
        keyPlaceholder: 'Paste key (starts with sk-...)',
        docsUrl: 'https://platform.openai.com/docs',
        getKeyUrl: 'https://platform.openai.com/api-keys',
        logoPath: '/providers/openai.svg',
        enabled: true,
        defaultModels: ['gpt-5.2-2025-12-11', 'gpt-5.2-pro-2025-12-11', 'gpt-5.2-chat-latest', 'gpt-5-mini'],
        capabilities: {
            supportsMaxTokens: true,
            supportsStop: true,
            supportsSeed: true,
        },
    },

    anthropic: {
        id: 'anthropic',
        displayName: 'Anthropic (Claude)',
        envVar: 'ANTHROPIC_API_KEY',
        storageKey: 'VIBE_ANTHROPIC_API_KEY',
        baseURL: 'https://api.anthropic.com/v1',
        getHeaders: (apiKey: string) => ({
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        }),
        keyPrefix: 'sk-ant-',
        keyMinLength: 20,
        keyPlaceholder: 'Paste key (starts with sk-ant-...)',
        docsUrl: 'https://docs.anthropic.com',
        getKeyUrl: 'https://console.anthropic.com/settings/keys',
        logoPath: '/providers/claude.svg',
        enabled: true,
        defaultModels: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101', 'claude-haiku-4-5-20251001'],
        capabilities: {
            supportsMaxTokens: true,
            supportsStop: true,
            supportsSeed: false,  // Claude doesn't support seed
        },
    },

    openrouter: {
        id: 'openrouter',
        displayName: 'OpenRouter',
        envVar: 'OPENROUTER_API_KEY',
        storageKey: 'VIBE_OPENROUTER_API_KEY',
        baseURL: 'https://openrouter.ai/api/v1',
        getHeaders: (apiKey: string) => ({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vibe-coding-workflow.app',
            'X-Title': 'Vibe-Coding Workflow',
        }),
        keyPrefix: 'sk-or-',
        keyMinLength: 20,
        keyPlaceholder: 'Paste key (starts with sk-or-...)',
        docsUrl: 'https://openrouter.ai/docs',
        getKeyUrl: 'https://openrouter.ai/keys',
        logoPath: '/providers/openrouter.svg',
        enabled: true,
        defaultModels: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro-preview'],
        capabilities: {
            supportsMaxTokens: true,
            supportsStop: true,
            supportsSeed: true,  // OpenRouter passes through to underlying model
        },
    },
};

// ============================================================================
// GEMINI SAFETY PRESET MAPPING
// ============================================================================

type GeminiHarmCategory =
    | 'HARM_CATEGORY_HARASSMENT'
    | 'HARM_CATEGORY_HATE_SPEECH'
    | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    | 'HARM_CATEGORY_DANGEROUS_CONTENT';

type GeminiBlockThreshold =
    | 'BLOCK_NONE'
    | 'BLOCK_ONLY_HIGH'
    | 'BLOCK_MEDIUM_AND_ABOVE'
    | 'BLOCK_LOW_AND_ABOVE';

interface GeminiSafetySettingItem {
    category: GeminiHarmCategory;
    threshold: GeminiBlockThreshold;
}

/**
 * Map safety preset to Gemini API safety_settings format
 */
const mapGeminiSafetyPreset = (preset: GeminiSafetyPreset): GeminiSafetySettingItem[] => {
    const categories: GeminiHarmCategory[] = [
        'HARM_CATEGORY_HARASSMENT',
        'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT',
    ];

    let threshold: GeminiBlockThreshold;
    switch (preset) {
        case 'relaxed':
            threshold = 'BLOCK_NONE';
            break;
        case 'balanced':
            threshold = 'BLOCK_MEDIUM_AND_ABOVE';
            break;
        case 'strict':
            threshold = 'BLOCK_LOW_AND_ABOVE';
            break;
        default:
            // 'default' should not call this function, but handle gracefully
            threshold = 'BLOCK_MEDIUM_AND_ABOVE';
    }

    return categories.map(category => ({ category, threshold }));
};
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all enabled providers
 */
export const getEnabledProviders = (): ProviderConfig[] => {
    return Object.values(PROVIDERS).filter(p => p.enabled);
};

/**
 * Get provider by ID (throws if not found)
 */
export const getProvider = (id: ProviderId): ProviderConfig => {
    const provider = PROVIDERS[id];
    if (!provider) {
        throw new Error(`Unknown provider: ${id}`);
    }
    return provider;
};

/**
 * Validate API key format based on provider configuration
 */
export const validateKeyFormat = (providerId: ProviderId, key: string): boolean => {
    const provider = PROVIDERS[providerId];
    if (!provider) return false;

    const trimmedKey = key.trim();

    // Check minimum length
    if (provider.keyMinLength && trimmedKey.length < provider.keyMinLength) {
        return false;
    }

    // Check prefix
    if (provider.keyPrefix && !trimmedKey.startsWith(provider.keyPrefix)) {
        return false;
    }

    return true;
};

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Test provider connection with a minimal API call
 */
export const testProviderConnection = async (
    providerId: ProviderId,
    apiKey: string
): Promise<{ success: boolean; error?: string }> => {
    const provider = PROVIDERS[providerId];
    if (!provider) {
        return { success: false, error: 'Unknown provider' };
    }

    try {
        switch (providerId) {
            case 'gemini': {
                // Use a minimal generateContent call
                const response = await fetch(
                    `${provider.baseURL}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: provider.getHeaders(apiKey),
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'test' }] }],
                        }),
                    }
                );
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error?.message || `HTTP ${response.status}`);
                }
                return { success: true };
            }

            case 'openai': {
                // Use models list endpoint (cheap/free)
                const response = await fetch(`${provider.baseURL}/models`, {
                    headers: provider.getHeaders(apiKey),
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error?.message || `HTTP ${response.status}`);
                }
                return { success: true };
            }

            case 'anthropic': {
                // Anthropic doesn't support CORS for browser requests
                // We can only validate the key format, not test the connection
                // Real validation happens on first actual API call
                if (!validateKeyFormat('anthropic', apiKey)) {
                    return { success: false, error: 'Invalid key format. Anthropic keys start with sk-ant-' };
                }
                // Return success based on format validation only
                // Note: Actual key validity will be checked on first generation request
                return { success: true };
            }

            case 'openrouter': {
                // Use models list endpoint (free)
                const response = await fetch(`${provider.baseURL}/models`, {
                    headers: provider.getHeaders(apiKey),
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error?.message || `HTTP ${response.status}`);
                }
                return { success: true };
            }

            default:
                return { success: false, error: 'Provider not supported for testing' };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Connection failed'
        };
    }
};

/**
 * Send a chat completion request to any supported provider
 */
export const sendChat = async (options: SendChatOptions): Promise<SendChatResult> => {
    const {
        providerId,
        messages,
        model,
        temperature = 0.7,
        maxTokens,
        stream = false,
        signal,
        // Expert settings (v1)
        stopSequences,
        seed,
        safetyPreset,
    } = options;

    const provider = PROVIDERS[providerId];
    if (!provider) {
        throw new Error(`Unknown provider: ${providerId}`);
    }

    // Get API key from storage
    const apiKey = localStorage.getItem(provider.storageKey);
    if (!apiKey) {
        throw new Error(`No API key configured for ${provider.displayName}`);
    }

    const selectedModel = model || provider.defaultModels[0];

    switch (providerId) {
        case 'gemini': {
            // Gemini uses a different API structure
            const geminiMessages = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));

            const response = await fetch(
                `${provider.baseURL}/models/${selectedModel}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: provider.getHeaders(apiKey),
                    body: JSON.stringify({
                        contents: geminiMessages,
                        generationConfig: {
                            temperature,
                            maxOutputTokens: maxTokens,
                            ...(stopSequences?.length && { stopSequences }),
                        },
                        // Safety settings mapped from preset
                        ...(safetyPreset && safetyPreset !== 'default' && {
                            safetySettings: mapGeminiSafetyPreset(safetyPreset),
                        }),
                    }),
                    signal,
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return {
                text,
                model: selectedModel,
                usage: data?.usageMetadata ? {
                    promptTokens: data.usageMetadata.promptTokenCount || 0,
                    completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                    totalTokens: data.usageMetadata.totalTokenCount || 0,
                } : undefined,
            };
        }

        case 'openai':
        case 'openrouter': {
            // OpenAI-compatible API (also works for OpenRouter)
            const response = await fetch(`${provider.baseURL}/chat/completions`, {
                method: 'POST',
                headers: provider.getHeaders(apiKey),
                body: JSON.stringify({
                    model: selectedModel,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    temperature,
                    max_tokens: maxTokens,
                    stream,
                    // Expert settings
                    ...(stopSequences?.length && { stop: stopSequences }),
                    ...(seed !== undefined && { seed }),
                }),
                signal,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content || '';

            return {
                text,
                model: data?.model || selectedModel,
                usage: data?.usage ? {
                    promptTokens: data.usage.prompt_tokens || 0,
                    completionTokens: data.usage.completion_tokens || 0,
                    totalTokens: data.usage.total_tokens || 0,
                } : undefined,
            };
        }

        case 'anthropic': {
            // Anthropic Messages API
            const systemMessage = messages.find(m => m.role === 'system');
            const nonSystemMessages = messages.filter(m => m.role !== 'system');

            const response = await fetch(`${provider.baseURL}/messages`, {
                method: 'POST',
                headers: provider.getHeaders(apiKey),
                body: JSON.stringify({
                    model: selectedModel,
                    max_tokens: maxTokens || 4096,
                    system: systemMessage?.content,
                    messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
                    temperature,
                    // Expert settings (Claude uses stop_sequences)
                    ...(stopSequences?.length && { stop_sequences: stopSequences }),
                }),
                signal,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data?.content?.[0]?.text || '';

            return {
                text,
                model: data?.model || selectedModel,
                usage: data?.usage ? {
                    promptTokens: data.usage.input_tokens || 0,
                    completionTokens: data.usage.output_tokens || 0,
                    totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
                } : undefined,
            };
        }

        default:
            throw new Error(`Provider ${providerId} not implemented`);
    }
};
