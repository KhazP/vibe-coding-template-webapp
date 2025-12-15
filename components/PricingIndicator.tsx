/**
 * Pricing Indicator Component
 * 
 * Displays estimated cost per prompt based on model pricing and token counts.
 * Handles tiered pricing and OpenRouter fees.
 */

import React, { useMemo } from 'react';
import { DollarSign, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ModelConfig } from '../utils/modelUtils';
import { calculatePromptCost, formatCost } from '../utils/modelUtils';
import { Tooltip } from './UI';

interface PricingIndicatorProps {
    modelConfig: ModelConfig;
    inputTokens: number;
    estimatedOutputTokens?: number;
    showBreakdown?: boolean;
    className?: string;
}

export const PricingIndicator: React.FC<PricingIndicatorProps> = ({
    modelConfig,
    inputTokens,
    estimatedOutputTokens = 0,
    showBreakdown = false,
    className = '',
}) => {
    const { cost, inputCost, outputCost, isOpenRouter, hasTieredPricing } = useMemo(() => {
        const isOR = modelConfig.providerId === 'openrouter';
        const hasTiered = Boolean(modelConfig.tieredPricing && inputTokens > (modelConfig.tieredPricing?.threshold || 0));

        // Calculate individual costs for breakdown
        let inCost: number;
        if (modelConfig.tieredPricing && inputTokens > modelConfig.tieredPricing.threshold) {
            const below = modelConfig.tieredPricing.threshold;
            const above = inputTokens - below;
            inCost = (below * modelConfig.inputCostPerMillion / 1_000_000) +
                (above * modelConfig.tieredPricing.inputCostAbove / 1_000_000);
        } else {
            inCost = inputTokens * modelConfig.inputCostPerMillion / 1_000_000;
        }

        let outCost: number;
        if (modelConfig.tieredPricing && inputTokens > modelConfig.tieredPricing.threshold) {
            outCost = estimatedOutputTokens * modelConfig.tieredPricing.outputCostAbove / 1_000_000;
        } else {
            outCost = estimatedOutputTokens * modelConfig.outputCostPerMillion / 1_000_000;
        }

        if (isOR) {
            inCost *= 1.055;
            outCost *= 1.055;
        }

        return {
            cost: inCost + outCost,
            inputCost: inCost,
            outputCost: outCost,
            isOpenRouter: isOR,
            hasTieredPricing: hasTiered,
        };
    }, [modelConfig, inputTokens, estimatedOutputTokens]);

    const formattedCost = formatCost(cost);

    const breakdownText = useMemo(() => {
        const parts = [
            `Input: ${formatCost(inputCost)} (${(inputTokens / 1000).toFixed(1)}k tokens)`,
            `Output: ${formatCost(outputCost)} (${(estimatedOutputTokens / 1000).toFixed(1)}k tokens est.)`,
        ];

        if (hasTieredPricing) {
            parts.push(`📈 Tiered pricing applied (>200k tokens)`);
        }

        if (isOpenRouter) {
            parts.push(`🔄 Includes 5.5% OpenRouter fee`);
        }

        return parts.join('\n');
    }, [inputCost, outputCost, inputTokens, estimatedOutputTokens, hasTieredPricing, isOpenRouter]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/50 border border-white/5 text-xs ${className}`}
        >
            <DollarSign size={12} className="text-emerald-400" />
            <span className="text-slate-300 font-mono">{formattedCost}</span>
            <span className="text-slate-600">estimated</span>

            {showBreakdown && (
                <Tooltip content={breakdownText} position="left">
                    <Info size={12} className="text-slate-500 hover:text-slate-400 active:text-white cursor-help ml-1 transition-colors" />
                </Tooltip>
            )}
        </motion.div>
    );
};

// Compact inline version for use in chat headers
export const PricingBadge: React.FC<{
    modelConfig: ModelConfig;
    inputTokens: number;
    outputTokens?: number;
}> = ({ modelConfig, inputTokens, outputTokens = 0 }) => {
    const cost = calculatePromptCost(modelConfig, inputTokens, outputTokens);

    return (
        <span className="text-[10px] font-mono text-slate-500">
            {formatCost(cost)}
        </span>
    );
};

export default PricingIndicator;
