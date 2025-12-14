// Based on OpenRouter API Response Schema
export interface OpenRouterModel {
    id: string;
    name: string;
    displayName: string;
    description: string;
    contextLength: number;
    pricing: {
        prompt: number;
        completion: number;
        request?: number;
        image?: number;
    };
    architecture: {
        modality?: string;
        tokenizer?: string;
        instruct_type?: string;
    };
    top_provider?: {
        context_length?: number;
        max_completion_tokens?: number;
        is_moderated?: boolean;
    };
    per_request_limits?: {
        prompt_tokens?: number;
        completion_tokens?: number;
    };
    supported_parameters?: string[];
}

export interface ProviderGroup {
    name: string;
    displayName: string;
    models: OpenRouterModel[];
}

// Extract provider from model ID (e.g., "openai/gpt-4" → "openai")
export function organizeModelsByProvider(models: any[]): Map<string, OpenRouterModel[]> {
    const providerMap = new Map<string, OpenRouterModel[]>();

    models.forEach(model => {
        const [provider, ...modelParts] = model.id.split('/');
        const displayName = model.name || model.id;

        if (!providerMap.has(provider)) {
            providerMap.set(provider, []);
        }

        providerMap.get(provider)!.push({
            id: model.id,
            name: model.id,
            displayName,
            description: model.description || '',
            contextLength: model.context_length || 0,
            pricing: model.pricing || { prompt: 0, completion: 0 },
            architecture: model.architecture || {},
            top_provider: model.top_provider,
            per_request_limits: model.per_request_limits,
            supported_parameters: model.supported_parameters || [],
        });
    });

    return providerMap;
}

// Convert to provider groups array
export function toProviderGroups(providerMap: Map<string, OpenRouterModel[]>): ProviderGroup[] {
    const displayNames: Record<string, string> = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'meta-llama': 'Meta Llama',
        'mistralai': 'Mistral AI',
        'mistral': 'Mistral AI', // Handle variations
        'cohere': 'Cohere',
        'perplexity': 'Perplexity',
        'deepseek': 'DeepSeek',
        'qwen': 'Qwen',
        'microsoft': 'Microsoft',
        'nousresearch': 'Nous Research',
        'phind': 'Phind',
        'openrouter': 'OpenRouter',
        'databricks': 'Databricks',
        // ... add more mappings as discovered
    };

    return Array.from(providerMap.entries())
        .map(([provider, models]) => ({
            name: provider,
            displayName: displayNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1),
            models: models.sort((a, b) => a.displayName.localeCompare(b.displayName)),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
