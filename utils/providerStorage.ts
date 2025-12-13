/**
 * Multi-Provider API Key Storage
 * 
 * Manages localStorage persistence for multiple AI provider API keys
 * and provider settings. Keeps keys isolated per-provider for security.
 */

import { ProviderId, PROVIDERS } from './providers';

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderKeys {
    gemini: string | null;
    openai: string | null;
    anthropic: string | null;
    openrouter: string | null;
}

export interface ProviderSettings {
    defaultProvider: ProviderId;
    defaultModels: Partial<Record<ProviderId, string>>;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const SETTINGS_STORAGE_KEY = 'VIBE_PROVIDER_SETTINGS';

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_SETTINGS: ProviderSettings = {
    defaultProvider: 'gemini',
    defaultModels: {
        gemini: 'gemini-3-pro',
        openai: 'gpt-5.2-2025-12-11',
        anthropic: 'claude-sonnet-4-5-20250929',
        openrouter: 'openai/gpt-4o',
    },
};

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Get a single provider's API key from localStorage
 */
export const getProviderKey = (id: ProviderId): string | null => {
    const provider = PROVIDERS[id];
    if (!provider) return null;

    try {
        return localStorage.getItem(provider.storageKey);
    } catch (e) {
        console.warn(`Failed to read key for ${id}:`, e);
        return null;
    }
};

/**
 * Set a single provider's API key in localStorage
 */
export const setProviderKey = (id: ProviderId, key: string): void => {
    const provider = PROVIDERS[id];
    if (!provider) {
        console.warn(`Unknown provider: ${id}`);
        return;
    }

    try {
        localStorage.setItem(provider.storageKey, key.trim());
    } catch (e) {
        console.error(`Failed to save key for ${id}:`, e);
        throw e;
    }
};

/**
 * Clear a single provider's API key from localStorage
 */
export const clearProviderKey = (id: ProviderId): void => {
    const provider = PROVIDERS[id];
    if (!provider) return;

    try {
        localStorage.removeItem(provider.storageKey);
    } catch (e) {
        console.warn(`Failed to clear key for ${id}:`, e);
    }
};

/**
 * Clear all provider API keys from localStorage
 */
export const clearAllProviderKeys = (): void => {
    Object.values(PROVIDERS).forEach(provider => {
        try {
            localStorage.removeItem(provider.storageKey);
        } catch (e) {
            console.warn(`Failed to clear key for ${provider.id}:`, e);
        }
    });
};

/**
 * Get all provider keys as an object
 */
export const getAllProviderKeys = (): ProviderKeys => {
    return {
        gemini: getProviderKey('gemini'),
        openai: getProviderKey('openai'),
        anthropic: getProviderKey('anthropic'),
        openrouter: getProviderKey('openrouter'),
    };
};

/**
 * Check if any provider has a key configured
 */
export const hasAnyProviderKey = (): boolean => {
    return Object.values(PROVIDERS).some(provider => {
        const key = localStorage.getItem(provider.storageKey);
        return key && key.trim().length > 0;
    });
};

/**
 * Get count of configured providers
 */
export const getConfiguredProviderCount = (): number => {
    return Object.values(PROVIDERS).filter(provider => {
        const key = localStorage.getItem(provider.storageKey);
        return key && key.trim().length > 0;
    }).length;
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get provider settings from localStorage
 */
export const getProviderSettings = (): ProviderSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load provider settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
};

/**
 * Save provider settings to localStorage
 */
export const setProviderSettings = (settings: Partial<ProviderSettings>): void => {
    try {
        const current = getProviderSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save provider settings:', e);
        throw e;
    }
};

/**
 * Get the default model for a specific provider
 */
export const getDefaultModel = (id: ProviderId): string => {
    const settings = getProviderSettings();
    const provider = PROVIDERS[id];

    return settings.defaultModels[id] || provider?.defaultModels[0] || '';
};

/**
 * Set the default model for a specific provider
 */
export const setDefaultModel = (id: ProviderId, model: string): void => {
    const settings = getProviderSettings();
    setProviderSettings({
        defaultModels: { ...settings.defaultModels, [id]: model },
    });
};

/**
 * Reset all provider settings to defaults
 */
export const resetProviderSettings = (): void => {
    try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to reset provider settings:', e);
    }
};
