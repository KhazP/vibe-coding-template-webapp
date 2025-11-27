

import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings as SettingsIcon, Zap, BrainCircuit, Search, Gauge, ChevronDown, Check } from 'lucide-react';
import { Modal, Tooltip, Select } from './UI';
import { MODEL_CONFIGS, PRESETS } from '../utils/constants';
import { PresetMode } from '../types';

const SettingsModal: React.FC = () => {
  const { state, updateSettings, isSettingsOpen, setIsSettingsOpen } = useProject();
  const { settings } = state;
  const [showAdvanced, setShowAdvanced] = React.useState(settings.preset === 'custom');

  const handlePresetSelect = (presetId: PresetMode) => {
    if (presetId === 'custom') {
        setShowAdvanced(true);
        updateSettings({ preset: 'custom' });
        return;
    }

    const presetConfig = Object.values(PRESETS).find(p => p.id === presetId);
    if (presetConfig) {
        updateSettings({
            preset: presetId,
            ...presetConfig.config
        });
        // Optionally close advanced if a preset is selected to keep UI clean
        // setShowAdvanced(false); 
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    const maxBudget = MODEL_CONFIGS[newModel as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
    updateSettings({ 
        modelName: newModel, 
        thinkingBudget: maxBudget,
        preset: 'custom' // Switch to custom on manual change
    });
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

  const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
  const currentMaxBudget = currentConfig ? currentConfig.maxThinkingBudget : 32768;

  return (
    <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Gemini Configuration">
      <div className="space-y-8">
        
        {/* Header / Intro */}
        <div className="flex items-start gap-4 p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl">
           <Zap className="text-primary-400 shrink-0 mt-1" size={20} />
           <div>
              <p className="text-sm text-slate-300">
                Configure the <strong>Global Brain</strong>. These settings control the intelligence, speed, and reasoning depth for all generated content (Research, PRD, Tech Design).
              </p>
           </div>
        </div>

        {/* Preset Cards */}
        <div>
            <label className="block text-sm font-bold text-slate-200 mb-4">Generation Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.values(PRESETS).map((preset) => {
                    const isActive = settings.preset === preset.id;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => handlePresetSelect(preset.id as PresetMode)}
                            className={`relative text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2 group ${
                                isActive 
                                    ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-start w-full">
                                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {preset.label}
                                </span>
                                {isActive && <Check size={16} className="text-primary-400" />}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-mono text-primary-400/80 bg-primary-900/20 px-1.5 py-0.5 rounded w-fit">
                                {preset.badge}
                            </span>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {preset.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Advanced Accordion */}
        <div className="border-t border-slate-800 pt-4">
            <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-4 w-full"
            >
                <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
                {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings (Manual Override)'}
            </button>

            {showAdvanced && (
                <div className="space-y-6 animate-fade-in pl-2 border-l-2 border-slate-800">
                    {/* Model Selection */}
                    <Select
                        label="Gemini Model"
                        value={settings.modelName}
                        onChange={handleModelChange}
                        tooltip="Select the AI model intelligence level."
                    >
                        {Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </Select>
                    <p className="text-xs text-slate-500 -mt-5 mb-2 pl-1">
                        {currentConfig?.description || "Select a model."}
                    </p>

                    {/* Thinking Budget */}
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                        <div className="flex items-center gap-2 mb-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <BrainCircuit size={16} className="text-purple-400" />
                                Thinking Budget (Tokens)
                            </label>
                            <Tooltip content="Tokens reserved for internal reasoning before answering.">
                                <span className="text-slate-600 hover:text-primary-400 cursor-help transition-colors text-xs">ⓘ</span>
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="0" 
                                max={currentMaxBudget} 
                                step="1024" 
                                value={settings.thinkingBudget} 
                                onChange={handleBudgetChange}
                                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                            <input 
                                type="number"
                                min="0"
                                max={currentMaxBudget}
                                value={settings.thinkingBudget}
                                onChange={handleBudgetChange}
                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-right text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono"
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono uppercase">
                            <span>Fast</span>
                            <span>Deep Reasoning</span>
                        </div>
                    </div>

                    {/* Grounding Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Search size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <label className="font-medium text-slate-300 block">Google Search Grounding</label>
                                <p className="text-xs text-slate-500">Allow the model to access real-time information.</p>
                            </div>
                        </div>
                        <Tooltip content="Enables access to live web data." position="left">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.useGrounding} 
                                    onChange={handleGroundingChange}
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </Tooltip>
                    </div>

                     {/* Temperature/Sampling */}
                    <div className="pt-4 border-t border-slate-800/50">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sampling Parameters</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs text-slate-400">Temperature</label>
                                    <span className="text-xs text-slate-300 font-mono">{settings.temperature ?? 0.7}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="2" 
                                    step="0.1" 
                                    value={settings.temperature ?? 0.7} 
                                    onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value), preset: 'custom' })}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs text-slate-400">Top P</label>
                                    <span className="text-xs text-slate-300 font-mono">{settings.topP ?? 0.95}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.05" 
                                    value={settings.topP ?? 0.95} 
                                    onChange={(e) => updateSettings({ topP: parseFloat(e.target.value), preset: 'custom' })}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs text-slate-400">Top K</label>
                                    <span className="text-xs text-slate-300 font-mono">{settings.topK ?? 64}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    step="1" 
                                    value={settings.topK ?? 64} 
                                    onChange={(e) => updateSettings({ topK: parseInt(e.target.value), preset: 'custom' })}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;