
import React, { useEffect, useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings, BrainCircuit, Search, Cpu, Gauge, DollarSign, Database, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Tooltip, Button } from './UI';
import { PRESETS, TOKEN_LIMITS } from '../utils/constants';
import { getExactTokenCount, estimateTokens } from '../utils/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';
import { getProviderSettings, getDefaultModel } from '../utils/providerStorage';
import { PROVIDERS, type ProviderId } from '../utils/providers';
import { getModelById } from '../utils/modelUtils';

export const ModelStatus: React.FC = () => {
    const { state, setIsSettingsOpen, isSettingsOpen, apiKey } = useProject();
    const { settings, tokenUsage, answers, researchOutput, prdOutput, techOutput, agentOutputs } = state;
    const { addToast } = useToast();

    const [tokenCount, setTokenCount] = useState<number>(0);
    const [isCounting, setIsCounting] = useState<boolean>(false);
    const [isDismissed, setIsDismissed] = useState<boolean>(() =>
        localStorage.getItem('model-status-dismissed') === 'true'
    );

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('model-status-dismissed', 'true');
        addToast('Model status bar hidden. Re-enable in Settings > General.', 'info');
    };

    // Construct the "Current Context" string - what would be sent if we generated now?
    // We approximate the largest context scenario (Agent Gen uses everything)
    const contextString = useMemo(() => {
        return JSON.stringify(answers) +
            (researchOutput || '') +
            (prdOutput || '') +
            (techOutput || '') +
            JSON.stringify(agentOutputs);
    }, [answers, researchOutput, prdOutput, techOutput, agentOutputs]);

    // Get active provider and model info
    const providerInfo = useMemo(() => {
        const providerSettings = getProviderSettings();
        const providerId = providerSettings.defaultProvider;
        const provider = PROVIDERS[providerId];
        const modelId = providerSettings.defaultModels[providerId] || provider.defaultModels[0];
        const modelConfig = getModelById(modelId);
        return {
            providerId,
            provider,
            modelId,
            modelConfig,
            modelDisplayName: modelConfig?.displayName || modelId,
        };
    }, [isSettingsOpen]);  // Re-read when settings modal opens/closes

    // Listen for storage changes to restore visibility from settings
    useEffect(() => {
        const handleStorageChange = () => {
            setIsDismissed(localStorage.getItem('model-status-dismissed') === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        // Also listen for custom event for same-tab updates
        window.addEventListener('model-status-visibility-changed', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('model-status-visibility-changed', handleStorageChange);
        };
    }, []);

    // Debounced Token Counting (Uses API if available, else local estimate)
    useEffect(() => {
        // Skip token counting if dismissed
        if (isDismissed) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            if (!contextString) {
                setTokenCount(0);
                return;
            }

            // Use estimation for immediate feedback, refine with API
            const estimated = estimateTokens(contextString);

            // Only use exact token counting for Gemini models
            // Other providers (OpenAI, Anthropic) don't support Gemini's countTokens API
            const isGeminiModel = providerInfo.providerId === 'gemini';

            if (!apiKey || !isGeminiModel) {
                setTokenCount(estimated);
                return;
            }

            setIsCounting(true);
            try {
                // We use the exact count for precision as requested (Gemini only)
                const exact = await getExactTokenCount(contextString, settings.modelName, apiKey);
                if (isMounted) setTokenCount(exact);
            } catch (e) {
                if (isMounted) setTokenCount(estimated); // Fallback
            } finally {
                if (isMounted) setIsCounting(false);
            }
        }, 2000); // 2s debounce to avoid API spam

        return () => { isMounted = false; clearTimeout(timer); };
    }, [contextString, apiKey, settings.modelName, providerInfo.providerId, isDismissed]);

    const activePreset = Object.values(PRESETS).find(p => p.id === settings.preset);
    const isCustom = !activePreset;
    const costString = (tokenUsage?.estimatedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

    // Context Health Logic - use model's context limit
    const modelContextLimit = providerInfo.modelConfig?.inputContextLimit || TOKEN_LIMITS.INPUT_GLOBAL;
    const contextUsagePercent = Math.min(100, (tokenCount / modelContextLimit) * 100);

    // Dynamic thresholds based on model's context
    const warningThreshold = modelContextLimit * 0.7;  // 70% of context
    const criticalThreshold = modelContextLimit * 0.9;  // 90% of context

    let healthColor = 'bg-emerald-500';
    let healthStatus = 'Healthy';

    if (tokenCount > criticalThreshold) {
        healthColor = 'bg-red-500';
        healthStatus = 'Critical';
    } else if (tokenCount > warningThreshold) {
        healthColor = 'bg-amber-500';
        healthStatus = 'Heavy';
    }

    const handleOptimizeContext = () => {
        addToast('Context is large. Consider manually shortening Research or PRD outputs to improve latency.', 'info');
    };

    // Early return if dismissed - MUST be after all hooks!
    if (isDismissed) return null;

    return (
        <div className="bg-glass-100 backdrop-blur-xl border border-glass-border rounded-xl md:rounded-2xl p-2 md:px-3 md:py-2 text-xs font-mono text-slate-400 mb-4 md:mb-8 shadow-sm relative">
            {/* Subtle gradient sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50 pointer-events-none rounded-xl md:rounded-2xl" />

            {/* Single row layout for both mobile and desktop */}
            <div className="relative z-10 flex items-center justify-between gap-2 md:gap-3">

                {/* Left group: Model + Context */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    {/* Provider & Model */}
                    <Tooltip content={`Provider: ${providerInfo.provider.displayName}\nModel: ${providerInfo.modelId}\nInput: $${providerInfo.modelConfig?.inputCostPerMillion || '?'}/1M\nOutput: $${providerInfo.modelConfig?.outputCostPerMillion || '?'}/1M`}>
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/50 rounded-lg border border-white/5 cursor-help shrink-0">
                            <img
                                src={providerInfo.provider.logoPath}
                                alt={providerInfo.provider.displayName}
                                className="w-4 h-4 object-contain"
                            />
                            <span className="text-slate-200 max-w-[70px] md:max-w-[120px] truncate text-xs" title={providerInfo.modelDisplayName}>
                                {providerInfo.modelDisplayName}
                            </span>
                        </div>
                    </Tooltip>

                    {/* Context Bar - simplified */}
                    <Tooltip content={`Context: ${tokenCount.toLocaleString()} / ${modelContextLimit.toLocaleString()} tokens`}>
                        <div className="flex items-center gap-2 min-w-[100px] md:min-w-[140px] cursor-help">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 hidden md:inline">Context</span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${contextUsagePercent}%` }}
                                    className={`h-full ${healthColor}`}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <span className={`text-[10px] font-bold shrink-0 ${healthStatus === 'Critical' ? 'text-red-400' : healthStatus === 'Heavy' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {Math.round(contextUsagePercent)}%
                            </span>
                            {isCounting && <RefreshCw size={10} className="animate-spin text-slate-500" />}
                        </div>
                    </Tooltip>
                </div>

                {/* Center group: Stats (visible on desktop, selectively on mobile) */}
                <div className="hidden md:flex items-center gap-3 border-l border-white/5 pl-3">
                    {settings.thinkingBudget > 0 && providerInfo.providerId === 'gemini' && (
                        <div className="flex items-center gap-1 text-slate-300">
                            <BrainCircuit size={12} className="text-purple-400" />
                            <span className="text-xs">{(settings.thinkingBudget / 1024).toFixed(0)}k</span>
                        </div>
                    )}

                    {settings.useGrounding && providerInfo.providerId === 'gemini' && (
                        <div className="flex items-center gap-1 text-slate-300">
                            <Search size={12} className="text-blue-400" />
                        </div>
                    )}

                    {/* Cost */}
                    <Tooltip content={`Session: In ${tokenUsage?.input.toLocaleString()} / Out ${tokenUsage?.output.toLocaleString()}`}>
                        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/10 cursor-help">
                            <DollarSign size={10} />
                            <span className="text-xs">${costString}</span>
                        </div>
                    </Tooltip>
                </div>

                {/* Right group: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* Mobile-only cost badge */}
                    <div className="md:hidden flex items-center gap-1 text-emerald-400 bg-emerald-950/30 px-1.5 py-1 rounded text-xs">
                        <DollarSign size={10} />
                        ${costString}
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center justify-center gap-1.5 hover:bg-white/10 active:bg-white/20 transition-colors p-2 md:px-2.5 md:py-1.5 rounded-lg text-slate-300 hover:text-white group"
                        aria-label="Configure"
                    >
                        <Settings size={14} className="group-hover:rotate-45 transition-transform duration-500" />
                        <span className="hidden md:inline text-xs">Configure</span>
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/10 active:bg-white/20 transition-colors rounded-lg text-slate-500 hover:text-slate-300"
                        aria-label="Hide status bar"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Health warning - shown below when context is heavy */}
            <AnimatePresence>
                {healthStatus !== 'Healthy' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-2 border-t border-white/5"
                    >
                        <button
                            onClick={handleOptimizeContext}
                            className="flex items-center gap-2 text-amber-400 text-xs hover:underline"
                        >
                            <AlertCircle size={12} />
                            <span>Context is {healthStatus.toLowerCase()}. Consider shortening outputs.</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
