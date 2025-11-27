
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { CopyBlock, GlassCard, Button, TextArea, PersonaError, StepNavigation } from '../components/UI';
import { ArtifactSection } from '../components/ArtifactSection';
import { Link } from 'react-router-dom';
import { Terminal, Zap, GitMerge, Loader2, Play, AlertTriangle, LifeBuoy, CheckCircle2, Sparkles, FolderTree, Lock, Bot, FileCode, Settings } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { generateBuildPlanPrompt, generatePhasePrompt, generateTroubleshootPrompt, getBuildPlanSystemInstruction } from '../utils/templates';
import { Persona, ToolDefinition } from '../types';
import { TOOL_IDS, FILE_NAMES, TOOLS } from '../utils/constants';
import { useToast } from '../components/Toast';

const Part5Build: React.FC = React.memo(() => {
  const { state, performGeminiBuildPlan, queryGemini } = useProject();
  const { tools, answers, persona, prdOutput, techOutput, buildPlan, isGenerating, agentOutputs } = state;
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'kickoff' | 'guided'>('kickoff');
  const [selectedPhase, setSelectedPhase] = useState<string>('Phase 1: Project Scaffolding');
  const [phasePrompt, setPhasePrompt] = useState<string>('');
  const [isPhaseLoading, setIsPhaseLoading] = useState(false);
  
  const [troubleInput, setTroubleInput] = useState('');
  const [troubleOutput, setTroubleOutput] = useState('');
  const [isTroubleLoading, setIsTroubleLoading] = useState(false);

  // Guard Clause: Ensure Persona is Selected
  if (!persona) {
    return <PersonaError />;
  }

  // Helpers for Summary
  const selectedTools = tools.map(tId => TOOLS.find(t => t.id === tId)).filter((t): t is ToolDefinition => !!t);
  const hasAgentConfig = agentOutputs && Object.keys(agentOutputs).length > 0;
  
  const configFiles: string[] = [FILE_NAMES.AGENTS_MD];
  selectedTools.forEach(t => {
      if(t?.file) configFiles.push(t.file);
  });

  const handleGenerateBuildPlan = async () => {
    const prompt = generateBuildPlanPrompt(persona, answers, prdOutput, techOutput);
    await performGeminiBuildPlan(prompt);
  };

  const handleGeneratePhasePrompt = async () => {
      if (!buildPlan) {
        addToast('You must generate a Master Build Plan first!', 'error');
        return;
      }
      setIsPhaseLoading(true);
      try {
          const prompt = generatePhasePrompt(persona, answers, buildPlan, selectedPhase);
          const result = await queryGemini(prompt, getBuildPlanSystemInstruction());
          setPhasePrompt(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsPhaseLoading(false);
      }
  };

  const handleTroubleshoot = async () => {
      if (!troubleInput.trim()) return;
      setIsTroubleLoading(true);
      try {
          const prompt = generateTroubleshootPrompt(persona, answers, troubleInput, techOutput);
          const result = await queryGemini(prompt);
          setTroubleOutput(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTroubleLoading(false);
      }
  };

  const getKickoffCommand = (toolId: string) => {
    const agentsMd = FILE_NAMES.AGENTS_MD;
    const buildPlanMd = FILE_NAMES.BUILD_PLAN;
    const contextFiles = buildPlan ? `${agentsMd} and ${buildPlanMd}` : agentsMd;
    
    switch (toolId) {
      case TOOL_IDS.COPILOT:
        return `// Open VS Code\n// Open Copilot Chat\n// Prompt: "@workspace Read ${contextFiles}. Let's start Phase 1."`;
      case TOOL_IDS.CURSOR:
        return `// Open Command Palette (Cmd+Shift+P)\n// Type: "Composer: Create New"\n// Prompt: "Read ${contextFiles}. Build the MVP step-by-step."`;
      case TOOL_IDS.WINDSURF:
        return `// Open Cascade\n// Prompt: "Read ${contextFiles}. Start Phase 1."`;
      case TOOL_IDS.AIDER:
        return `aider --read ${agentsMd} ${buildPlan ? `--read ${buildPlanMd}` : ''}`;
      case TOOL_IDS.CLINE:
        return `// Open Cline\n// Prompt: "Read ${contextFiles}. Start building."`;
      case TOOL_IDS.GEMINI_CLI:
        return `gemini prompt "Read ${contextFiles}. Start building."`;
      case TOOL_IDS.CLAUDE:
        return `claude "Read ${contextFiles}. Start building."`;
      case TOOL_IDS.LOVABLE:
        return `// Copy content from ${FILE_NAMES.LOVABLE_PROMPT}\n// Paste into Lovable.dev chat`;
      case TOOL_IDS.V0:
        return `// Copy content from ${FILE_NAMES.V0_PROMPT}\n// Paste into v0.dev chat`;
      default:
        return "Build command not found.";
    }
  };

  const getToolName = (toolId: string) => {
    const map: Record<string, string> = {
        [TOOL_IDS.COPILOT]: 'GitHub Copilot',
        [TOOL_IDS.CURSOR]: 'Cursor',
        [TOOL_IDS.WINDSURF]: 'Windsurf',
        [TOOL_IDS.AIDER]: 'Aider',
        [TOOL_IDS.GEMINI_CLI]: 'Gemini CLI',
        [TOOL_IDS.CLAUDE]: 'Claude Code',
        [TOOL_IDS.CLINE]: 'Cline',
        [TOOL_IDS.LOVABLE]: 'Lovable',
        [TOOL_IDS.V0]: 'v0'
    };
    return map[toolId] || toolId.charAt(0).toUpperCase() + toolId.slice(1);
  };

  const phases = [
      "Phase 1: Project Scaffolding & Setup",
      "Phase 2: Database & Backend Logic",
      "Phase 3: Core Features Implementation",
      "Phase 4: UI Components & Styling",
      "Phase 5: API Integration",
      "Phase 6: Testing & Polish"
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part V: Build Execution</h2>
        <p className="text-slate-400">Your mission control for orchestrating AI Agents. Generate a plan, then execute phase-by-phase.</p>
      </div>

      <ModelStatus />

      {/* Configuration Summary Dashboard */}
      <GlassCard className="border-l-4 border-l-primary-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <Bot size={20} className="text-primary-400" />
                        Agent Configuration
                    </h3>
                    {hasAgentConfig ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20">
                            Ready
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wide border border-amber-500/20">
                            Pending
                        </span>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm text-slate-400 items-center">
                     <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Tools:</span>
                     {tools.length > 0 ? (
                        selectedTools.map(t => (
                            <span key={t?.id} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-200 text-xs flex items-center gap-1.5">
                                {t?.name}
                            </span>
                        ))
                     ) : (
                        <span className="text-slate-500 text-xs italic">Generic (No specific tools selected)</span>
                     )}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <FileCode size={14} className="text-slate-600" />
                    <span className="text-slate-500 font-bold">Context Files:</span>
                    <span className={hasAgentConfig ? "text-emerald-400" : "text-slate-600"}>
                        {hasAgentConfig ? configFiles.join(', ') : 'Waiting for generation...'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                 {!hasAgentConfig && (
                    <div className="hidden md:flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-500/20 max-w-[200px] leading-tight">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Go back to Step 4 to generate config files first.</span>
                    </div>
                 )}
                 <Link to="/agent">
                    <Button variant="secondary" className="text-xs h-9 bg-white/5 hover:bg-white/10 border-white/10">
                        <Settings size={14} className="mr-2" /> Reconfigure
                    </Button>
                 </Link>
            </div>
        </div>
      </GlassCard>

      {/* Step 1: Master Build Plan */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${buildPlan ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                {buildPlan ? <CheckCircle2 size={18} /> : <GitMerge size={18} />}
            </div>
            <h3 className="text-xl font-bold text-slate-200">Step 1: Master Build Plan & File Tree</h3>
        </div>
        
        <GlassCard className="relative overflow-hidden min-h-[200px]">
             {(!buildPlan && !isGenerating) ? (
                 <div className="text-center py-12 px-4">
                    <FolderTree className="mx-auto text-slate-600 mb-4" size={48} />
                    <h4 className="text-slate-200 font-medium mb-2">Generate Your Blueprint</h4>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                        We need a map before we drive. This step generates a <strong>complete File Tree</strong> and step-by-step dependency plan based on your agent configuration.
                        <br/><br/>
                        <span className="text-primary-400 text-xs uppercase tracking-widest font-bold">Required for Step 2</span>
                    </p>
                    <Button 
                        onClick={handleGenerateBuildPlan} 
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-500 w-full md:w-auto"
                    >
                        {isGenerating ? <><Loader2 className="animate-spin" size={16}/> Architecting...</> : <><GitMerge size={16}/> Generate Build Plan</>}
                    </Button>
                 </div>
             ) : (
                <ArtifactSection 
                   section="build" 
                   loaderLabel="Architecting Project Structure..."
                   placeholder={<div></div>} 
                />
             )}
        </GlassCard>
      </section>

      {/* Step 2: Agent Kickoff (Visible but Locked if Step 1 Incomplete) */}
      <section className="space-y-6 animate-fade-in relative">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center border border-primary-500/20 text-primary-400">
                <Terminal size={18} />
            </div>
            <h3 className="text-xl font-bold text-slate-200">Step 2: Phase Execution</h3>
        </div>

        <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative transition-all duration-500 ${!buildPlan ? 'opacity-60 grayscale' : 'opacity-100'}`}>
            
            {/* Locked Overlay */}
            {!buildPlan && (
                <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center flex-col">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-white/10">
                        <Lock size={32} className="text-slate-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Build Plan Required</h4>
                    <p className="text-slate-400 max-w-sm text-center mb-6">You must generate the Master Build Plan in Step 1 before you can start executing phases with your AI agent.</p>
                    <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="secondary">
                         Go to Step 1
                    </Button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800 pointer-events-none">
                <button 
                    onClick={() => setActiveTab('kickoff')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'kickoff' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                    <Zap size={16} /> Auto-Pilot (One-Shot)
                </button>
                <button 
                    onClick={() => setActiveTab('guided')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'guided' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                    <Play size={16} /> Guided (Step-by-Step)
                </button>
            </div>

            <div className="p-6 pointer-events-none filter blur-[2px]">
                {/* Visual placeholder for disabled content to show user what's coming */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-black/30 border border-white/5 rounded-xl p-5">
                         <div className="flex items-center gap-3 mb-4">
                            <Terminal size={16} className="text-primary-400"/>
                            <h3 className="font-bold text-white text-sm">Agent Kickoff</h3>
                        </div>
                        <div className="h-20 bg-black/50 rounded-lg"></div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-5">
                         <div className="flex items-center gap-3 mb-4">
                            <Terminal size={16} className="text-primary-400"/>
                            <h3 className="font-bold text-white text-sm">Agent Kickoff</h3>
                        </div>
                        <div className="h-20 bg-black/50 rounded-lg"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Real Step 2 Content (Only rendered if built) */}
        {buildPlan && (
            <div className="absolute top-[52px] left-0 w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 z-10">
                 {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('kickoff')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'kickoff' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Zap size={16} /> Auto-Pilot (One-Shot)
                </button>
                <button 
                    onClick={() => setActiveTab('guided')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'guided' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Play size={16} /> Guided (Step-by-Step)
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'kickoff' && (
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                        {tools.length > 0 ? tools.map(toolId => (
                            <div key={toolId} className="bg-black/30 border border-white/5 rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center border border-white/5 text-primary-400">
                                        <Terminal size={16}/>
                                    </div>
                                    <h3 className="font-bold text-white text-sm">{getToolName(toolId)} Kickoff</h3>
                                </div>
                                <div className="text-xs text-slate-400 mb-2">Copy & Paste into {getToolName(toolId)}:</div>
                                <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-white/5 break-all whitespace-pre-wrap">
                                    {getKickoffCommand(toolId)}
                                </div>
                                <Button 
                                    variant="secondary" 
                                    className="w-full mt-4 h-8 text-xs"
                                    onClick={() => navigator.clipboard.writeText(getKickoffCommand(toolId))}
                                >
                                    Copy Command
                                </Button>
                            </div>
                        )) : (
                            <div className="col-span-2 text-center text-slate-500 py-8">
                                No specific tools selected in Agent Config. 
                                <br/>
                                <Link to="/agent" className="text-primary-400 underline">Select tools</Link> or use Guided Mode for generic prompts.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'guided' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-1/3 space-y-2">
                                <label className="text-xs text-slate-400 uppercase font-mono tracking-wider">Select Phase</label>
                                <div className="space-y-1">
                                    {phases.map((phase, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedPhase(phase)}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                                                selectedPhase === phase 
                                                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                                                    : 'bg-black/20 text-slate-400 hover:bg-black/40 border border-transparent'
                                            }`}
                                        >
                                            {phase}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full md:w-2/3">
                                <div className="mb-4">
                                    <h4 className="text-slate-200 font-bold mb-1">Generate Prompt for {selectedPhase}</h4>
                                    <p className="text-xs text-slate-500">Gemini will write a highly specific prompt for this phase based on the Build Plan.</p>
                                </div>
                                
                                {phasePrompt ? (
                                    <div className="space-y-4">
                                        <CopyBlock 
                                            content={phasePrompt} 
                                            label="Prompt for Agent" 
                                            fileName="phase-prompt"
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleGeneratePhasePrompt} variant="secondary" className="text-xs h-8">
                                                Regenerate
                                            </Button>
                                            <Button onClick={() => setPhasePrompt('')} variant="outline" className="text-xs h-8">
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={handleGeneratePhasePrompt} 
                                        disabled={isPhaseLoading}
                                        className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-black/20 hover:bg-black/30 border-dashed border-2 border-slate-700 hover:border-primary-500/50"
                                    >
                                        {isPhaseLoading ? (
                                            <><Loader2 className="animate-spin" size={24}/> Generating Prompt...</>
                                        ) : (
                                            <><Sparkles size={24}/> Generate Prompt for {selectedPhase.split(':')[0]}</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        )}
      </section>

      {/* Step 3: Troubleshooting */}
      {buildPlan && (
      <section className="space-y-4 pt-8 border-t border-slate-800">
         <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 text-red-400">
                <LifeBuoy size={18} />
            </div>
            <h3 className="text-xl font-bold text-slate-200">Troubleshooter</h3>
        </div>
        
        <GlassCard className="space-y-4">
            <TextArea 
                label="Paste Error Log or Describe Issue" 
                placeholder="e.g. 'npm install fails with dependency conflict' or paste the stack trace..." 
                value={troubleInput}
                onChange={(e) => setTroubleInput(e.target.value)}
            />
            
            <div className="flex justify-end">
                <Button 
                    onClick={handleTroubleshoot} 
                    disabled={isTroubleLoading || !troubleInput}
                    className="bg-red-900/50 hover:bg-red-800 border-red-500/30 text-red-100"
                >
                    {isTroubleLoading ? <><Loader2 className="animate-spin" size={16}/> Analyzing...</> : <><AlertTriangle size={16}/> Fix with Gemini</>}
                </Button>
            </div>

            {troubleOutput && (
                <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in">
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-primary-400" /> Suggested Fix
                    </h4>
                    <CopyBlock content={troubleOutput} fileName="troubleshooting-fix" />
                </div>
            )}
        </GlassCard>
      </section>
      )}

      <StepNavigation 
         prev={{ label: 'Agent Config', path: '/agent' }}
      />
    </div>
  );
});

export default Part5Build;
