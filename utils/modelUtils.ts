/**
 * Model Configuration & Pricing Utilities
 * 
 * Provides tiered model data, pricing calculations, and context limit
 * utilities for OpenAI, Anthropic, Google Gemini, and OpenRouter providers.
 */

import type { ProviderId } from './providers';

// ============================================================================
// TYPES
// ============================================================================

export type ModelTier = 'complex' | 'mid' | 'fast';
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelConfig {
    id: string;
    displayName: string;
    tier: ModelTier;
    providerId: ProviderId;
    inputCostPerMillion: number;
    outputCostPerMillion: number;
    inputContextLimit: number;
    outputContextLimit: number;
    description: string;
    supportsThinking?: boolean;
    reasoningEfforts?: ReasoningEffort[];
    tieredPricing?: {
        threshold: number;
        inputCostAbove: number;
        outputCostAbove: number;
    };
}

// ============================================================================
// MODEL REGISTRY
// ============================================================================

export const PROVIDER_MODELS: Record<ProviderId, ModelConfig[]> = {
    openai: [
        // Complex tier
        {
            id: 'gpt-5.2-pro-2025-12-11',
            displayName: 'GPT-5.2 Pro',
            tier: 'complex',
            providerId: 'openai',
            inputCostPerMillion: 21.00,
            outputCostPerMillion: 168.00,
            inputContextLimit: 400000,
            outputContextLimit: 128000,
            description: 'Highest accuracy, designed to tackle tough problems. Supports medium/high/xhigh reasoning.',
            reasoningEfforts: ['medium', 'high', 'xhigh'],
        },
        // Mid tier
        {
            id: 'gpt-5.2-2025-12-11',
            displayName: 'GPT-5.2 Thinking',
            tier: 'mid',
            providerId: 'openai',
            inputCostPerMillion: 1.75,
            outputCostPerMillion: 14.00,
            inputContextLimit: 400000,
            outputContextLimit: 128000,
            description: 'Flagship model for coding and agentic tasks. Balanced reasoning and cost.',
            reasoningEfforts: ['low', 'medium', 'high', 'xhigh'],
        },
        // Fast tier
        {
            id: 'gpt-5.2-chat-latest',
            displayName: 'GPT-5.2 Instant',
            tier: 'fast',
            providerId: 'openai',
            inputCostPerMillion: 1.75,
            outputCostPerMillion: 14.00,
            inputContextLimit: 128000,
            outputContextLimit: 16384,
            description: 'Optimized for speed with smaller context window.',
        },
        // Budget options
        {
            id: 'gpt-5-mini',
            displayName: 'GPT-5 Mini',
            tier: 'fast',
            providerId: 'openai',
            inputCostPerMillion: 0.25,
            outputCostPerMillion: 2.00,
            inputContextLimit: 128000,
            outputContextLimit: 16384,
            description: 'Budget-friendly option for simple tasks.',
        },
        {
            id: 'gpt-5-nano',
            displayName: 'GPT-5 Nano',
            tier: 'fast',
            providerId: 'openai',
            inputCostPerMillion: 0.05,
            outputCostPerMillion: 0.40,
            inputContextLimit: 128000,
            outputContextLimit: 16384,
            description: 'Lowest cost option for high-volume calls.',
        },
    ],

    anthropic: [
        // Complex tier
        {
            id: 'claude-opus-4-5-20251101',
            displayName: 'Claude Opus 4.5',
            tier: 'complex',
            providerId: 'anthropic',
            inputCostPerMillion: 5.00,
            outputCostPerMillion: 25.00,
            inputContextLimit: 200000,
            outputContextLimit: 64000,
            description: 'Premium model with maximum intelligence and practical performance.',
        },
        // Mid tier
        {
            id: 'claude-sonnet-4-5-20250929',
            displayName: 'Claude Sonnet 4.5',
            tier: 'mid',
            providerId: 'anthropic',
            inputCostPerMillion: 3.00,
            outputCostPerMillion: 15.00,
            inputContextLimit: 200000,
            outputContextLimit: 64000,
            description: 'Smart model for complex agents and coding. Fast latency.',
        },
        // Fast tier
        {
            id: 'claude-haiku-4-5-20251001',
            displayName: 'Claude Haiku 4.5',
            tier: 'fast',
            providerId: 'anthropic',
            inputCostPerMillion: 1.00,
            outputCostPerMillion: 5.00,
            inputContextLimit: 200000,
            outputContextLimit: 200000,
            description: 'Fastest model with near-frontier intelligence. Best for high-volume.',
        },
    ],

    gemini: [
        // Complex tier
        {
            id: 'gemini-3-pro',
            displayName: 'Gemini 3 Pro',
            tier: 'complex',
            providerId: 'gemini',
            inputCostPerMillion: 2.00,
            outputCostPerMillion: 12.00,
            inputContextLimit: 1000000,
            outputContextLimit: 65536,
            description: 'Top reasoning and multimodal support. Ideal for deep research and agentic workflows.',
            supportsThinking: true,
            tieredPricing: {
                threshold: 200000,
                inputCostAbove: 4.00,
                outputCostAbove: 18.00,
            },
        },
        // Mid tier
        {
            id: 'gemini-2.5-pro',
            displayName: 'Gemini 2.5 Pro',
            tier: 'mid',
            providerId: 'gemini',
            inputCostPerMillion: 1.25,
            outputCostPerMillion: 10.00,
            inputContextLimit: 1000000,
            outputContextLimit: 65536,
            description: 'Balanced price/performance with consistent context window.',
            supportsThinking: true,
            tieredPricing: {
                threshold: 200000,
                inputCostAbove: 2.50,
                outputCostAbove: 15.00,
            },
        },
        // Fast tier
        {
            id: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            tier: 'fast',
            providerId: 'gemini',
            inputCostPerMillion: 0.30,
            outputCostPerMillion: 2.50,
            inputContextLimit: 1000000,
            outputContextLimit: 65536,
            description: 'Speed-optimized MoE model. Lowest cost in Gemini family.',
            supportsThinking: true,
        },
    ],

    openrouter: [
        // OpenRouter models are fetched dynamically from the API
        // These are placeholder defaults when API is unavailable
        {
            id: 'openai/gpt-4o',
            displayName: 'GPT-4o (via OpenRouter)',
            tier: 'mid',
            providerId: 'openrouter',
            inputCostPerMillion: 2.50,
            outputCostPerMillion: 10.00,
            inputContextLimit: 128000,
            outputContextLimit: 16384,
            description: 'OpenAI GPT-4o through OpenRouter (5.5% platform fee applies).',
        },
        {
            id: 'anthropic/claude-sonnet-4',
            displayName: 'Claude Sonnet 4 (via OpenRouter)',
            tier: 'mid',
            providerId: 'openrouter',
            inputCostPerMillion: 3.00,
            outputCostPerMillion: 15.00,
            inputContextLimit: 200000,
            outputContextLimit: 64000,
            description: 'Anthropic Claude through OpenRouter (5.5% platform fee applies).',
        },
        {
            id: 'google/gemini-2.5-pro-preview',
            displayName: 'Gemini 2.5 Pro (via OpenRouter)',
            tier: 'mid',
            providerId: 'openrouter',
            inputCostPerMillion: 1.25,
            outputCostPerMillion: 10.00,
            inputContextLimit: 1000000,
            outputContextLimit: 65536,
            description: 'Google Gemini through OpenRouter (5.5% platform fee applies).',
        },
    ],
};

