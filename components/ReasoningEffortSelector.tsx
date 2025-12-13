/**
 * Reasoning Effort Selector Component
 * 
 * Dynamic toggle for GPT-5.2 reasoning effort levels.
 * Only visible when the selected model supports reasoning effort.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import type { ModelConfig, ReasoningEffort } from '../utils/modelUtils';
import { supportsReasoningEffort } from '../utils/modelUtils';
import { Tooltip } from './UI';

interface ReasoningEffortSelectorProps {
    modelConfig: ModelConfig;
    value: ReasoningEffort;
    onChange: (effort: ReasoningEffort) => void;
    disabled?: boolean;
    className?: string;
}

const EFFORT_LABELS: Record<ReasoningEffort, { label: string; description: string }> = {
    low: {
        label: 'Low',
        description: 'Minimal reasoning. Fastest responses.',
    },
    medium: {
        label: 'Medium',
        description: 'Balanced reasoning and speed. Recommended for most tasks.',
    },
    high: {
        label: 'High',
        description: 'Extended reasoning for complex problems.',
    },
    xhigh: {
        label: 'X-High',
        description: 'Maximum reasoning effort. May take longer to respond.',
    },
};

export const ReasoningEffortSelector: React.FC<ReasoningEffortSelectorProps> = ({
    modelConfig,
    value,
    onChange,
    disabled = false,
    className = '',
}) => {
    // Don't render if model doesn't support reasoning effort
    if (!supportsReasoningEffort(modelConfig)) {
        return null;
    }

    const availableEfforts = modelConfig.reasoningEfforts || [];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`space-y-2 ${className}`}
            >
                <div className="flex items-center gap-2">
                    <Brain size={14} className="text-primary-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Reasoning Effort
                    </span>
                    <Tooltip
                        content="Higher reasoning effort results in more thorough analysis but may increase response time and token usage."
                        position="right"
                    >
                        <span className="text-[10px] text-slate-600 cursor-help">ⓘ</span>
                    </Tooltip>
                </div>

                <div className="flex gap-1 p-1 bg-surface/50 rounded-lg border border-white/5">
                    {availableEfforts.map((effort) => {
                        const isSelected = value === effort;
                        const { label, description } = EFFORT_LABELS[effort];

                        return (
                            <Tooltip key={effort} content={description} position="bottom">
                                <button
                                    onClick={() => !disabled && onChange(effort)}
                                    disabled={disabled}
                                    className={`
                    relative flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-300'
                                        }
                  `}
                                >
                                    {isSelected && (
                                        <motion.div
                                            layoutId="reasoning-effort-bg"
                                            className="absolute inset-0 bg-primary-500/20 border border-primary-500/30 rounded-md"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                        />
                                    )}
                                    <span className="relative z-10">{label}</span>
                                </button>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Visual indicator for current effort level */}
                <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                        {availableEfforts.map((effort, index) => {
                            const currentIndex = availableEfforts.indexOf(value);
                            const isFilled = index <= currentIndex;

                            return (
                                <motion.div
                                    key={effort}
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{
                                        scale: isFilled ? 1 : 0.8,
                                        opacity: isFilled ? 1 : 0.3
                                    }}
                                    className={`w-2 h-2 rounded-full ${isFilled
                                            ? index >= 3
                                                ? 'bg-purple-500'
                                                : index >= 2
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            : 'bg-white/10'
                                        }`}
                                />
                            );
                        })}
                    </div>
                    <span className="text-[10px] text-slate-600">
                        {value === 'xhigh' && '⚡ Maximum reasoning power'}
                        {value === 'high' && '🧠 Extended analysis'}
                        {value === 'medium' && '⚖️ Balanced'}
                        {value === 'low' && '🚀 Fast responses'}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Compact inline version
export const ReasoningBadge: React.FC<{
    effort: ReasoningEffort;
}> = ({ effort }) => {
    const colors: Record<ReasoningEffort, string> = {
        low: 'bg-slate-500/20 text-slate-400',
        medium: 'bg-emerald-500/20 text-emerald-400',
        high: 'bg-amber-500/20 text-amber-400',
        xhigh: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[effort]}`}>
            {EFFORT_LABELS[effort].label}
        </span>
    );
};

export default ReasoningEffortSelector;
