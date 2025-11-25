
import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Settings as SettingsIcon } from 'lucide-react';
import { Tooltip, Select } from '../components/UI';
import { MODEL_CONFIGS } from '../utils/constants';

const Settings: React.FC = () => {
  const { state, updateSettings } = useProject();
  const { settings } = state;

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    const maxBudget = MODEL_CONFIGS[newModel as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
    
    // Automatically select max budget when model changes
    updateSettings({ modelName: newModel, thinkingBudget: maxBudget });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;
    const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
    const max = currentConfig ? currentConfig.maxThinkingBudget : 32768;
    
    if (val > max) val = max;
    if (val < 0) val = 0;
    updateSettings({ thinkingBudget: val });
  };

  const handleGroundingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ useGrounding: e.target.checked });
  };

  const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
  const currentMaxBudget = currentConfig ? currentConfig.maxThinkingBudget : 32768;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
            <SettingsIcon className="text-primary-400" size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-slate-100">Gemini Settings</h2>
            <p className="text-slate-400">Configure how the AI behaves across your workflow.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
        
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
        <p className="text-xs text-slate-500 -mt-6 mb-6 pl-1">
            {currentConfig?.description || "Select a model."}
        </p>

        {/* Thinking Budget */}
        <div>
            <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-300">
                    Thinking Budget (Tokens)
                </label>
                <Tooltip content="Tokens reserved for internal reasoning before answering.">
                   <span className="text-slate-600 hover:text-primary-400 cursor-help transition-colors">ⓘ</span>
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
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-right text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
            </div>
            <p className="text-xs text-slate-500 mt-2">
                Allocates tokens for the model to "think" before responding. Higher values improve complex reasoning. Set to 0 to disable.
                <br/>Max allowed for <strong>{settings.modelName}</strong> is {currentMaxBudget}.
            </p>
        </div>

        {/* Grounding Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div>
                <label className="font-medium text-slate-300 block">Google Search Grounding</label>
                <p className="text-xs text-slate-500">Allow the model to access real-time information via Google Search.</p>
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

        {/* Advanced Parameters */}
        <div className="pt-6 border-t border-slate-800">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Advanced Generation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <div className="flex justify-between mb-2">
                         <div className="flex items-center gap-1">
                            <label className="text-xs text-slate-400">Temperature</label>
                            <Tooltip content="Higher = more creative/random. Lower = more deterministic.">
                                <span className="text-slate-600 hover:text-primary-400 cursor-help text-[10px]">ⓘ</span>
                            </Tooltip>
                        </div>
                        <span className="text-xs text-slate-300 font-mono">{settings.temperature ?? 0.7}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1" 
                        value={settings.temperature ?? 0.7} 
                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                </div>
                <div>
                     <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-1">
                            <label className="text-xs text-slate-400">Top P</label>
                            <Tooltip content="Nucleus sampling. Lower values limit the token pool to top probability mass.">
                                <span className="text-slate-600 hover:text-primary-400 cursor-help text-[10px]">ⓘ</span>
                            </Tooltip>
                        </div>
                        <span className="text-xs text-slate-300 font-mono">{settings.topP ?? 0.95}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={settings.topP ?? 0.95} 
                        onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                </div>
                <div>
                     <div className="flex justify-between mb-2">
                         <div className="flex items-center gap-1">
                            <label className="text-xs text-slate-400">Top K</label>
                            <Tooltip content="Limits the token pool to the top K most likely tokens.">
                                <span className="text-slate-600 hover:text-primary-400 cursor-help text-[10px]">ⓘ</span>
                            </Tooltip>
                        </div>
                        <span className="text-xs text-slate-300 font-mono">{settings.topK ?? 64}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1" 
                        value={settings.topK ?? 64} 
                        onChange={(e) => updateSettings({ topK: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                </div>
            </div>
            <p className="text-xs text-slate-600 mt-4">
                <strong>Temperature:</strong> Controls randomness. <strong>Top P/K:</strong> Controls diversity of word choice.
            </p>
        </div>

      </div>
    </div>
  );
};

export default Settings;