// ============================================================================
// PRICING UTILITIES
// ============================================================================

/**
 * Calculate estimated cost for a prompt
 * Handles tiered pricing (Gemini >200k) and OpenRouter 5.5% fee
 */
export const calculatePromptCost = (
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number,
    isOpenRouter: boolean = false
): number => {
    let inputCost: number;

    // Handle tiered pricing for models with threshold-based pricing
    if (modelConfig.tieredPricing && inputTokens > modelConfig.tieredPricing.threshold) {
        const belowThreshold = modelConfig.tieredPricing.threshold;
        const aboveThreshold = inputTokens - belowThreshold;
        inputCost =
            (belowThreshold * modelConfig.inputCostPerMillion) / 1_000_000 +
            (aboveThreshold * modelConfig.tieredPricing.inputCostAbove) / 1_000_000;
    } else {
        inputCost = (inputTokens * modelConfig.inputCostPerMillion) / 1_000_000;
    }

    // Calculate output cost (also handle tiered if applicable)
    let outputCost: number;
    if (modelConfig.tieredPricing && inputTokens > modelConfig.tieredPricing.threshold) {
        outputCost = (outputTokens * modelConfig.tieredPricing.outputCostAbove) / 1_000_000;
    } else {
        outputCost = (outputTokens * modelConfig.outputCostPerMillion) / 1_000_000;
    }

    const baseCost = inputCost + outputCost;

    // Add OpenRouter platform fee (5.5%)
    if (isOpenRouter || modelConfig.providerId === 'openrouter') {
        return baseCost * 1.055;
    }

    return baseCost;
};

