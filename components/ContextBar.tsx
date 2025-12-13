/**
 * Context Bar Component
 * 
 * Progress bar showing token usage relative to model's context limit.
 * Includes warning/critical states and formatted token counts.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ModelConfig } from '../utils/modelUtils';
import { getContextUsagePercent, getContextStatus, formatTokenCount } from '../utils/modelUtils';

interface ContextBarProps {
    modelConfig: ModelConfig;
    inputTokensUsed: number;
    outputTokensUsed?: number;
    showOutput?: boolean;
    compact?: boolean;
    className?: string;
}

export const ContextBar: React.FC<ContextBarProps> = ({
    modelConfig,
    inputTokensUsed,
    outputTokensUsed = 0,
    showOutput = false,
    compact = false,
    className = '',
}) => {
    const inputPercent = getContextUsagePercent(modelConfig, inputTokensUsed, 'input');
    const outputPercent = getContextUsagePercent(modelConfig, outputTokensUsed, 'output');
    const inputStatus = getContextStatus(inputPercent);
    const outputStatus = getContextStatus(outputPercent);

    const getStatusColor = (status: 'normal' | 'warning' | 'critical') => {
        switch (status) {
            case 'critical':
                return 'bg-red-500';
            case 'warning':
                return 'bg-amber-500';
            default:
                return 'bg-emerald-500';
        }
    };

    const getStatusGlow = (status: 'normal' | 'warning' | 'critical') => {
        switch (status) {
            case 'critical':
                return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            case 'warning':
                return 'shadow-[0_0_8px_rgba(245,158,11,0.3)]';
            default:
                return '';
        }
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${inputPercent}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`h-full ${getStatusColor(inputStatus)} ${getStatusGlow(inputStatus)}`}
                    />
                </div>
                <span className="text-[10px] font-mono text-slate-500 min-w-[40px] text-right">
                    {inputPercent.toFixed(0)}%
                </span>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Input Context Bar */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Input Context</span>
                    <span className="text-slate-500 font-mono">
                        {formatTokenCount(inputTokensUsed)} / {formatTokenCount(modelConfig.inputContextLimit)}
                    </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${inputPercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full ${getStatusColor(inputStatus)} ${getStatusGlow(inputStatus)} rounded-full`}
                    />
                </div>
                {inputStatus !== 'normal' && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[10px] ${inputStatus === 'critical' ? 'text-red-400' : 'text-amber-400'}`}
                    >
                        {inputStatus === 'critical'
                            ? '⚠️ Near context limit - consider a model with larger context'
                            : '⚡ Approaching context limit'}
                    </motion.p>
                )}
            </div>

            {/* Output Context Bar (optional) */}
            {showOutput && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Output Limit</span>
                        <span className="text-slate-500 font-mono">
                            {formatTokenCount(outputTokensUsed)} / {formatTokenCount(modelConfig.outputContextLimit)}
                        </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${outputPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full ${getStatusColor(outputStatus)} ${getStatusGlow(outputStatus)} rounded-full`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Mini inline version for headers
export const ContextMini: React.FC<{
    modelConfig: ModelConfig;
    inputTokens: number;
}> = ({ modelConfig, inputTokens }) => {
    const percent = getContextUsagePercent(modelConfig, inputTokens, 'input');
    const status = getContextStatus(percent);

    return (
        <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full ${status === 'critical' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <span className="text-[9px] font-mono text-slate-600">
                {formatTokenCount(inputTokens)}
            </span>
        </div>
    );
};

export default ContextBar;
