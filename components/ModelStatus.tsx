import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings, BrainCircuit, Search, Cpu } from 'lucide-react';

export const ModelStatus: React.FC = () => {
  const { state, setIsSettingsOpen } = useProject();
  const { settings } = state;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-6">
        <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu size={14} className="text-primary-400"/>
            <span>{settings.modelName}</span>
        </div>
        
        {settings.thinkingBudget > 0 && (
            <div className="flex items-center gap-1.5 text-slate-300">
                <BrainCircuit size={14} className="text-purple-400"/>
                <span>Thinking: {settings.thinkingBudget}</span>
            </div>
        )}

        {settings.useGrounding && (
             <div className="flex items-center gap-1.5 text-slate-300">
                <Search size={14} className="text-blue-400"/>
                <span>Grounding: ON</span>
            </div>
        )}

        <div className="ml-auto">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 hover:text-white transition-colors"
             >
                <Settings size={14} />
                <span>Configure</span>
            </button>
        </div>
    </div>
  );
};