/**
 * Format cost for display (e.g., "$0.0024")
 */
export const formatCost = (cost: number): string => {
    if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    } else if (cost < 1) {
        return `$${cost.toFixed(3)}`;
    } else {
        return `$${cost.toFixed(2)}`;
    }
};

// ============================================================================
// CONTEXT UTILITIES
// ============================================================================

/**
 * Get context usage percentage for progress bar
 */
export const getContextUsagePercent = (
    modelConfig: ModelConfig,
    usedTokens: number,
    type: 'input' | 'output'
): number => {
    const limit = type === 'input' ? modelConfig.inputContextLimit : modelConfig.outputContextLimit;
    return Math.min(100, (usedTokens / limit) * 100);
};

/**
 * Get context status level based on usage
 */
export const getContextStatus = (
    usagePercent: number
): 'normal' | 'warning' | 'critical' => {
    if (usagePercent >= 90) return 'critical';
    if (usagePercent >= 70) return 'warning';
    return 'normal';
};

/**
 * Format token count for display (e.g., "42.5k" or "1.2M")
 */
export const formatTokenCount = (tokens: number): string => {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)}k`;
    }
    return tokens.toString();
};

// ============================================================================
// MODEL LOOKUP UTILITIES
// ============================================================================

/**
 * Get models by tier for a provider
 */
export const getModelsByTier = (providerId: ProviderId, tier: ModelTier): ModelConfig[] => {
    return PROVIDER_MODELS[providerId]?.filter((m) => m.tier === tier) || [];
};

/**
 * Get all models for a provider
 */
export const getModelsForProvider = (providerId: ProviderId): ModelConfig[] => {
    return PROVIDER_MODELS[providerId] || [];
};

/**
 * Get a specific model by ID
 */
export const getModelById = (modelId: string): ModelConfig | undefined => {
    for (const providerId of Object.keys(PROVIDER_MODELS) as ProviderId[]) {
        const model = PROVIDER_MODELS[providerId].find((m) => m.id === modelId);
        if (model) return model;
    }
    return undefined;
};

/**
 * Check if a model supports reasoning effort selection
 */
export const supportsReasoningEffort = (modelConfig: ModelConfig): boolean => {
    return Boolean(modelConfig.reasoningEfforts && modelConfig.reasoningEfforts.length > 0);
};

/**
 * Get the default reasoning effort for a model
 */
export const getDefaultReasoningEffort = (modelConfig: ModelConfig): ReasoningEffort | null => {
    if (!modelConfig.reasoningEfforts || modelConfig.reasoningEfforts.length === 0) {
        return null;
    }
    // Default to 'medium' if available, otherwise first option
    if (modelConfig.reasoningEfforts.includes('medium')) {
        return 'medium';
    }
    return modelConfig.reasoningEfforts[0];
};

// ============================================================================
// OPENROUTER DYNAMIC MODELS
// ============================================================================

export interface OpenRouterModel {
    id: string;
    name: string;
    description: string;
    pricing: {
        prompt: string;
        completion: string;
    };
    context_length: number | null;
    top_provider: {
        context_length: number | null;
        max_completion_tokens: number | null;
    };
}

/**
 * Fetch models from OpenRouter API
 */
export const fetchOpenRouterModels = async (apiKey: string): Promise<ModelConfig[]> => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.warn('Failed to fetch OpenRouter models:', response.status);
            return PROVIDER_MODELS.openrouter;
        }

        const data = await response.json();
        const models: ModelConfig[] = [];

        for (const model of data.data as OpenRouterModel[]) {
            // Parse pricing (comes as string like "0.000001")
            const inputCost = parseFloat(model.pricing.prompt) * 1_000_000;
            const outputCost = parseFloat(model.pricing.completion) * 1_000_000;

            // Determine tier based on price
            let tier: ModelTier = 'mid';
            if (inputCost < 1) tier = 'fast';
            else if (inputCost > 10) tier = 'complex';

            models.push({
                id: model.id,
                displayName: model.name,
                tier,
                providerId: 'openrouter',
                inputCostPerMillion: inputCost,
                outputCostPerMillion: outputCost,
                inputContextLimit: model.context_length || model.top_provider?.context_length || 128000,
                outputContextLimit: model.top_provider?.max_completion_tokens || 16384,
                description: model.description || `${model.name} via OpenRouter (5.5% fee applies)`,
            });
        }

        return models.length > 0 ? models : PROVIDER_MODELS.openrouter;
    } catch (error) {
        console.warn('Error fetching OpenRouter models:', error);
        return PROVIDER_MODELS.openrouter;
    }
};
