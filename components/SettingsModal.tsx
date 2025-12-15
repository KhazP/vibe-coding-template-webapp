

import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import {
    Zap, BrainCircuit, Search, Check, Activity, Bell, User, Clock,
    FileArchive, EyeOff, Layout, Download, ChevronDown, RefreshCcw, MessageSquare,
    AlertTriangle, Wrench, BarChart2, RotateCcw
} from 'lucide-react';
import { Modal, Tooltip, Select, TextArea, Button } from './UI';
import { MODEL_CONFIGS, PRESETS, DEFAULT_SETTINGS } from '../utils/constants';
import { PresetMode, ToastPosition, Persona, GeminiSafetyPreset, ExpertSettings } from '../types';
import { useToast } from './Toast';
import { getProviderSettings, setProviderSettings, setDefaultModel, getExpertSettings, setExpertSettings, resetExpertSettings, getEffectiveDefaultProvider, getProviderKey } from '../utils/providerStorage';
import { PROVIDERS, type ProviderId } from '../utils/providers';
import { PROVIDER_MODELS, getModelsForProvider, getModelById, supportsReasoningEffort, type ModelConfig, type ReasoningEffort } from '../utils/modelUtils';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';
import { OpenRouterModelSelector } from './OpenRouterModelSelector';
import { getGeminiModels, type GeminiModel } from '../utils/gemini';
import { getOpenAIModels, type OpenAIModel } from '../utils/openai';
import { getAnthropicModels, type AnthropicModel } from '../utils/anthropic';
import { PricingIndicator } from './PricingIndicator';
import { ContextBar } from './ContextBar';

type SettingsTab = 'ai' | 'general' | 'export' | 'reset';

