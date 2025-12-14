import { useState, useEffect, useCallback } from 'react';
import { ProviderGroup, organizeModelsByProvider, toProviderGroups } from '../utils/openrouterModels';

interface UseOpenRouterModelsReturn {
    providers: ProviderGroup[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const CACHE_KEY = 'openrouter_models_cache_v2';
const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour

export function useOpenRouterModels(): UseOpenRouterModelsReturn {
    const [providers, setProviders] = useState<ProviderGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Check cache first
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const { data, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_DURATION) {
                            setProviders(data);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing cached models:', e);
                        localStorage.removeItem(CACHE_KEY);
                    }
                }
            }

            // Fetch from API
            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const { data } = await response.json();
            const providerMap = organizeModelsByProvider(data);
            const organized = toProviderGroups(providerMap);

            // Cache the results
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: organized,
                    timestamp: Date.now(),
                }));
            }

            setProviders(organized);
        } catch (err) {
            console.error('Failed to fetch OpenRouter models:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch models');

            // Fallback to cached data if available
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const { data } = JSON.parse(cached);
                        setProviders(data);
                    } catch (e) {
                        // If parsing fails, we have no fallback
                    }
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    return { providers, loading, error, refetch: fetchModels };
}
