import React, { useState, useEffect } from 'react';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';

interface ModelSelectorProps {
    selectedModel: string;
    onModelSelect: (modelId: string) => void;
    className?: string;
}

export function OpenRouterModelSelector({
    selectedModel,
    onModelSelect,
    className = '',
}: ModelSelectorProps) {
    const { providers, loading, error } = useOpenRouterModels();
    const [selectedProvider, setSelectedProvider] = useState<string>('');

    // Get available models for selected provider
    const availableModels = selectedProvider
        ? providers.find(p => p.name === selectedProvider)?.models || []
        : [];

    // Initialize provider selection
    useEffect(() => {
        if (providers.length > 0) {
            // If we have a selected model, try to match its provider
            if (selectedModel) {
                const [modelProvider] = selectedModel.split('/');
                const matchingProvider = providers.find(p => p.name === modelProvider);
                if (matchingProvider) {
                    setSelectedProvider(matchingProvider.name);
                    return;
                }
            }

            // Fallback: If no provider selected yet, select the first one
            if (!selectedProvider) {
                setSelectedProvider(providers[0].name);
            }
        }
    }, [providers, selectedModel]); // Remove selectedProvider from deps to allow manual overrides? No, this is init logic.

    // NOTE: We don't want to auto-select a model if the user changes provider, unless they haven't selected one yet?
    // The user's snippet auto-selected the first model when provider changes.
    useEffect(() => {
        if (selectedProvider && availableModels.length > 0) {
            // If the current selectedModel is not in the availableModels (meaning we switched provider), select the first one.
            const isCurrentModelValid = availableModels.some(m => m.id === selectedModel);

            if (!isCurrentModelValid) {
                onModelSelect(availableModels[0].id);
            }
        }
    }, [selectedProvider, availableModels, selectedModel, onModelSelect]);

    if (error) {
        return (
            <div className={`text-red-400 text-xs p-2 border border-red-500/20 bg-red-500/10 rounded ${className}`}>
                Error loading models. Using cached/default list if available.
            </div>
        );
    }


    const selectedModelData = availableModels.find(m => m.id === selectedModel);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Selectors Row */}
            <div className="flex gap-4">
                {/* Provider Selector */}
                <div className="flex-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Provider</label>
                    <div className="relative">
                        <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            disabled={loading}
                            className="w-full pl-3 pr-8 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-primary-500/50 appearance-none transition-colors hover:border-slate-700"
                        >
                            <option value="">{loading ? 'Loading...' : 'Select Provider'}</option>
                            {providers.map((provider) => (
                                <option key={provider.name} value={provider.name}>
                                    {provider.displayName} ({provider.models.length})
                                </option>
                            ))}
                        </select>
                        {/* Chevron Icon */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Model Selector */}
                <div className="flex-[2]">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Model</label>
                    <div className="relative">
                        <select
                            value={selectedModel}
                            onChange={(e) => onModelSelect(e.target.value)}
                            disabled={loading || !selectedProvider}
                            className="w-full pl-3 pr-8 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-primary-500/50 appearance-none transition-colors hover:border-slate-700"
                        >
                            <option value="">{loading ? 'Loading...' : 'Select Model'}</option>
                            {availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.displayName}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Details Panel */}
            {selectedModelData && (
                <div className="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Description */}
                    <div className="text-xs text-slate-400 leading-relaxed">
                        {selectedModelData.description}
                    </div>

                    {/* ID & Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Model ID */}
                        <div>
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Model ID</label>
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
                                <code className="text-[11px] text-slate-300 font-mono truncate select-all" title={selectedModelData.id}>
                                    {selectedModelData.id}
                                </code>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Pricing</label>
                            <div className="flex items-center gap-2.5 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[11px] font-mono text-emerald-400">
                                        ${(Number(selectedModelData.pricing.prompt) * 1000000).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-slate-600">in</span>
                                </div>
                                <span className="text-slate-700">/</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[11px] font-mono text-amber-400">
                                        ${(Number(selectedModelData.pricing.completion) * 1000000).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-slate-600">out per 1M</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Context Window */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider">Context Window</label>
                            <span className="text-[10px] font-mono text-slate-400">
                                {selectedModelData.contextLength >= 1000
                                    ? `${(selectedModelData.contextLength / 1000).toFixed(0)}k`
                                    : selectedModelData.contextLength} tokens
                            </span>
                        </div>
                        {/* Context Visual Bar */}
                        <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500/50"
                                style={{ width: '100%' }} // Always full for context capability visualization
                            />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-slate-600">0</span>
                            <span className="text-[9px] text-slate-600">Max Capacity</span>
                        </div>
                    </div>

                    {/* Capabilities & Stats */}
                    <div className="pt-2 border-t border-slate-800/50">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Modality</label>
                                <span className="text-[11px] text-slate-300 font-medium">
                                    {selectedModelData.architecture?.modality || 'text->text'}
                                </span>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Max Output</label>
                                <span className="text-[11px] text-slate-300 font-medium">
                                    {selectedModelData.top_provider?.max_completion_tokens
                                        ? `${selectedModelData.top_provider.max_completion_tokens >= 1000
                                            ? (selectedModelData.top_provider.max_completion_tokens / 1000).toFixed(0) + 'k'
                                            : selectedModelData.top_provider.max_completion_tokens}`
                                        : 'Unknown'}
                                </span>
                            </div>
                        </div>

                        {/* Supported Parameters */}
                        {selectedModelData.supported_parameters && selectedModelData.supported_parameters.length > 0 && (
                            <div>
                                <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 block">Supported Parameters</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedModelData.supported_parameters.map((param) => (
                                        <span key={param} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50">
                                            {param}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
