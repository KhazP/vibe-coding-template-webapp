

import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings, BrainCircuit, Search, Cpu, Gauge } from 'lucide-react';
import { Tooltip } from './UI';
import { PRESETS } from '../utils/constants';

export const ModelStatus: React.FC = () => {
  const { state, setIsSettingsOpen } = useProject();
  const { settings } = state;

  const activePreset = Object.values(PRESETS).find(p => p.id === settings.preset);
  const isCustom = !activePreset;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-1 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-6 shadow-sm">
        
        {/* Preset / Model Label */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-white/5">
             {isCustom ? (
                <>
                    <Cpu size={14} className="text-primary-400"/>
                    <span className="text-slate-200">{settings.modelName}</span>
                </>
             ) : (
                <>
                    <Gauge size={14} className="text-primary-400" />
                    <span className="text-primary-200 font-bold">{activePreset?.label} Mode</span>
                </>
             )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 px-2 overflow-x-auto whitespace-nowrap">
            {settings.thinkingBudget > 0 && (
                <div className="flex items-center gap-1.5 text-slate-300">
                    <BrainCircuit size={14} className="text-purple-400"/>
                    <span>{settings.thinkingBudget.toLocaleString()} tokens</span>
                </div>
            )}

            {settings.useGrounding && (
                 <div className="flex items-center gap-1.5 text-slate-300">
                    <Search size={14} className="text-blue-400"/>
                    <span>Grounding ON</span>
                </div>
            )}
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