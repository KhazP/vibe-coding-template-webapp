

import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  Zap, BrainCircuit, Search, Check, Activity, Bell, User, Clock, 
  FileArchive, EyeOff, Layout, Download, ChevronDown, RefreshCcw, MessageSquare
} from 'lucide-react';
import { Modal, Tooltip, Select, TextArea, Button } from './UI';
import { MODEL_CONFIGS, PRESETS, DEFAULT_SETTINGS } from '../utils/constants';
import { PresetMode, ToastPosition, Persona } from '../types';
import { useToast } from './Toast';

type SettingsTab = 'ai' | 'general' | 'export';

const SettingsModal: React.FC = () => {
  const { state, updateSettings, isSettingsOpen, setIsSettingsOpen } = useProject();
  const { position, setPosition } = useToast();
  const { settings } = state;
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [showAdvancedAI, setShowAdvancedAI] = useState(settings.preset === 'custom');

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
    const newModel = e.target.value;
    const maxBudget = MODEL_CONFIGS[newModel as keyof typeof MODEL_CONFIGS]?.maxThinkingBudget || 0;
    updateSettings({ 
        modelName: newModel, 
        thinkingBudget: maxBudget,
        preset: 'custom'
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

  const currentConfig = MODEL_CONFIGS[settings.modelName as keyof typeof MODEL_CONFIGS];
  const currentMaxBudget = currentConfig ? currentConfig.maxThinkingBudget : 32768;

  const TabButton: React.FC<{ id: SettingsTab; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left ${
        activeTab === id 
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

                <div>
                    <label className="block text-sm font-bold text-slate-200 mb-4">Generation Mode</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.values(PRESETS).map((preset) => {
                            const isActive = settings.preset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset.id as PresetMode)}
                                    className={`relative text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${
                                        isActive 
                                            ? 'bg-primary-500/10 border-primary-500 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                            : 'bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-800'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {preset.label}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-wider font-mono text-primary-400/80 bg-primary-900/20 px-1.5 py-0.5 rounded">
                                                {preset.badge}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">{preset.description}</p>
                                    </div>
                                    {isActive && <Check size={18} className="text-primary-400" />}
                                </button>
                            );
                        })}
                    </div>
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
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parameters</span>
                                <button 
                                    onClick={handleResetDefaults}
                                    className="flex items-center gap-1.5 text-[10px] text-primary-400 hover:text-primary-300 px-2 py-1 rounded bg-primary-900/10 border border-primary-500/20 hover:bg-primary-900/20 transition-colors"
                                >
                                    <RefreshCcw size={10} /> Reset to Defaults
                                </button>
                            </div>

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

                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                        <BrainCircuit size={16} className="text-purple-400" />
                                        Thinking Budget
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
                                    <span className="text-xs font-mono text-slate-300 w-16 text-right">
                                        {settings.thinkingBudget > 0 ? `${(settings.thinkingBudget / 1024).toFixed(0)}k` : 'Off'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Search size={20} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <label className="font-medium text-slate-300 block text-sm">Search Grounding</label>
                                        <p className="text-xs text-slate-500">Allow model to access real-time info.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.useGrounding} 
                                        onChange={handleGroundingChange}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 mb-2 block">Temperature ({settings.temperature})</label>
                                    <input 
                                        type="range" min="0" max="2" step="0.1" 
                                        value={settings.temperature ?? 0.7} 
                                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value), preset: 'custom' })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-2 block">Top P ({settings.topP})</label>
                                    <input 
                                        type="range" min="0" max="1" step="0.05" 
                                        value={settings.topP ?? 0.95} 
                                        onChange={(e) => updateSettings({ topP: parseFloat(e.target.value), preset: 'custom' })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                </div>
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