const SettingsModal: React.FC = () => {
    const { state, updateSettings, isSettingsOpen, setIsSettingsOpen } = useProject();
    const { position, setPosition } = useToast();
    const { settings } = state;
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
    const [showAdvancedAI, setShowAdvancedAI] = useState(settings.preset === 'custom');

    // Provider state
    const providerSettings = useMemo(() => getProviderSettings(), [isSettingsOpen]);
    const [activeProvider, setActiveProvider] = useState<ProviderId>(getEffectiveDefaultProvider());
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');
    const [selectedModelId, setSelectedModelId] = useState<string>(providerSettings.defaultModels[activeProvider] || '');

    // Expert Settings state (v1) - per provider
    const [showExpertSettings, setShowExpertSettings] = useState(false);
    const savedExpertSettings = useMemo(() => getExpertSettings(activeProvider) || {}, [activeProvider, isSettingsOpen]);
    const [expertMaxTokens, setExpertMaxTokens] = useState<number | undefined>(savedExpertSettings.maxOutputTokens);
    const [expertStopSequences, setExpertStopSequences] = useState<string>(savedExpertSettings.stopSequences?.join('\n') || '');
    const [expertSeed, setExpertSeed] = useState<number | undefined>(savedExpertSettings.seed);
    const [expertTopK, setExpertTopK] = useState<number | undefined>(savedExpertSettings.topK);
    const [expertRepetitionPenalty, setExpertRepetitionPenalty] = useState<number | undefined>(savedExpertSettings.repetitionPenalty);
    const [expertIncludeReasoning, setExpertIncludeReasoning] = useState<boolean>(savedExpertSettings.includeReasoning || false);
    const [expertReasoningEffort, setExpertReasoningEffort] = useState<ExpertSettings['reasoningEffort']>(savedExpertSettings.reasoningEffort || 'medium');
    const [expertReasoningMaxTokens, setExpertReasoningMaxTokens] = useState<number | undefined>(savedExpertSettings.reasoningMaxTokens);
    const [expertForceJson, setExpertForceJson] = useState<boolean>(savedExpertSettings.responseFormat?.type === 'json_object');
    const [expertSafetyPreset, setExpertSafetyPreset] = useState<GeminiSafetyPreset>(
        (activeProvider === 'gemini' && (savedExpertSettings as any)?.safetyPreset) || 'default'
    );

    // Reset confirmation state
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);

    // Gemini Dynamic Models
    const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
    const [isLoadingGeminiModels, setIsLoadingGeminiModels] = useState(false);

    // OpenAI Dynamic Models
    const [openAIModels, setOpenAIModels] = useState<OpenAIModel[]>([]);
    const [isLoadingOpenAIModels, setIsLoadingOpenAIModels] = useState(false);

    // Anthropic Dynamic Models
    const [anthropicModels, setAnthropicModels] = useState<AnthropicModel[]>([]);
    const [isLoadingAnthropicModels, setIsLoadingAnthropicModels] = useState(false);

    // Track which providers have API keys
    const [providerKeys, setProviderKeys] = useState<Record<ProviderId, boolean>>({
        gemini: false,
        openai: false,
        anthropic: false,
        openrouter: false
    });

    useEffect(() => {
        const checkKeys = () => {
            const keys = {
                gemini: !!getProviderKey('gemini'),
                openai: !!getProviderKey('openai'),
                anthropic: !!getProviderKey('anthropic'),
                openrouter: !!getProviderKey('openrouter')
            };
            setProviderKeys(keys);
        };
        checkKeys();
        // Listen for storage changes in case keys are added elsewhere while modal is open
        window.addEventListener('storage', checkKeys);
        return () => window.removeEventListener('storage', checkKeys);
    }, [isSettingsOpen]);

    // Sync expert settings when provider changes
    useEffect(() => {
        const settings = getExpertSettings(activeProvider) || {};
        setExpertMaxTokens(settings.maxOutputTokens);
        setExpertStopSequences(settings.stopSequences?.join('\n') || '');
        setExpertSeed(settings.seed);
        setExpertTopK(settings.topK);
        setExpertRepetitionPenalty(settings.repetitionPenalty);
        setExpertIncludeReasoning(settings.includeReasoning || false);
        setExpertReasoningEffort(settings.reasoningEffort || 'medium');
        setExpertReasoningMaxTokens(settings.reasoningMaxTokens);
        setExpertForceJson(settings.responseFormat?.type === 'json_object');

        if (activeProvider === 'gemini') {
            setExpertSafetyPreset((settings as any)?.safetyPreset || 'default');
        }
    }, [activeProvider]);

    // Auto-save expert toggles/selects
    useEffect(() => {
        // Debounce or check if values actually changed? 
        // For now, just save. saveExpertSettings uses current state vars.
        // We need to ensure we don't save initial load (defaults).
        // But savedExpertSettings initializes state, so it shouldn't drift.
        // We'll trust the user interaction updates the state.

        // However, we can't call saveExpertSettings directly here if it's not defined yet (it's defined later).
        // We must move the definition of saveExpertSettings UP, or put this effect DOWN.
        // `saveExpertSettings` is defined around line 224 (restored location?). 
        // I will insert this effect AFTER `saveExpertSettings` definition.
    }, []); // Placeholder to cancel this insertion here. 
    // I will use a separate tool call to insert it later.

    // Actually, I can just define the `saveExpertSettings` function inside a useCallback or similar early on?
    // The component structure is: state -> effects -> methods -> render.
    // Methods currently rely on state.
    // I will skip adding the effect for now and handle persistence inline with `setTimeout` for the toggles, 
    // or just rely on the user closing the modal (if I add a save-on-close)?
    // No, `saveExpertSettings` is explicitly called onBlur currently.
    // I will add the UI inputs now and use `onBlur` for inputs. 
    // For checkboxes, I will use `onChange` + `setTimeout(saveExpertSettings, 0)`.
    // BUT `saveExpertSettings` is defined lower down.

    // I will proceed with just adding the UI inputs first.


    // ... (skip down to saveExpertSettings)

    // --- RESTORED LOGIC ---
    const { providers: openRouterProviders } = useOpenRouterModels();

    // Get provider capabilities
    const providerCapabilities = PROVIDERS[activeProvider].capabilities;

    // Capabilities Check for OpenRouter
    const openRouterModel = activeProvider === 'openrouter'
        ? openRouterProviders.flatMap(p => p.models).find(m => m.id === selectedModelId)
        : null;

    const supportsTemperature = activeProvider === 'openrouter'
        ? (openRouterModel?.supported_parameters?.includes('temperature') ?? true)
        : true;

    const supportsTopP = activeProvider === 'openrouter'
        ? (openRouterModel?.supported_parameters?.includes('top_p') ?? true)
        : true;

    // Helper for simple capability check (also used in save validation)
    const getModelCapabilities = (modelId: string) => {
        const isAnthropic = modelId.startsWith('anthropic/') || modelId.includes('claude');
        const isOpenAI = modelId.startsWith('openai/') || modelId.includes('gpt');

        return {
            supportsReasoningMaxTokens: isAnthropic,
            supportsTopK: !isOpenAI || isAnthropic, // Rough heuristic matching utils/openrouter.ts
        };
    };

    const capabilities = useMemo(() => getModelCapabilities(selectedModelId), [selectedModelId]);

    // Load Gemini Models
    useEffect(() => {
        if (activeProvider === 'gemini') {
            const fetchGemini = async () => {
                const key = getProviderKey('gemini');
                if (key) {
                    setIsLoadingGeminiModels(true);
                    const models = await getGeminiModels(key);
                    // Filter for generative models only and sort by name/version
                    const sorted = models
                        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                        .sort((a, b) => b.displayName.localeCompare(a.displayName));
                    setGeminiModels(sorted);
                    setIsLoadingGeminiModels(false);
                }
            };
            fetchGemini();
        }
    }, [activeProvider, isSettingsOpen]);

    // Load OpenAI Models
    useEffect(() => {
        if (activeProvider === 'openai') {
            const fetchOpenAI = async () => {
                const key = getProviderKey('openai');
                if (key) {
                    setIsLoadingOpenAIModels(true);
                    const models = await getOpenAIModels(key);
                    setOpenAIModels(models);
                    setIsLoadingOpenAIModels(false);
                }
            };
            fetchOpenAI();
        }
    }, [activeProvider, isSettingsOpen]);

    // Load Anthropic Models
    useEffect(() => {
        if (activeProvider === 'anthropic') {
            const fetchAnthropic = async () => {
                const key = getProviderKey('anthropic');
                if (key) {
                    setIsLoadingAnthropicModels(true);
                    const models = await getAnthropicModels(key);
                    setAnthropicModels(models);
                    setIsLoadingAnthropicModels(false);
                }
            };
            fetchAnthropic();
        }
    }, [activeProvider, isSettingsOpen]);

    // Sync selected model when provider changes
    useEffect(() => {
        const defaultModel = providerSettings.defaultModels[activeProvider];
        if (defaultModel) {
            setSelectedModelId(defaultModel);
        } else {
            const models = getModelsForProvider(activeProvider);
            if (models.length > 0) {
                setSelectedModelId(models[0].id);
            }
        }
    }, [activeProvider, providerSettings]);

    // Get current model config
    const currentModelConfig = useMemo(() => {
        if (activeProvider === 'openrouter') {
            const m = openRouterProviders.flatMap(p => p.models).find(m => m.id === selectedModelId);
            if (m) {
                return {
                    id: m.id,
                    displayName: m.displayName,
                    provider: 'openrouter',
                    tier: 'complex', // Default/Placeholder
                    inputCostPerMillion: Number(m.pricing.prompt) * 1000000,
                    outputCostPerMillion: Number(m.pricing.completion) * 1000000,
                    inputContextLimit: m.contextLength,
                    outputContextLimit: m.top_provider?.max_completion_tokens || 4096,
                    description: m.description,
                    supportsVision: m.architecture?.modality?.includes('image') || false,
                } as unknown as ModelConfig; // Cast to avoid strict type mismatch if ModelConfig has other fields
            }
            return MODEL_CONFIGS['openai/gpt-4o']; // Fallback
        }
        return getModelById(selectedModelId);
    }, [selectedModelId, activeProvider, openRouterProviders]);

    // Get models for active provider
    const providerModels = useMemo(() => {
        return getModelsForProvider(activeProvider);
    }, [activeProvider]);

    // Check if current provider is Gemini (for Gemini-specific settings)
    const isGeminiProvider = activeProvider === 'gemini';
    const isOpenAIProvider = activeProvider === 'openai';
    const isAnthropicProvider = activeProvider === 'anthropic';

    // Check if current model supports reasoning effort (GPT-5.2)
    const showReasoningEffort = currentModelConfig && supportsReasoningEffort(currentModelConfig);

    const handlePresetSelect = (presetId: PresetMode) => {
        if (presetId === 'custom') {
            setShowAdvancedAI(true);
            updateSettings({ preset: 'custom' });
            return;
        }

        const presetConfig = Object.values(PRESETS).find(p => p.id === presetId);
        if (presetConfig) {
            updateSettings({
                preset: presetId,
                ...presetConfig.config
            });
        }
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModelId = e.target.value;
        setSelectedModelId(newModelId);

        // Save as default for this provider
        setDefaultModel(activeProvider, newModelId);

        // Update global settings.modelName for ALL providers
        const newModelConfig = getModelById(newModelId);
        if (activeProvider === 'gemini') {
            const maxBudget = MODEL_CONFIGS[newModelId as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
            updateSettings({
                modelName: newModelId,
                thinkingBudget: maxBudget,
                preset: 'custom'
            });
        } else {
            // For non-Gemini providers, just update the modelName
            updateSettings({
                modelName: newModelId,
                preset: 'custom'
            });
        }
    };

    const handleProviderChange = (newProvider: ProviderId) => {
        setActiveProvider(newProvider);

        // Persist the provider change to localStorage
        setProviderSettings({ defaultProvider: newProvider });

        // When changing providers, also update modelName to the default model for that provider
        const defaultModel = providerSettings.defaultModels[newProvider];
        const models = getModelsForProvider(newProvider);
        const modelToUse = defaultModel || (models.length > 0 ? models[0].id : '');

        if (modelToUse) {
            setSelectedModelId(modelToUse);
            if (newProvider === 'gemini') {
                const maxBudget = MODEL_CONFIGS[modelToUse as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
                updateSettings({ modelName: modelToUse, thinkingBudget: maxBudget, preset: 'custom' });
            } else {
                updateSettings({ modelName: modelToUse, preset: 'custom' });
            }
        }
    };

    const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
        const max = currentConfig ? currentConfig.maxThinkingBudget : 32768;

        if (val > max) val = max;
        if (val < 0) val = 0;
        updateSettings({
            thinkingBudget: val,
            preset: 'custom'
        });
    };

    const handleGroundingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({
            useGrounding: e.target.checked,
            preset: 'custom'
        });
    };

    const handleResetDefaults = () => {
        // Reset logic: Model defaults + Max thinking budget if applicable
        const maxBudget = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
        updateSettings({
            temperature: DEFAULT_SETTINGS.TEMPERATURE,
            topK: DEFAULT_SETTINGS.TOP_K,
            topP: DEFAULT_SETTINGS.TOP_P,
            thinkingBudget: maxBudget, // Reset to recommended budget for model
            preset: 'custom'
        });
    };

    // Expert Settings handlers (v1)
    const saveExpertSettings = () => {
        const stopSeqArray = expertStopSequences
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Validation / Clamping
        let validRepPenalty = expertRepetitionPenalty;
        if (validRepPenalty !== undefined) {
            validRepPenalty = Math.max(0, Math.min(2, validRepPenalty));
        }

        let validTopK = expertTopK;
        if (validTopK !== undefined) {
            validTopK = Math.max(1, Math.min(100, Math.floor(validTopK)));
        }

        let validReasoningMaxTokens = expertReasoningMaxTokens;
        if (validReasoningMaxTokens !== undefined) {
            // Cap at 32k for safety, min 1024
            validReasoningMaxTokens = Math.max(1024, Math.min(32000, Math.floor(validReasoningMaxTokens)));
        }

        const expertData: ExpertSettings & { safetyPreset?: GeminiSafetyPreset } = {
            ...(expertMaxTokens !== undefined && { maxOutputTokens: expertMaxTokens }),
            ...(stopSeqArray.length > 0 && { stopSequences: stopSeqArray }),
            ...(expertSeed !== undefined && { seed: expertSeed }),
            ...(validTopK !== undefined && { topK: validTopK }),
            ...(validRepPenalty !== undefined && { repetitionPenalty: validRepPenalty }),
            ...(expertIncludeReasoning && {
                includeReasoning: true,
                reasoningEffort: expertReasoningEffort,
                ...(validReasoningMaxTokens && { reasoningMaxTokens: validReasoningMaxTokens })
            }),
            ...(expertForceJson && { responseFormat: { type: 'json_object' } }),
        };

        // Add Gemini-specific settings
        if (activeProvider === 'gemini' && expertSafetyPreset !== 'default') {
            expertData.safetyPreset = expertSafetyPreset;
        }

        setExpertSettings(activeProvider, expertData);
    };

    // Auto-save when toggles change
    // Auto-save when toggles change
    useEffect(() => {
        // Only trigger if we are safely loaded
        if (activeProvider) {
            saveExpertSettings();
        }
    }, [expertIncludeReasoning, expertForceJson, expertReasoningEffort, expertReasoningMaxTokens]);

    const handleResetExpertSettings = () => {
        resetExpertSettings(activeProvider);
        setExpertMaxTokens(undefined);
        setExpertStopSequences('');
        setExpertSeed(undefined);
        setExpertTopK(undefined);
        setExpertRepetitionPenalty(undefined);
        setExpertIncludeReasoning(false);
        setExpertReasoningEffort('medium');
        setExpertReasoningMaxTokens(undefined);
        setExpertForceJson(false);
        setExpertSafetyPreset('default');
    };

    const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
    const currentMaxBudget = currentConfig ? currentConfig.maxThinkingBudget : 32768;

    const TabButton: React.FC<{ id: SettingsTab; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => {
        const isReset = id === 'reset';
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-r-xl md:rounded-l-none transition-all duration-200 md:w-full text-left md:border-l-2 border-0 md:border-l-2 shrink-0 min-h-[44px] ${activeTab === id
                    ? isReset
                        ? 'bg-red-500/20 text-red-300 md:border-red-400 border-red-400 shadow-[inset_0_0_12px_rgba(239,68,68,0.15)]'
                        : 'bg-primary-500/20 text-primary-300 md:border-primary-400 border-primary-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]'
                    : isReset
                        ? 'text-red-500/60 hover:text-red-400 hover:bg-red-500/5 md:border-transparent'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 md:border-transparent'
                    }`}
            >
                {React.cloneElement(icon as React.ReactElement<any>, {
                    size: 18,
                    className: activeTab === id
                        ? isReset ? 'text-red-400' : 'text-primary-400'
                        : isReset ? 'text-red-500/60' : 'text-slate-500'
                })}
                <span className={`font-medium text-xs md:text-sm whitespace-nowrap ${activeTab === id ? (isReset ? 'text-red-300' : 'text-primary-300') : ''}`}>{label}</span>
            </button>
        );
    };

    return (
        <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Global Settings" maxWidth="max-w-5xl">
            <div className="flex flex-col md:flex-row gap-3 md:gap-6 md:h-[600px] max-h-[75vh] md:max-h-none">
                {/* Sidebar Navigation - Horizontal scroll on mobile, vertical on desktop */}
                <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-1 md:gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 md:mx-0 md:px-0 pb-2 md:pb-0 md:pr-4 md:border-r border-b md:border-b-0 border-white/10">
                    <TabButton id="ai" icon={<BrainCircuit size={18} />} label="AI" />
                    <TabButton id="general" icon={<Layout size={18} />} label="General" />
                    <TabButton id="export" icon={<Download size={18} />} label="Export" />
                    <div className="hidden md:flex flex-1" />
                    <TabButton id="reset" icon={<RotateCcw size={18} />} label="Reset" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-2">

                    {/* --- AI Config Tab --- */}
                    {activeTab === 'ai' && (
                        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-start gap-3 p-3 bg-primary-900/10 border border-primary-500/20 rounded-xl">
                                <Zap className="text-primary-400 shrink-0 mt-0.5" size={18} />
                                <p className="text-xs md:text-sm text-slate-300">
                                    Configure the <strong>Global Brain</strong>. These settings control intelligence, speed, and reasoning depth.
                                </p>
                            </div>

                            {/* Provider Selector - Compact single row */}
                            <div className="flex items-center gap-2 mb-4">
                                {/* Provider Switch Icons */}
                                <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 border border-white/5">
                                    {(['gemini', 'openai', 'anthropic', 'openrouter'] as ProviderId[]).map((pid) => {
                                        const hasKey = providerKeys[pid];
                                        const isActive = activeProvider === pid;

                                        return (
                                            <button
                                                key={pid}
                                                onClick={() => handleProviderChange(pid)}
                                                disabled={!hasKey}
                                                className={`p-1.5 md:p-2 rounded-md transition-all flex items-center justify-center ${isActive
                                                    ? 'bg-primary-500/20 border border-primary-500/30'
                                                    : 'hover:bg-white/5 active:bg-white/10'
                                                    } ${!hasKey ? 'opacity-50 grayscale pointer-events-none cursor-not-allowed' : ''}`}
                                                title={hasKey ? PROVIDERS[pid].displayName : `${PROVIDERS[pid].displayName} (No API Key)`}
                                            >
                                                <img
                                                    src={PROVIDERS[pid].logoPath}
                                                    alt={PROVIDERS[pid].displayName}
                                                    className={`w-4 h-4 object-contain ${!isActive && hasKey ? 'opacity-50' : ''}`}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>
                                {/* Active Provider Label */}
                                <span className="text-xs md:text-sm font-medium text-white">{PROVIDERS[activeProvider].displayName}</span>
                            </div>

                            {activeProvider === 'openrouter' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-200">Select Model</label>
                                        <div className="text-xs text-slate-400">
                                            Access 100+ models via OpenRouter
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-900/50 rounded-xl border border-white/10">
                                        <OpenRouterModelSelector
                                            selectedModel={selectedModelId}
                                            onModelSelect={(newModelId) => {
                                                setSelectedModelId(newModelId);
                                                setDefaultModel(activeProvider, newModelId);
                                                updateSettings({ modelName: newModelId, preset: 'custom' });
                                            }}
                                        />
                                    </div>
                                </div>

                            ) : (
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-200 mb-3">Model Tier</label>
                                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                                        {(['fast', 'mid', 'complex'] as const).map((tier) => {
                                            const tierModels = providerModels.filter(m => m.tier === tier);
                                            const model = tierModels[0];
                                            if (!model) return null;

                                            const isActive = selectedModelId === model.id;
                                            const tierLabels = {
                                                fast: { label: 'Fast', icon: '⚡', color: 'emerald' },
                                                mid: { label: 'Balanced', icon: '⚖️', color: 'blue' },
                                                complex: { label: 'Complex', icon: '🧠', color: 'purple' },
                                            };
                                            const tierInfo = tierLabels[tier];

                                            return (
                                                <button
                                                    key={tier}
                                                    onClick={() => {
                                                        setSelectedModelId(model.id);
                                                        setDefaultModel(activeProvider, model.id);
                                                        // Update global settings.modelName for ALL providers
                                                        // Update global settings.modelName for ALL providers
                                                        updateSettings({ modelName: model.id, preset: 'custom' });
                                                    }}
                                                    className={`relative text-left p-2 md:p-3 rounded-lg md:rounded-xl border transition-all duration-300 group ${isActive
                                                        ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                        : 'bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-800'
                                                        }`}
                                                >
                                                    {/* Tier Header */}
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-1 md:gap-2">
                                                            <span className="text-sm md:text-lg">{tierInfo.icon}</span>
                                                            <span className={`text-xs md:text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                                {tierInfo.label}
                                                            </span>
                                                        </div>
                                                        {isActive && <Check size={14} className="text-primary-400" />}
                                                    </div>

                                                    {/* Model Name */}
                                                    <p className="text-[10px] md:text-xs text-slate-400 mb-1 truncate" title={model.displayName}>
                                                        {model.displayName}
                                                    </p>

                                                    {/* Cost Indicator */}
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] md:text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                                                            ${model.inputCostPerMillion.toFixed(2)}/1M
                                                        </span>
                                                        <span className="text-[9px] md:text-[10px] text-slate-600 hidden md:inline">in</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Selected Model Details */}
                                    {currentModelConfig && (
                                        <div className="mt-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                                            <div className="text-xs text-slate-400 line-clamp-2 md:line-clamp-1">
                                                {currentModelConfig.description}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 text-right">
                                                <span className="text-[10px] text-slate-600">
                                                    {(currentModelConfig.inputContextLimit / 1000).toFixed(0)}k ctx
                                                </span>
                                                <PricingIndicator
                                                    modelConfig={currentModelConfig}
                                                    inputTokens={5000}
                                                    estimatedOutputTokens={1000}
                                                    showBreakdown={true}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Custom Instructions Section */}
                            <div className="border-t border-slate-800 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare size={16} className="text-blue-400" />
                                    <label className="text-sm font-bold text-slate-200">Global Custom Instructions</label>
                                </div>
                                <TextArea
                                    label=""
                                    placeholder="e.g. 'Always use TypeScript', 'Prefer functional components', 'Avoid external libraries unless necessary'."
                                    value={settings.customInstructions || ''}
                                    onChange={(e) => updateSettings({ customInstructions: e.target.value })}
                                    className="min-h-[100px] text-xs font-mono"
                                    tooltip="These instructions are appended to every AI request (Research, PRD, Tech, etc.). Use this for project-wide constraints."
                                />
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <button
                                    onClick={() => setShowAdvancedAI(!showAdvancedAI)}
                                    className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-4 w-full"
                                >
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvancedAI ? 'rotate-180' : ''}`} />
                                    {showAdvancedAI ? 'Hide Advanced Settings' : 'Show Advanced Settings (Manual Override)'}
                                </button>

                                {showAdvancedAI && (
                                    <div className="space-y-6 animate-fade-in pl-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fine-Tune Model</span>
                                            <button
                                                onClick={handleResetDefaults}
                                                className="flex items-center gap-1.5 text-[10px] text-primary-400 hover:text-primary-300 px-2 py-1 rounded bg-primary-900/10 border border-primary-500/20 hover:bg-primary-900/20 transition-colors"
                                            >
                                                <RefreshCcw size={10} /> Reset to Defaults
                                            </button>
                                        </div>

                                        {/* Specific Model Selection */}
                                        {/* Specific Model Selection - Hidden for OpenRouter */}
                                        {activeProvider !== 'openrouter' && (
                                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-4">


                                                {/* Anthropic Dynamic Selection Logic */}
                                                {isAnthropicProvider && (
                                                    <div className="space-y-4">
                                                        {isLoadingAnthropicModels ? (
                                                            <div className="flex items-center justify-center p-4 text-slate-400 text-sm border border-slate-800 rounded-lg">
                                                                <RefreshCcw className="animate-spin mr-2" size={16} /> Loading Claude models...
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                label="Specific Anthropic Model"
                                                                rightLabel={<span className="text-xs text-slate-400 normal-case tracking-normal font-normal">Fetched from API</span>}
                                                                value={selectedModelId}
                                                                onChange={handleModelChange}
                                                            >
                                                                {anthropicModels.map(model => (
                                                                    <option key={model.id} value={model.id}>
                                                                        {model.display_name} ({model.id})
                                                                    </option>
                                                                ))}
                                                                {anthropicModels.length === 0 && providerModels.map(model => (
                                                                    <option key={model.id} value={model.id}>
                                                                        {model.displayName}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                        )}
                                                    </div>
                                                )}

                                                {/* OpenAI Dynamic Selection Logic */}
                                                {isOpenAIProvider && (
                                                    <div className="space-y-4">
                                                        {isLoadingOpenAIModels ? (
                                                            <div className="flex items-center justify-center p-4 text-slate-400 text-sm border border-slate-800 rounded-lg">
                                                                <RefreshCcw className="animate-spin mr-2" size={16} /> Loading OpenAI models...
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                label="Specific OpenAI Model"
                                                                rightLabel={<span className="text-xs text-slate-400 normal-case tracking-normal font-normal">Fetched from API</span>}
                                                                value={selectedModelId}
                                                                onChange={handleModelChange}
                                                            >
                                                                {openAIModels.map(model => (
                                                                    <option key={model.id} value={model.id}>
                                                                        {model.id}
                                                                    </option>
                                                                ))}
                                                                {openAIModels.length === 0 && providerModels.map(model => (
                                                                    <option key={model.id} value={model.id}>
                                                                        {model.displayName}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Gemini Dynamic Selection Logic */}
                                                {isGeminiProvider && (
                                                    <div className="space-y-4">
                                                        {isLoadingGeminiModels ? (
                                                            <div className="flex items-center justify-center p-4 text-slate-400 text-sm border border-slate-800 rounded-lg">
                                                                <RefreshCcw className="animate-spin mr-2" size={16} /> Loading Gemini models...
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                label="Specific Gemini Model"
                                                                rightLabel={<span className="text-xs text-slate-400 normal-case tracking-normal font-normal">Fetched from API</span>}
                                                                value={selectedModelId}
                                                                onChange={handleModelChange}
                                                            >
                                                                {geminiModels.map(model => (
                                                                    <option key={model.name} value={model.name.replace('models/', '')}>
                                                                        {model.displayName} ({model.version})
                                                                    </option>
                                                                ))}
                                                                {geminiModels.length === 0 && (
                                                                    <option value={selectedModelId}>{selectedModelId}</option>
                                                                )}
                                                            </Select>
                                                        )}

                                                        {/* Gemini Features moved here per "easy mode" request */}
                                                        <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini Features</span>

                                                            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <BrainCircuit size={16} className="text-purple-400" />
                                                                    <label className="text-sm font-medium text-slate-300">Thinking Budget</label>
                                                                    <Tooltip content="Tokens reserved for reasoning.">
                                                                        <span className="text-slate-600 hover:text-primary-400 active:text-white cursor-help text-xs">ⓘ</span>
                                                                    </Tooltip>
                                                                    <span className="ml-auto text-xs font-mono text-slate-400">
                                                                        {settings.thinkingBudget > 0 ? `${(settings.thinkingBudget / 1024).toFixed(0)}k` : 'Off'}
                                                                    </span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="32768"
                                                                    step="1024"
                                                                    value={settings.thinkingBudget}
                                                                    onChange={handleBudgetChange}
                                                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
                                                                <div className="flex items-center gap-3">
                                                                    <Search size={16} className="text-blue-400" />
                                                                    <div>
                                                                        <label className="font-medium text-slate-300 text-sm">Search Grounding</label>
                                                                    </div>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={settings.useGrounding}
                                                                        onChange={handleGroundingChange}
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Model ID & Context Info */}
                                                {(currentModelConfig || (isGeminiProvider && geminiModels.find(m => m.name === `models/${selectedModelId}`))) && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Model ID</label>
                                                            <code className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded block truncate" title={currentModelConfig?.id || selectedModelId}>
                                                                {currentModelConfig?.id || selectedModelId}
                                                            </code>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Pricing</label>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-mono text-emerald-400">${currentModelConfig?.inputCostPerMillion ?? '?'}</span>
                                                                <span className="text-[10px] text-slate-600">in /</span>
                                                                <span className="text-[11px] font-mono text-amber-400">${currentModelConfig?.outputCostPerMillion ?? '?'}</span>
                                                                <span className="text-[10px] text-slate-600">out per 1M</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Context Window Visualization */}
                                                {currentModelConfig && (
                                                    <div>
                                                        <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 block">Context Window</label>
                                                        <ContextBar
                                                            modelConfig={currentModelConfig}
                                                            inputTokensUsed={0}
                                                            outputTokensUsed={0}
                                                            showOutput={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Reasoning Effort (OpenAI GPT-5.2 only) */}
                                        {showReasoningEffort && currentModelConfig && (
                                            <ReasoningEffortSelector
                                                modelConfig={currentModelConfig}
                                                value={reasoningEffort}
                                                onChange={setReasoningEffort}
                                            />
                                        )}

                                    </div>
                                )}

                                {/* Generation Parameters */}
                                <div className="space-y-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generation Parameters</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 ${!supportsTemperature ? 'opacity-50 grayscale' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-slate-400">Temperature</label>
                                                <span className="text-xs font-mono text-primary-400">
                                                    {!supportsTemperature ? 'N/A' : (settings.temperature ?? 0.7)}
                                                </span>
                                            </div>
                                            <input
                                                type="range" min="0" max="2" step="0.1"
                                                value={settings.temperature ?? 0.7}
                                                onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value), preset: 'custom' })}
                                                disabled={!supportsTemperature}
                                                className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${supportsTemperature ? 'accent-primary-500' : 'cursor-not-allowed'}`}
                                            />
                                            <p className="text-[9px] text-slate-600 mt-1">
                                                {!supportsTemperature ? 'Not supported by this model' : 'Lower = focused, Higher = creative'}
                                            </p>
                                        </div>
                                        <div className={`p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 ${!supportsTopP ? 'opacity-50 grayscale' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-slate-400">Top P</label>
                                                <span className="text-xs font-mono text-primary-400">
                                                    {!supportsTopP ? 'N/A' : (settings.topP ?? 0.95)}
                                                </span>
                                            </div>
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={settings.topP ?? 0.95}
                                                onChange={(e) => updateSettings({ topP: parseFloat(e.target.value), preset: 'custom' })}
                                                disabled={!supportsTopP}
                                                className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${supportsTopP ? 'accent-primary-500' : 'cursor-not-allowed'}`}
                                            />
                                            <p className="text-[9px] text-slate-600 mt-1">
                                                {!supportsTopP ? 'Not supported by this model' : 'Nucleus sampling threshold'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Expert Settings Section (v1) */}
                                <div className="border-t border-slate-800/50 pt-4 mt-4">
                                    <button
                                        onClick={() => setShowExpertSettings(!showExpertSettings)}
                                        className="flex items-center gap-2 text-xs font-medium text-amber-400/80 hover:text-amber-300 transition-colors mb-4 w-full"
                                    >
                                        <Wrench size={12} />
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${showExpertSettings ? 'rotate-180' : ''}`} />
                                        {showExpertSettings ? 'Hide Expert Settings' : 'Show Expert Settings (API Overrides)'}
                                    </button>

                                    {showExpertSettings && (
                                        <div className="space-y-4 animate-fade-in">
                                            {/* Warning Banner */}
                                            <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-200/80">
                                                    These settings override API defaults. Only set values you understand—incorrect settings may cause errors or unexpected behavior.
                                                </p>
                                            </div>

                                            <div className="space-y-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        {PROVIDERS[activeProvider].displayName} Expert
                                                    </span>
                                                    <button
                                                        onClick={handleResetExpertSettings}
                                                        className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-900/10 border border-amber-500/20 hover:bg-amber-900/20 transition-colors"
                                                    >
                                                        <RefreshCcw size={10} />
                                                        Reset Expert
                                                    </button>
                                                </div>

                                                {/* Max Output Tokens */}
                                                {providerCapabilities.supportsMaxTokens && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs text-slate-400">Max Output Tokens</label>
                                                            <span className="text-xs font-mono text-amber-400">
                                                                {expertMaxTokens ?? 'default'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={currentModelConfig?.outputContextLimit || 16384}
                                                            step="256"
                                                            value={expertMaxTokens ?? 0}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                setExpertMaxTokens(val === 0 ? undefined : val);
                                                            }}
                                                            onMouseUp={saveExpertSettings}
                                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                        />
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            Maximum tokens in the response. Set to 0 for provider default.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Top K */}
                                                {capabilities.supportsTopK && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs text-slate-400">Top K</label>
                                                            <span className="text-xs font-mono text-amber-400">
                                                                {expertTopK ?? 'default'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={expertTopK ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setExpertTopK(val === '' ? undefined : parseInt(val));
                                                            }}
                                                            onBlur={saveExpertSettings}
                                                            placeholder="Model Default (1-100)"
                                                            className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                                                        />
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            Limit selection to the top K tokens. 0 or empty for default.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Repetition Penalty */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs text-slate-400">Repetition Penalty</label>
                                                        <span className="text-xs font-mono text-amber-400">
                                                            {expertRepetitionPenalty ?? 'default'}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="2"
                                                        step="0.05"
                                                        value={expertRepetitionPenalty ?? 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            setExpertRepetitionPenalty(val === 0 ? undefined : val);
                                                        }}
                                                        onMouseUp={saveExpertSettings}
                                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                    <p className="text-[9px] text-slate-600 mt-1">
                                                        Higher values penalize repetition. 0 for default.
                                                    </p>
                                                </div>

                                                {/* Reasoning & JSON */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/50">

                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs text-slate-400">Reasoning</label>
                                                            <input
                                                                type="checkbox"
                                                                checked={expertIncludeReasoning}
                                                                onChange={(e) => setExpertIncludeReasoning(e.target.checked)}
                                                                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                                                            />
                                                        </div>
                                                        {expertIncludeReasoning && (
                                                            <div className="space-y-2 mt-2">
                                                                <select
                                                                    value={expertReasoningEffort}
                                                                    onChange={(e) => setExpertReasoningEffort(e.target.value as any)}
                                                                    className="w-full text-[10px] bg-slate-950 border border-slate-700 rounded px-1 py-1 text-slate-300"
                                                                >
                                                                    <option value="minimal">Minimal Effort</option>
                                                                    <option value="low">Low Effort</option>
                                                                    <option value="medium">Medium Effort</option>
                                                                    <option value="high">High Effort</option>
                                                                </select>

                                                                {capabilities.supportsReasoningMaxTokens && (
                                                                    <div>
                                                                        <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                                                            <span>Reasoning Tokens</span>
                                                                            <span className="font-mono text-amber-500/80">{expertReasoningMaxTokens || 'Default'}</span>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            min="1024"
                                                                            max="32000"
                                                                            placeholder="Max (1024-32000)"
                                                                            value={expertReasoningMaxTokens || ''}
                                                                            onChange={(e) => setExpertReasoningMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)}
                                                                            className="w-full text-[10px] bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 placeholder-slate-600"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="text-[9px] text-amber-600/90 leading-tight">
                                                                    ⚠️ Increases cost significantly
                                                                </div>
                                                            </div>
                                                        )}
                                                        <p className="text-[9px] text-slate-600 mt-2">
                                                            Enable chain-of-thought.
                                                        </p>
                                                    </div>

                                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/50">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs text-slate-400">Force JSON</label>
                                                            <input
                                                                type="checkbox"
                                                                checked={expertForceJson}
                                                                onChange={(e) => setExpertForceJson(e.target.checked)}
                                                                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                                                            />
                                                        </div>
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            Enforce valid JSON output structure.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Stop Sequences */}
                                                {providerCapabilities.supportsStop && (
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-2">
                                                            Stop Sequences <span className="text-slate-600">(one per line)</span>
                                                        </label>
                                                        <textarea
                                                            value={expertStopSequences}
                                                            onChange={(e) => setExpertStopSequences(e.target.value)}
                                                            onBlur={saveExpertSettings}
                                                            placeholder="Enter stop sequences...&#10;e.g. ```&#10;###"
                                                            className="w-full h-16 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500/50"
                                                        />
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            AI will stop generating when it encounters these strings.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Seed (OpenAI/OpenRouter only) */}
                                                {providerCapabilities.supportsSeed && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs text-slate-400">Seed</label>
                                                            <span className="text-xs font-mono text-amber-400">
                                                                {expertSeed ?? 'random'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="2147483647"
                                                            value={expertSeed ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setExpertSeed(val === '' ? undefined : parseInt(val));
                                                            }}
                                                            onBlur={saveExpertSettings}
                                                            placeholder="Leave empty for random"
                                                            className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                                                        />
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            For deterministic outputs. May not be supported by all models.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Gemini Safety Preset */}
                                                {providerCapabilities.supportsSafety && (
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-2">
                                                            Safety Level
                                                        </label>
                                                        <select
                                                            value={expertSafetyPreset}
                                                            onChange={(e) => {
                                                                setExpertSafetyPreset(e.target.value as GeminiSafetyPreset);
                                                                // Save immediately
                                                                const stopSeqArray = expertStopSequences.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                                                                setExpertSettings(activeProvider, {
                                                                    ...(expertMaxTokens !== undefined && { maxOutputTokens: expertMaxTokens }),
                                                                    ...(stopSeqArray.length > 0 && { stopSequences: stopSeqArray }),
                                                                    ...(expertSeed !== undefined && { seed: expertSeed }),
                                                                    safetyPreset: e.target.value as GeminiSafetyPreset,
                                                                });
                                                            }}
                                                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500/50"
                                                        >
                                                            <option value="default">Default (Provider Standard)</option>
                                                            <option value="relaxed">Relaxed (Minimal Blocking)</option>
                                                            <option value="balanced">Balanced (Medium Blocking)</option>
                                                            <option value="strict">Strict (Maximum Blocking)</option>
                                                        </select>
                                                        <p className="text-[9px] text-slate-600 mt-1">
                                                            Controls content safety thresholds for all harm categories.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- General Tab --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-200 mb-4">Interface & Defaults</h3>

                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <User size={16} className="text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <label className="font-medium text-slate-300 block text-xs">Default Persona</label>
                                    <p className="text-[10px] text-slate-400">Skip selection screen</p>
                                </div>
                                <div className="w-32">
                                    <Select
                                        label=""
                                        value={settings.defaultPersona || ''}
                                        onChange={(e) => updateSettings({ defaultPersona: e.target.value as Persona || null })}
                                        className="!mb-0 !py-1.5 !text-xs"
                                    >
                                        <option value="">None (Ask)</option>
                                        <option value={Persona.VibeCoder}>Vibe-Coder</option>
                                        <option value={Persona.Developer}>Developer</option>
                                        <option value={Persona.InBetween}>Learner</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Bell size={16} className="text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <label className="font-medium text-slate-300 block text-xs">Notifications</label>
                                    <p className="text-[10px] text-slate-400">Toast position</p>
                                </div>
                                <div className="w-32">
                                    <Select
                                        label=""
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value as ToastPosition)}
                                        className="!mb-0 !py-1.5 !text-xs"
                                    >
                                        <option value="top-right">Top Right</option>
                                        <option value="top-left">Top Left</option>
                                        <option value="bottom-right">Bottom Right</option>
                                        <option value="bottom-left">Bottom Left</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Clock size={16} className="text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <label className="font-medium text-slate-300 block text-xs">Auto-Save Interval</label>
                                    <p className="text-[10px] text-slate-400">How often to save changes</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-500">0.5s</span>
                                    <input
                                        type="range" min="500" max="5000" step="500"
                                        value={settings.autoSaveInterval || 1000}
                                        onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })}
                                        className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <span className="text-[9px] text-slate-500">5s</span>
                                    <span className="text-[10px] font-mono font-bold text-emerald-400 w-10 text-right">{((settings.autoSaveInterval || 1000) / 1000).toFixed(1)}s</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <BarChart2 size={16} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <label className="font-medium text-slate-300 block text-xs">Show Model Status Bar</label>
                                        <p className="text-[10px] text-slate-400">Display AI model info at top of pages</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localStorage.getItem('model-status-dismissed') !== 'true'}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                localStorage.removeItem('model-status-dismissed');
                                            } else {
                                                localStorage.setItem('model-status-dismissed', 'true');
                                            }
                                            // Dispatch custom event to notify ModelStatus component
                                            window.dispatchEvent(new Event('model-status-visibility-changed'));
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pt-4">
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <EyeOff size={16} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <label className="font-medium text-slate-300 block text-xs">Reduced Motion</label>
                                            <p className="text-[10px] text-slate-400">Disable heavy animations.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.reducedMotion ?? false}
                                            onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Activity size={16} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <label className="font-medium text-slate-300 block text-xs">Usage Analytics</label>
                                            <p className="text-[10px] text-slate-400">Help improve Vibe Coding.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enableAnalytics ?? true}
                                            onChange={(e) => updateSettings({ enableAnalytics: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Export Tab --- */}
                    {activeTab === 'export' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-200 mb-4">Export Preferences</h3>

                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <FileArchive size={16} className="text-orange-400" />
                                </div>
                                <div className="flex-1">
                                    <label className="font-medium text-slate-300 block text-xs">Vibe Kit Export Format</label>
                                    <p className="text-[10px] text-slate-400">Format for Export & Deploy downloads</p>
                                </div>
                                <div className="w-32">
                                    <Select
                                        label=""
                                        value={settings.defaultExportFormat || 'zip'}
                                        onChange={(e) => updateSettings({ defaultExportFormat: e.target.value as 'zip' | 'markdown' })}
                                        className="!mb-0 !py-1.5 !text-xs"
                                    >
                                        <option value="zip">ZIP Archive</option>
                                        <option value="markdown">Markdown</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Download size={16} className="text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <label className="font-medium text-slate-300 block text-xs">Project Export Format</label>
                                    <p className="text-[10px] text-slate-400">Format for My Projects exports</p>
                                </div>
                                <div className="w-32">
                                    <Select
                                        label=""
                                        value={settings.projectExportFormat || 'json'}
                                        onChange={(e) => updateSettings({ projectExportFormat: e.target.value as 'json' | 'markdown' })}
                                        className="!mb-0 !py-1.5 !text-xs"
                                    >
                                        <option value="json">JSON</option>
                                        <option value="markdown">Markdown</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-400 leading-relaxed space-y-3">
                                <div>
                                    <p className="font-bold text-slate-300 mb-1">Vibe Kit Export</p>
                                    <p><strong>ZIP Archive:</strong> Best for starting a new project. Includes all folders, config files, and documentation ready for <code>git init</code>.</p>
                                    <p><strong>Markdown:</strong> Best for copying into an existing LLM chat. Combines all generated artifacts into a single clipboard-ready text block.</p>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div>
                                    <p className="font-bold text-slate-300 mb-1">Project Export</p>
                                    <p><strong>JSON:</strong> Complete project backup including all state. Can be re-imported to restore a project.</p>
                                    <p><strong>Markdown:</strong> Human-readable export of all generated artifacts. Cannot be re-imported.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Reset Tab --- */}
                    {activeTab === 'reset' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center justify-center h-full">
                            <div className="text-center max-w-md">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.5C6.75 2.5 2.5 6.75 2.5 12C2.5 17.25 6.75 21.5 12 21.5C17.25 21.5 21.5 17.25 21.5 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M17.5 2.5V8.5H21.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M21.5 8.5L17 13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M8 8L16 16M16 8L8 16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                                    </svg>
                                </div>

                                <h3 className="text-xl font-bold text-red-400 mb-3">Reset Application</h3>
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    This will permanently delete all your data and return the app to its initial state. This action cannot be undone.
                                </p>

                                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 mb-6">
                                    <p className="text-xs text-red-300/80 font-medium mb-2">The following will be deleted:</p>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60"></span>
                                            All projects and generated content
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60"></span>
                                            All API keys (Gemini, OpenAI, Claude, OpenRouter)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60"></span>
                                            All settings and preferences
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => setShowResetConfirmation(true)}
                                    className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105"
                                >
                                    <span className="flex items-center gap-3">
                                        <RotateCcw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                                        Reset Everything
                                    </span>
                                </button>
                            </div>

                            {/* Reset Confirmation Modal */}
                            <Modal
                                isOpen={showResetConfirmation}
                                onClose={() => setShowResetConfirmation(false)}
                                title="⚠️ Confirm Reset"
                                maxWidth="max-w-md"
                            >
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-950/50 border border-red-500/30 rounded-xl">
                                        <p className="text-sm text-red-200 font-medium mb-2">
                                            Are you absolutely sure?
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            This will permanently delete ALL your projects, API keys, and settings. The app will reload with a fresh state.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => setShowResetConfirmation(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // Clear all localStorage
                                                localStorage.clear();
                                                // Reload the app to reinitialize
                                                window.location.reload();
                                            }}
                                            className="flex-1 bg-red-600/80 hover:bg-red-500 border-red-500/50 shadow-none hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] text-white"
                                        >
                                            Yes, Reset Everything
                                        </Button>
                                    </div>
                                </div>
                            </Modal>
                        </div>
                    )}

                </div>
            </div >
        </Modal >
    );
};

export default SettingsModal;