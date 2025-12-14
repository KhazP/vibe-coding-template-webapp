
import React, { useEffect, useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings, BrainCircuit, Search, Cpu, Gauge, DollarSign, Database, AlertCircle, RefreshCw } from 'lucide-react';
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

    // Construct the "Current Context" string - what would be sent if we generated now?
    // We approximate the largest context scenario (Agent Gen uses everything)
    const contextString = useMemo(() => {
        return JSON.stringify(answers) +
            (researchOutput || '') +
            (prdOutput || '') +
            (techOutput || '') +
            JSON.stringify(agentOutputs);
    }, [answers, researchOutput, prdOutput, techOutput, agentOutputs]);

    // Debounced Token Counting (Uses API if available, else local estimate)
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            if (!contextString) {
                setTokenCount(0);
                return;
            }

            // Use estimation for immediate feedback, refine with API
            const estimated = estimateTokens(contextString);
            if (!apiKey) {
                setTokenCount(estimated);
                return;
            }

            setIsCounting(true);
            try {
                // We use the exact count for precision as requested
                const exact = await getExactTokenCount(contextString, settings.modelName, apiKey);
                if (isMounted) setTokenCount(exact);
            } catch (e) {
                if (isMounted) setTokenCount(estimated); // Fallback
            } finally {
                if (isMounted) setIsCounting(false);
            }
        }, 2000); // 2s debounce to avoid API spam

        return () => { isMounted = false; clearTimeout(timer); };
    }, [contextString, apiKey, settings.modelName]);

    const activePreset = Object.values(PRESETS).find(p => p.id === settings.preset);
    const isCustom = !activePreset;
    const costString = (tokenUsage?.estimatedCost || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });

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

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-1 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-6 shadow-sm">

            {/* Provider & Model Label */}
            <Tooltip content={`Provider: ${providerInfo.provider.displayName}\nModel: ${providerInfo.modelId}\nInput: $${providerInfo.modelConfig?.inputCostPerMillion || '?'}/1M\nOutput: $${providerInfo.modelConfig?.outputCostPerMillion || '?'}/1M`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-white/5 cursor-help">
                    <img
                        src={providerInfo.provider.logoPath}
                        alt={providerInfo.provider.displayName}
                        className="w-4 h-4 object-contain"
                    />
                    <span className="text-slate-200 max-w-[120px] truncate" title={providerInfo.modelDisplayName}>
                        {providerInfo.modelDisplayName}
                    </span>
                    {providerInfo.modelConfig && (
                        <span className="text-[10px] text-emerald-400/70 font-mono">
                            ${providerInfo.modelConfig.inputCostPerMillion}/1M
                        </span>
                    )}
                </div>
            </Tooltip>

            {/* Context Health Bar (Smart Indicator) */}
            <Tooltip content={`Current Context: ${tokenCount.toLocaleString()} / ${modelContextLimit.toLocaleString()} tokens. ${healthStatus === 'Heavy' ? 'High latency expected.' : ''}`}>
                <div className="flex flex-col gap-1 w-32 md:w-48 px-2 py-1 cursor-help">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
                        <span className="flex items-center gap-1">
                            Context {isCounting && <RefreshCw size={8} className="animate-spin ml-1" />}
                        </span>
                        <span className={healthStatus === 'Critical' ? 'text-red-400' : healthStatus === 'Heavy' ? 'text-amber-400' : 'text-emerald-400'}>
                            {Math.round(contextUsagePercent)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${contextUsagePercent}%` }}
                            className={`h-full ${healthColor}`}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </Tooltip>

            {/* Optimize Action (Only if heavy) */}
            <AnimatePresence>
                {healthStatus !== 'Healthy' && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={handleOptimizeContext}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-900/20 border border-amber-500/20 text-amber-400 hover:bg-amber-900/40 transition-colors"
                    >
                        <AlertCircle size={12} />
                        <span>Check</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Stats */}
            <div className="flex items-center gap-4 px-2 overflow-x-auto whitespace-nowrap border-l border-white/5 pl-4">
                {settings.thinkingBudget > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <BrainCircuit size={14} className="text-purple-400" />
                        <span className="hidden md:inline">{settings.thinkingBudget.toLocaleString()} think</span>
                    </div>
                )}

                {settings.useGrounding && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Search size={14} className="text-blue-400" />
                        <span className="hidden md:inline">Grounding</span>
                    </div>
                )}

                {/* Cost Estimator */}
                <Tooltip content={`Total Session Usage:\nInput: ${tokenUsage?.input.toLocaleString()}\nOutput: ${tokenUsage?.output.toLocaleString()}\nGrounding: ${tokenUsage?.groundingRequests || 0}`}>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-500/10 cursor-help">
                        <DollarSign size={12} />
                        <span>{costString}</span>
                    </div>
                </Tooltip>
            </div>

            {/* Configure Button */}
            <div className="ml-auto">
                <Tooltip content="Adjust intelligence, speed, and thinking depth.">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-2 hover:bg-white/10 transition-colors px-3 py-2 rounded-lg text-slate-300 hover:text-white group border border-transparent hover:border-white/10"
                    >
                        <Settings size={14} className="group-hover:rotate-45 transition-transform duration-500" />
                        <span>Configure</span>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
