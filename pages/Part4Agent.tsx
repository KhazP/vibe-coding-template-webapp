
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, CopyBlock, GenerationLoader, Tooltip, PersonaError, StepNavigation } from '../components/UI';
import { generateAgentsMdPrompt, generateToolConfig } from '../utils/templates';
import { Persona, ToolDefinition } from '../types';
import { TOOLS, TOOL_IDS, FILE_NAMES } from '../utils/constants';
import { Check, Loader2, Sparkles, CheckCircle, AlertCircle, Download, FileArchive, ArrowRight, UserCheck, Terminal, Bot, Layout, Info, Link2, AlertTriangle } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { motion } from 'framer-motion';

const Part4Agent: React.FC = React.memo(() => {
  const { state, toggleTool, performGeminiAgent } = useProject();
  const { answers, prdOutput, techOutput, researchOutput, tools, isGenerating, persona } = state;
  
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(FILE_NAMES.AGENTS_MD);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  
  // State for Adapter Modes (true = Adapter/AGENTS.md, false = Config/Specific)
  const [claudeAdapterMode, setClaudeAdapterMode] = useState(false);
  const [geminiAdapterMode, setGeminiAdapterMode] = useState(false);

  // Guard Clause: Ensure Persona is Selected
  if (!persona) return <PersonaError />;

  const handleGenerate = async () => {
    // Generate AGENTS.md via Gemini
    const agentsMdPrompt = generateAgentsMdPrompt(persona || Persona.VibeCoder, answers, prdOutput, techOutput);
    const agentsMdContent = await performGeminiAgent(agentsMdPrompt);
    
    if (agentsMdContent) {
        const newOutputs: Record<string, string> = { [FILE_NAMES.AGENTS_MD]: agentsMdContent };
        
        // Generate adapter files for selected tools
        tools.forEach(toolId => {
          const tool = TOOLS.find(t => t.id === toolId);
          if (tool) {
            newOutputs[tool.file] = generateToolConfig(
                toolId, 
                answers['project_description'] || 'App', 
                persona || Persona.VibeCoder, 
                answers,
                { claudeAdapterMode, geminiAdapterMode } // Pass tool-specific options
            );
          }
        });

        setOutputs(newOutputs);
        setGenerated(true);
        setActiveTab(FILE_NAMES.AGENTS_MD);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const cleanName = answers['project_description'] ? answers['project_description'].replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'app';
    
    // 1. Add generated config files to Root
    Object.entries(outputs).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    // 2. Add Documentation folder
    const docs = zip.folder("docs");
    if (docs) {
        if (researchOutput) docs.file(`research-${cleanName}.md`, researchOutput);
        if (prdOutput) docs.file(`PRD-${cleanName}-MVP.md`, prdOutput);
        if (techOutput) docs.file(`TechDesign-${cleanName}-MVP.md`, techOutput);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanName}-vibe-coding-kit.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group tools by category
  const groupedTools = TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolDefinition[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Native Support': return <Terminal size={14} className="text-emerald-400" />;
      case 'Adapter Required': return <Link2 size={14} className="text-blue-400" />;
      case 'Generator': return <Layout size={14} className="text-orange-400" />;
      default: return <Sparkles size={14} />;
    }
  };

  const renderToggle = (toolId: string) => {
      const isClaude = toolId === TOOL_IDS.CLAUDE;
      const isGemini = toolId === TOOL_IDS.GEMINI_CLI;
      
      if (!isClaude && !isGemini) return null;

      const checked = isClaude ? claudeAdapterMode : geminiAdapterMode;
      const setChecked = isClaude ? setClaudeAdapterMode : setGeminiAdapterMode;
      const labelActive = FILE_NAMES.AGENTS_MD;
      const labelInactive = isClaude ? FILE_NAMES.CLAUDE_MD : FILE_NAMES.GEMINI_MD;

      return (
        <div 
          className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5" 
          onClick={(e) => e.stopPropagation()}
        >
            <span className="text-[10px] text-slate-500 font-medium">Mode:</span>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${!checked ? 'text-primary-400 font-bold' : 'text-slate-600'}`}>{labelInactive}</span>
                <label className="relative inline-flex items-center cursor-pointer group/toggle">
                    <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={(e) => setChecked(e.target.checked)}
                        className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
                <span className={`text-[10px] font-mono ${checked ? 'text-primary-400 font-bold' : 'text-slate-600'}`}>{labelActive}</span>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part IV: Universal Agent Config</h2>
        <p className="text-slate-400">Generate an <code className="text-primary-400">{FILE_NAMES.AGENTS_MD}</code> file that works across Cursor, Windsurf, Copilot, and more.</p>
      </div>

      <ModelStatus />

      <div className="grid md:grid-cols-2 gap-8">
        {/* Configuration Section */}
        <div className="space-y-6">
           
           {/* 1. Universal Standard */}
           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                 <Bot size={20} className="text-primary-400"/> The "{FILE_NAMES.AGENTS_MD}" Standard
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                 Instead of managing separate rules for every tool, we create a single source of truth. Most modern AI agents (Cursor, Windsurf, Aider) read this file automatically.
              </p>
              <div className="p-4 bg-primary-900/10 border border-primary-500/20 rounded-lg text-sm text-slate-300">
                  <strong>Your Persona:</strong> {persona === Persona.VibeCoder ? "Vibe-Coder (Educational)" : persona === Persona.Developer ? "Developer (Concise)" : "Learner (Balanced)"}
              </div>
           </div>

           {/* 2. Select Tool Adapters */}
           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1 text-slate-200">
              Tool Adapters (Optional)
            </h3>
            <p className="text-sm text-slate-400 mb-6">Select the tools you use. We'll generate specific configuration files to make them work with AGENTS.md.</p>
            
            <div className="space-y-6">
              {Object.entries(groupedTools).map(([category, categoryTools]) => (
                <div key={category}>
                   <div className="flex items-center gap-2 mb-3 px-1">
                      {getCategoryIcon(category)}
                      <span className="text-xs font-mono uppercase tracking-widest text-slate-500">{category}</span>
                   </div>
                   <div className="grid grid-cols-1 gap-3">
                     {categoryTools.map(tool => {
                       const isSelected = tools.includes(tool.id);
                       
                       return (
                        <motion.div 
                          key={tool.id}
                          whileHover={{ scale: 1.005 }}
                          onClick={() => toggleTool(tool.id)}
                          className={`cursor-pointer p-3.5 rounded-xl border transition-all relative group overflow-visible ${
                            isSelected
                              ? 'bg-primary-500/5 border-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                              : 'bg-surface/50 border-white/5 hover:border-white/10 hover:bg-surface'
                          }`}
                        >
                          <div className="flex items-start gap-4 relative z-10">
                            {/* Checkbox Visual */}
                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                isSelected ? 'bg-primary-500 border-primary-500 shadow-sm' : 'border-slate-600 bg-slate-800/50 group-hover:border-slate-500'
                            }`}>
                                {isSelected && <Check size={14} className="text-black stroke-[3]" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`font-bold text-sm ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                  {tool.name}
                                </span>
                                <Tooltip content={tool.techTooltip} position="left">
                                  <div className={`transition-colors ${isSelected ? 'text-primary-400' : 'text-slate-600 group-hover:text-slate-500'}`}>
                                     <Info size={14} />
                                  </div>
                                </Tooltip>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed pr-2">
                                {tool.description}
                              </p>
                              
                              {isSelected && renderToggle(tool.id)}
                            </div>
                          </div>
                          
                          {/* Selection Glow */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent pointer-events-none rounded-xl" />
                          )}
                        </motion.div>
                       );
                     })}
                   </div>
                </div>
              ))}
            </div>
           </div>

           {/* Context Indicator */}
           <div className="grid grid-cols-2 gap-4">
              <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${prdOutput ? 'bg-orange-900/20 border-orange-800 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                 {prdOutput ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                 {prdOutput ? "PRD Context Attached" : "Missing PRD Context"}
              </div>
              <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${techOutput ? 'bg-orange-900/20 border-orange-800 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                 {techOutput ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                 {techOutput ? "Tech Design Attached" : "Missing Tech Design"}
              </div>
           </div>

            {/* Warning if no tools selected */}
            {tools.length === 0 && (
             <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                   <strong className="font-semibold">No tools selected</strong>
                   <p className="opacity-80 mt-1 text-xs">We will only generate the core <code>{FILE_NAMES.AGENTS_MD}</code> file. No tool-specific configuration files (like <code>.cursorrules</code>) will be created.</p>
                </div>
             </div>
           )}

           <Button 
               onClick={handleGenerate} 
               disabled={isGenerating}
               className="w-full bg-gradient-to-r from-orange-600 to-primary-600 hover:from-orange-500 hover:to-primary-500 border-0"
               tooltip="Generate AGENTS.md and selected adapters."
           >
               {isGenerating ? (
                 <><Loader2 className="animate-spin" size={18} /> Generating...</>
               ) : (
                 <><Sparkles size={18} /> Generate Universal Config</>
               )}
           </Button>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
           {isGenerating ? (
             <GenerationLoader label={`Drafting Universal ${FILE_NAMES.AGENTS_MD}...`} />
           ) : generated ? (
            <div className="h-full flex flex-col">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {Object.keys(outputs).map(fileName => (
                    <button
                      key={fileName}
                      onClick={() => setActiveTab(fileName)}
                      className={`px-3 py-1.5 rounded-t-lg font-mono text-xs transition-colors whitespace-nowrap ${
                        activeTab === fileName
                          ? 'bg-slate-800 text-primary-400 border-t border-x border-slate-700'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {fileName}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                   <Button variant="secondary" onClick={() => downloadFile(activeTab, outputs[activeTab])} className="text-xs py-1 h-7 px-3" tooltip="Save active file">
                      <Download size={12} /> Save
                   </Button>
                   <Button variant="primary" onClick={downloadAll} className="text-xs py-1 h-7 px-3" tooltip="Download entire project kit as zip">
                      <FileArchive size={12} /> Full Kit
                   </Button>
                </div>
              </div>
              
              <div className="flex-1 min-h-[400px]">
                 <CopyBlock 
                    content={outputs[activeTab]} 
                    label={`Preview: ${activeTab}`} 
                    fileName={activeTab.replace('.', '_')} // Pass filename for improved download
                 />
              </div>
            </div>
           ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30 text-slate-500 p-8 text-center min-h-[400px]">
              <div className="max-w-xs">
                <Bot className="mx-auto mb-3 opacity-50" size={32} />
                <p>Generate an <strong>{FILE_NAMES.AGENTS_MD}</strong> file to give all your AI tools a shared brain.</p>
              </div>
            </div>
           )}
        </div>
      </div>
      
      <StepNavigation 
         prev={{ label: 'Tech Design', path: '/tech' }}
         next={{ label: 'Build Phase', path: '/build', disabled: !generated }}
         onPrefetchNext={() => import('./Part5Build')}
      />
    </div>
  );
});

export default Part4Agent;
