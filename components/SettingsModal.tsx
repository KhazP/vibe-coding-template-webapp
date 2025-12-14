

import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import {
    Zap, BrainCircuit, Search, Check, Activity, Bell, User, Clock,
    FileArchive, EyeOff, Layout, Download, ChevronDown, RefreshCcw, MessageSquare,
    AlertTriangle, Wrench
} from 'lucide-react';
import { Modal, Tooltip, Select, TextArea, Button } from './UI';
import { MODEL_CONFIGS, PRESETS, DEFAULT_SETTINGS } from '../utils/constants';
import { PresetMode, ToastPosition, Persona, GeminiSafetyPreset, ExpertSettings } from '../types';
import { useToast } from './Toast';
import { getProviderSettings, setProviderSettings, setDefaultModel, getExpertSettings, setExpertSettings, resetExpertSettings, getEffectiveDefaultProvider } from '../utils/providerStorage';
import { PROVIDERS, type ProviderId } from '../utils/providers';
import { PROVIDER_MODELS, getModelsForProvider, getModelById, supportsReasoningEffort, type ModelConfig, type ReasoningEffort } from '../utils/modelUtils';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { PricingIndicator } from './PricingIndicator';
import { ContextBar } from './ContextBar';

type SettingsTab = 'ai' | 'general' | 'export';

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
    const [expertSafetyPreset, setExpertSafetyPreset] = useState<GeminiSafetyPreset>(
        (activeProvider === 'gemini' && (savedExpertSettings as any)?.safetyPreset) || 'default'
    );

    // Sync expert settings when provider changes
    useEffect(() => {
        const settings = getExpertSettings(activeProvider) || {};
        setExpertMaxTokens(settings.maxOutputTokens);
        setExpertStopSequences(settings.stopSequences?.join('\n') || '');
        setExpertSeed(settings.seed);
        if (activeProvider === 'gemini') {
            setExpertSafetyPreset((settings as any)?.safetyPreset || 'default');
        }
    }, [activeProvider]);

    // Get provider capabilities
    const providerCapabilities = PROVIDERS[activeProvider].capabilities;

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
        return getModelById(selectedModelId);
    }, [selectedModelId]);

    // Get models for active provider
    const providerModels = useMemo(() => {
        return getModelsForProvider(activeProvider);
    }, [activeProvider]);

    // Check if current provider is Gemini (for Gemini-specific settings)
    const isGeminiProvider = activeProvider === 'gemini';

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

        const expertData: ExpertSettings & { safetyPreset?: GeminiSafetyPreset } = {
            ...(expertMaxTokens !== undefined && { maxOutputTokens: expertMaxTokens }),
            ...(stopSeqArray.length > 0 && { stopSequences: stopSeqArray }),
            ...(expertSeed !== undefined && { seed: expertSeed }),
        };

        // Add Gemini-specific settings
        if (activeProvider === 'gemini' && expertSafetyPreset !== 'default') {
            expertData.safetyPreset = expertSafetyPreset;
        }

        setExpertSettings(activeProvider, expertData);
    };

    const handleResetExpertSettings = () => {
        resetExpertSettings(activeProvider);
        setExpertMaxTokens(undefined);
        setExpertStopSequences('');
        setExpertSeed(undefined);
        setExpertSafetyPreset('default');
    };

    const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
    const currentMaxBudget = currentConfig ? currentConfig.maxThinkingBudget : 32768;

    const TabButton: React.FC<{ id: SettingsTab; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left ${activeTab === id
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </button>
    );

    return (
        <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Global Settings" maxWidth="max-w-5xl">
            <div className="flex flex-col md:flex-row gap-6 md:h-[600px]">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:pr-4 md:border-r border-white/10">
                    <TabButton id="ai" icon={<BrainCircuit size={18} />} label="AI Brain" />
                    <TabButton id="general" icon={<Layout size={18} />} label="General" />
                    <TabButton id="export" icon={<Download size={18} />} label="Export" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 pb-4">

                    {/* --- AI Config Tab --- */}
                    {activeTab === 'ai' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-start gap-4 p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl">
                                <Zap className="text-primary-400 shrink-0 mt-1" size={20} />
                                <div>
                                    <p className="text-sm text-slate-300">
                                        Configure the <strong>Global Brain</strong>. These settings control intelligence, speed, and reasoning depth.
                                    </p>
                                </div>
                            </div>

                            {/* Provider Header with Logo */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center">
                                        <img
                                            src={PROVIDERS[activeProvider].logoPath}
                                            alt={PROVIDERS[activeProvider].displayName}
                                            className="w-6 h-6 object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{PROVIDERS[activeProvider].displayName}</h3>
                                        <p className="text-xs text-slate-500">Select model tier below</p>
                                    </div>
                                </div>
                                {/* Provider Switch Buttons */}
                                <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 border border-white/5">
                                    {(['gemini', 'openai', 'anthropic', 'openrouter'] as ProviderId[]).map((pid) => (
                                        <button
                                            key={pid}
                                            onClick={() => handleProviderChange(pid)}
                                            className={`p-2 rounded-md transition-all ${activeProvider === pid
                                                ? 'bg-primary-500/20 border border-primary-500/30'
                                                : 'hover:bg-white/5'
                                                }`}
                                            title={PROVIDERS[pid].displayName}
                                        >
                                            <img
                                                src={PROVIDERS[pid].logoPath}
                                                alt={PROVIDERS[pid].displayName}
                                                className={`w-4 h-4 object-contain ${activeProvider !== pid ? 'opacity-50' : ''}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-200 mb-4">Model Tier</label>
                                <div className="grid grid-cols-3 gap-3">
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
                                                    if (activeProvider === 'gemini') {
                                                        const maxBudget = MODEL_CONFIGS[model.id as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
                                                        updateSettings({ modelName: model.id, thinkingBudget: maxBudget, preset: 'custom' });
                                                    } else {
                                                        // For non-Gemini providers, just update the modelName
                                                        updateSettings({ modelName: model.id, preset: 'custom' });
                                                    }
                                                }}
                                                className={`relative text-left p-4 rounded-xl border transition-all duration-300 group ${isActive
                                                    ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                    : 'bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-800'
                                                    }`}
                                            >
                                                {/* Tier Header */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{tierInfo.icon}</span>
                                                        <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                            {tierInfo.label}
                                                        </span>
                                                    </div>
                                                    {isActive && <Check size={16} className="text-primary-400" />}
                                                </div>

                                                {/* Model Name */}
                                                <p className="text-xs text-slate-400 mb-2 truncate" title={model.displayName}>
                                                    {model.displayName}
                                                </p>

                                                {/* Cost Indicator */}
                                                <div className="flex items-center gap-1.5 mt-auto">
                                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                        ${model.inputCostPerMillion.toFixed(2)}/1M
                                                    </span>
                                                    <span className="text-[10px] text-slate-600">in</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected Model Details */}
                                {currentModelConfig && (
                                    <div className="mt-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-slate-400 truncate max-w-[300px]">
                                                {currentModelConfig.description}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
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
                                    className="min-h-[100px] text-xs font-mono bg-slate-950/50 border-slate-800"
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
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fine-Tune Model</span>
                                            <button
                                                onClick={handleResetDefaults}
                                                className="flex items-center gap-1.5 text-[10px] text-primary-400 hover:text-primary-300 px-2 py-1 rounded bg-primary-900/10 border border-primary-500/20 hover:bg-primary-900/20 transition-colors"
                                            >
                                                <RefreshCcw size={10} /> Reset to Defaults
                                            </button>
                                        </div>

                                        {/* Specific Model Selection */}
                                        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-4">
                                            <Select
                                                label={`Specific ${PROVIDERS[activeProvider].displayName} Model`}
                                                value={selectedModelId}
                                                onChange={handleModelChange}
                                                tooltip="Override the tier selection with a specific model variant."
                                            >
                                                {providerModels.map((model) => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.displayName} • {model.tier.toUpperCase()} • ${model.inputCostPerMillion}/1M
                                                    </option>
                                                ))}
                                            </Select>

                                            {/* Model ID & Context Info */}
                                            {currentModelConfig && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Model ID</label>
                                                        <code className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded block truncate" title={currentModelConfig.id}>
                                                            {currentModelConfig.id}
                                                        </code>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-600 uppercase tracking-wider mb-1 block">Pricing</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-mono text-emerald-400">${currentModelConfig.inputCostPerMillion}</span>
                                                            <span className="text-[10px] text-slate-600">in /</span>
                                                            <span className="text-[11px] font-mono text-amber-400">${currentModelConfig.outputCostPerMillion}</span>
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

                                        {/* Reasoning Effort (OpenAI GPT-5.2 only) */}
                                        {showReasoningEffort && currentModelConfig && (
                                            <ReasoningEffortSelector
                                                modelConfig={currentModelConfig}
                                                value={reasoningEffort}
                                                onChange={setReasoningEffort}
                                            />
                                        )}

                                        {/* Gemini-Specific Settings */}
                                        {isGeminiProvider && (
                                            <div className="space-y-4">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini Features</span>

                                                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <BrainCircuit size={16} className="text-purple-400" />
                                                        <label className="text-sm font-medium text-slate-300">Thinking Budget</label>
                                                        <Tooltip content="Tokens reserved for internal reasoning before answering.">
                                                            <span className="text-slate-600 hover:text-primary-400 cursor-help text-xs">ⓘ</span>
                                                        </Tooltip>
                                                        <span className="ml-auto text-xs font-mono text-slate-400">
                                                            {settings.thinkingBudget > 0 ? `${(settings.thinkingBudget / 1024).toFixed(0)}k` : 'Off'}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={currentMaxBudget}
                                                        step="1024"
                                                        value={settings.thinkingBudget}
                                                        onChange={handleBudgetChange}
                                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <Search size={18} className="text-blue-400" />
                                                        <div>
                                                            <label className="font-medium text-slate-300 text-sm">Search Grounding</label>
                                                            <p className="text-[10px] text-slate-600">Access real-time web info</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.useGrounding}
                                                            onChange={handleGroundingChange}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Generation Parameters */}
                                        <div className="space-y-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generation Parameters</span>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs text-slate-400">Temperature</label>
                                                        <span className="text-xs font-mono text-primary-400">{settings.temperature ?? 0.7}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="2" step="0.1"
                                                        value={settings.temperature ?? 0.7}
                                                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value), preset: 'custom' })}
                                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                                    />
                                                    <p className="text-[9px] text-slate-600 mt-1">Lower = focused, Higher = creative</p>
                                                </div>
                                                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs text-slate-400">Top P</label>
                                                        <span className="text-xs font-mono text-primary-400">{settings.topP ?? 0.95}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={settings.topP ?? 0.95}
                                                        onChange={(e) => updateSettings({ topP: parseFloat(e.target.value), preset: 'custom' })}
                                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                                    />
                                                    <p className="text-[9px] text-slate-600 mt-1">Nucleus sampling threshold</p>
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
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                                )}
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
                                    <p className="text-[10px] text-slate-500">Skip selection screen</p>
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
                                    <p className="text-[10px] text-slate-500">Toast position</p>
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
                                    <label className="font-medium text-slate-300 block text-xs">Auto-Save</label>
                                    <p className="text-[10px] text-slate-500">Interval (ms)</p>
                                </div>
                                <div className="w-32 flex items-center gap-2">
                                    <input
                                        type="range" min="500" max="5000" step="500"
                                        value={settings.autoSaveInterval || 1000}
                                        onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })}
                                        className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <span className="text-[10px] font-mono w-8 text-right">{settings.autoSaveInterval || 1000}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pt-4">
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <EyeOff size={16} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <label className="font-medium text-slate-300 block text-xs">Reduced Motion</label>
                                            <p className="text-[10px] text-slate-500">Disable heavy animations.</p>
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
                                            <p className="text-[10px] text-slate-500">Help improve Vibe Coding.</p>
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
                                    <label className="font-medium text-slate-300 block text-xs">Default Export Format</label>
                                    <p className="text-[10px] text-slate-500">Kit download type</p>
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

                            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-400 leading-relaxed">
                                <p>
                                    <strong>ZIP Archive:</strong> Best for starting a new project. Includes all folders, config files, and documentation ready for <code>git init</code>.
                                </p>
                                <div className="h-px bg-white/5 my-2" />
                                <p>
                                    <strong>Markdown:</strong> Best for copying into an existing LLM chat. Combines all generated artifacts into a single clipboard-ready text block.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;