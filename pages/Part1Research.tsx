import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, PersonaError, Skeleton, StepNavigation, CopyBlock, TextArea, GlassCard, Tooltip } from '../components/UI';
import { ProjectInput, ProjectTextArea, ProjectSelect } from '../components/FormFields';
import { ArtifactSection } from '../components/ArtifactSection';
import { generateResearchPrompt } from '../utils/templates';
import { Persona } from '../types';
import { Sparkles, Globe, Loader2, Zap, ExternalLink, ArrowDown, CheckCircle2, ArrowRight, Info, BrainCircuit, ChevronDown } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { useToast } from '../components/Toast';
import { getProviderSettings } from '../utils/providerStorage';
import { PROVIDERS } from '../utils/providers';
import { getModelById } from '../utils/modelUtils';

// OpenAI Deep Research Models with pricing
const OPENAI_DEEP_RESEARCH_MODELS = [
  {
    id: 'o3-deep-research',
    name: 'o3 Deep Research',
    description: 'Most capable - comprehensive analysis',
    inputCost: 10.00, // per 1M tokens
    outputCost: 40.00,
  },
  {
    id: 'o4-mini-deep-research',
    name: 'o4-mini Deep Research',
    description: 'Faster - good for quick research',
    inputCost: 1.10,
    outputCost: 4.40,
  },
] as const;

type ResearchProvider = 'gemini' | 'openai';
type OpenAIDeepModel = typeof OPENAI_DEEP_RESEARCH_MODELS[number]['id'];

const Part1Research: React.FC = React.memo(() => {
  const { state, performGeminiResearch, setValidationErrors, setResearchOutput, generationPhase } = useProject();
  const { persona, answers, researchOutput, researchSources, isGenerating } = state;
  const { addToast } = useToast();

  const [researchMethod, setResearchMethod] = useState<'in-app' | 'external'>('in-app');
  const [researchMode, setResearchMode] = useState<'standard' | 'deep'>('standard');
  const [researchProvider, setResearchProvider] = useState<ResearchProvider>('gemini');
  const [openaiDeepModel, setOpenaiDeepModel] = useState<OpenAIDeepModel>('o3-deep-research');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [externalPrompt, setExternalPrompt] = useState<string>('');
  const [externalPasteBuffer, setExternalPasteBuffer] = useState<string>('');

  // Get current provider settings for Standard mode display
  const standardModeInfo = useMemo(() => {
    const providerSettings = getProviderSettings();
    const providerId = providerSettings.defaultProvider;
    const modelId = providerSettings.defaultModels[providerId];
    const provider = PROVIDERS[providerId];
    const model = modelId ? getModelById(modelId) : null;
    return {
      providerName: provider?.displayName || 'Gemini',
      modelName: model?.displayName || 'Default Model',
      logoPath: provider?.logoPath || '/providers/gemini.svg',
    };
  }, []);

  // Sync buffer if researchOutput changes externally (e.g. undo/redo)
  useEffect(() => {
    if (researchOutput && !externalPasteBuffer) {
      setExternalPasteBuffer(researchOutput);
    }
  }, [researchOutput]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Common validation
    if (!answers['project_description'] || answers['project_description'].length < 10) {
      newErrors['project_description'] = 'Project description must be at least 10 characters.';
    }

    // Persona-specific validation
    if (persona === Persona.VibeCoder) {
      if (!answers['research_vibe_who']) newErrors['research_vibe_who'] = 'Target audience is required.';
      if (!answers['research_vibe_platform']) newErrors['research_vibe_platform'] = 'Platform selection is required.';
    } else if (persona === Persona.Developer) {
      // Devs might skip some, but description is key
    } else if (persona === Persona.InBetween) {
      if (!answers['research_mid_problem']) newErrors['research_mid_problem'] = 'Problem definition is required.';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRunResearch = async () => {
    if (validate() && persona) {
      const prompt = generateResearchPrompt(persona, answers);
      await performGeminiResearch(prompt, researchMode, researchProvider, researchProvider === 'openai' ? openaiDeepModel : undefined);
    } else {
      addToast('Please fix validation errors before running research.', 'error');
    }
  };

  const handleGeneratePrompt = () => {
    if (validate() && persona) {
      const prompt = generateResearchPrompt(persona, answers);
      setExternalPrompt(prompt);
      addToast('Research prompt generated!', 'success');
    } else {
      addToast('Please fix validation errors before generating prompt.', 'error');
    }
  };

  const handleSaveExternalResearch = () => {
    if (externalPasteBuffer.trim()) {
      setResearchOutput(externalPasteBuffer);
      addToast('Research results saved!', 'success');
    }
  };

  if (!persona) return <PersonaError />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part I: Deep Research</h2>
        <p className="text-slate-400">Validate your idea and tech stack using Google Search Grounding.</p>
      </div>

      <ModelStatus />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">

          {/* Research Method Segmented Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200">Research Method</label>
              <Tooltip content="In-App uses Gemini to research immediately. External AI generates a prompt you can paste into ChatGPT, Claude, or Perplexity." position="left">
                <div className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary-400 transition-colors cursor-help">
                  <Info size={12} />
                  <span>Which method to use?</span>
                </div>
              </Tooltip>
            </div>

            <div className="bg-slate-950/50 p-1 rounded-xl border border-white/10 flex relative">
              <button
                onClick={() => setResearchMethod('in-app')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 ${researchMethod === 'in-app'
                  ? 'bg-primary-600/20 text-primary-300 shadow-[0_0_15px_rgb(var(--color-primary-500)/0.1)] ring-1 ring-primary-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                <Zap size={14} className={researchMethod === 'in-app' ? 'text-primary-400' : ''} />
                In-App Agent
              </button>
              <button
                onClick={() => setResearchMethod('external')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 ${researchMethod === 'external'
                  ? 'bg-blue-600/20 text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.1)] ring-1 ring-blue-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                <ExternalLink size={14} className={researchMethod === 'external' ? 'text-blue-400' : ''} />
                External AI
              </button>
            </div>

            {/* In-App Research Depth Selection */}
            {researchMethod === 'in-app' && (
              <GlassCard className="p-5 bg-gradient-to-br from-slate-900/90 to-slate-900/50 border-white/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BrainCircuit size={14} className="text-primary-400" /> Research Agent Depth
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Standard Mode Tile */}
                    <button
                      onClick={() => setResearchMode('standard')}
                      className={`relative text-left p-3 rounded-xl border transition-all duration-300 group ${researchMode === 'standard'
                        ? 'bg-primary-500/10 border-primary-500/50 ring-1 ring-primary-500/20'
                        : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${researchMode === 'standard' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
                          <Zap size={16} />
                        </div>
                        {researchMode === 'standard' && <CheckCircle2 size={16} className="text-primary-400" />}
                      </div>
                      <div className="font-bold text-sm text-slate-200 mb-1 group-hover:text-white transition-colors">Standard</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        Fast & efficient. Uses Google Search Grounding.
                        {standardModeInfo.providerName !== 'Gemini' && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded w-fit">
                            <Info size={10} />
                            <span>Forces Gemini</span>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Deep Mode Tile */}
                    <button
                      onClick={() => setResearchMode('deep')}
                      className={`relative text-left p-3 rounded-xl border transition-all duration-300 group ${researchMode === 'deep'
                        ? 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/20'
                        : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5'
                        }`}
                    >
                      <div className="absolute -top-2 -right-2">
                        <span className="bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-purple-500/20">NEW</span>
                      </div>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${researchMode === 'deep' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                          <BrainCircuit size={16} />
                        </div>
                        {researchMode === 'deep' && <CheckCircle2 size={16} className="text-purple-400" />}
                      </div>
                      <div className="font-bold text-sm text-slate-200 mb-1 group-hover:text-white transition-colors">Deep Research</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        Autonomous agentic deep dive. Reads & synthesizes multiple sources.
                      </div>
                    </button>
                  </div>

                  {/* Deep Research Configuration */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${researchMode === 'deep' ? 'max-h-[200px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
                    <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent Model</span>
                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/5">
                          <Tooltip content="Deep Research via Google's Gemini Agent" position="top">
                            <button
                              onClick={() => setResearchProvider('gemini')}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${researchProvider === 'gemini'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'text-slate-400 hover:text-white'
                                }`}
                            >
                              <img src="/providers/gemini.svg" alt="Gemini" className="w-3 h-3 opacity-80" />
                              Gemini
                            </button>
                          </Tooltip>
                          <Tooltip content="Deep Research via OpenAI's o3-mini/deep models" position="top">
                            <button
                              onClick={() => setResearchProvider('openai')}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${researchProvider === 'openai'
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'text-slate-400 hover:text-white'
                                }`}
                            >
                              <img src="/providers/openai.svg" alt="OpenAI" className="w-3 h-3 opacity-80" />
                              OpenAI
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      {/* OpenAI Model Selector */}
                      {researchProvider === 'openai' && (
                        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                          <button
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-green-500/20 rounded-lg text-xs hover:border-green-500/40 transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-green-900/20 flex items-center justify-center text-green-400 group-hover:bg-green-900/30 transition-colors">
                                <Sparkles size={12} />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-slate-200 flex items-center gap-2">
                                  {OPENAI_DEEP_RESEARCH_MODELS.find(m => m.id === openaiDeepModel)?.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                ${OPENAI_DEEP_RESEARCH_MODELS.find(m => m.id === openaiDeepModel)?.inputCost}/1M
                              </span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {/* Dropdown Menu */}
                          {showModelDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-900 border border-green-500/20 rounded-xl overflow-hidden z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-200 ring-1 ring-black/50">
                              {OPENAI_DEEP_RESEARCH_MODELS.map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    setOpenaiDeepModel(model.id);
                                    setShowModelDropdown(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-green-500/10 transition-all ${openaiDeepModel === model.id ? 'bg-green-500/5' : ''
                                    }`}
                                >
                                  <div className="text-left flex items-center gap-2">
                                    {openaiDeepModel === model.id ? <CheckCircle2 size={12} className="text-green-400 shrink-0" /> : <div className="w-3" />}
                                    <div>
                                      <div className="font-medium text-slate-200">{model.name}</div>
                                      <div className="text-[10px] text-slate-500">{model.description}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </GlassCard>
            )}
          </div>

          {persona === Persona.VibeCoder && (
            <>
              <ProjectTextArea
                field="project_description"
                label="1. What is your App Idea?"
                placeholder="Describe it in simple terms, as if explaining to a friend – what problem will it solve?"
                tooltip="The core concept you want to validate. Be concise."
                maxLength={2000}
                required
              />
              <ProjectTextArea
                field="research_vibe_who"
                label="2. Who would use this app?"
                placeholder="Describe your ideal user (e.g., “busy parents,” “small business owners”) and what they need most."
                tooltip="Target audience analysis helps the AI understand market fit."
                maxLength={1000}
                required
              />
              <ProjectTextArea
                field="research_vibe_problem"
                label="3. What problems do they face?"
                placeholder="Outline their biggest pain points or frustrations when trying to do that task today."
                tooltip="Focus on the specific pain points your app solves."
                maxLength={1000}
              />
              <ProjectInput
                field="research_vibe_existing"
                label="4. How are people solving this now?"
                placeholder="Name any similar apps or workarounds your target users currently use."
                tooltip="List competitors or manual workarounds."
                maxLength={200}
              />
              <ProjectTextArea
                field="research_vibe_unique"
                label="5. What makes your solution special?"
                placeholder="Describe the unique value or “secret sauce” that makes users choose you."
                tooltip="Your Unique Selling Proposition (USP)."
                maxLength={1000}
              />
              <ProjectTextArea
                field="research_vibe_features"
                label="6. Must-Have Features (Top 3)"
                placeholder="Focus on the essentials you can’t launch without."
                tooltip="Key MVP features."
                maxLength={1000}
              />
              <ProjectSelect
                field="research_vibe_platform"
                label="7. On which platform will people use your app?"
                tooltip="Target device ecosystem."
                required
                options={[
                  { value: "Web (browser)", label: "Web (Browser / SPA)" },
                  { value: "Mobile (iOS/Android)", label: "Mobile (iOS/Android App)" },
                  { value: "Desktop (Mac/Win)", label: "Desktop (Mac/Windows)" },
                  { value: "Cross-Platform", label: "Cross-Platform (All devices)" },
                  { value: "Browser Extension", label: "Browser Extension" },
                  { value: "Watch/Wearable", label: "Watch/Wearable" },
                  { value: "TV App", label: "TV App" },
                  { value: "Not sure", label: "Not sure" }
                ]}
              />

              <ProjectSelect
                field="research_vibe_timeline"
                label="8. How soon do you want to launch?"
                tooltip="Helps determine development velocity."
                options={[
                  { value: "ASAP – a few weeks", label: "ASAP – a few weeks" },
                  { value: "1–2 months", label: "1–2 months" },
                  { value: "Flexible/learning", label: "Flexible/learning" }
                ]}
              />

              <ProjectSelect
                field="research_vibe_budget"
                label="9. What’s your budget for tools?"
                tooltip="Constraints for tool selection."
                options={[
                  { value: "Free only", label: "Free / Zero Cost ($0)" },
                  { value: "<$50/month", label: "Hobbyist (Under $50/mo)" },
                  { value: "<$200/month", label: "Pro / Startup (Under $200/mo)" },
                  { value: "<$500/month", label: "Business (Under $500/mo)" },
                  { value: "Flexible if worth it", label: "Flexible if worth it" }
                ]}
              />
            </>
          )}

          {persona === Persona.Developer && (
            <>
              <ProjectTextArea
                field="project_description"
                label="1. Project Focus & Context"
                placeholder="Brief overview including technical domain or problem space."
                tooltip="Technical domain overview."
                maxLength={3000}
                required
              />
              <ProjectTextArea
                field="research_dev_questions"
                label="2. Specific Questions"
                placeholder="e.g. 'Is tRPC better than GraphQL for this?', 'Limitations of Gemini Flash context?', 'Best vector DB for this scale?'"
                tooltip="Key technical uncertainties to resolve."
                maxLength={2000}
              />
              <ProjectTextArea
                field="research_dev_stack_specifics"
                label="3. Stack/API Specifics"
                placeholder="Are there specific libraries, APIs, or architectural patterns you are considering? (e.g. 'Stripe vs LemonSqueezy', 'Prisma vs Drizzle')"
                tooltip="Constraints or preferences for the stack."
                maxLength={1000}
              />
              <ProjectInput
                field="research_dev_decisions"
                label="4. Decisions to Inform"
                placeholder="What technical/arch decisions will this research inform?"
                tooltip="Why are you running this research?"
              />
              <ProjectInput
                field="research_dev_timing"
                label="5. Why Now?"
                placeholder="Any market trend or emerging tech that makes this timely?"
                tooltip="Market timing context."
              />
              <ProjectTextArea
                field="research_dev_scope"
                label="6. Scope Boundaries"
                placeholder="What is explicitly IN and OUT of scope?"
                tooltip="Define the MVP boundaries."
              />
              <ProjectSelect
                field="research_dev_depth"
                label="7. Research Depth"
                tooltip="Depth of analysis required."
                options={[
                  { value: "Surface-level", label: "Surface-level" },
                  { value: "Deep Dive", label: "Deep Dive" },
                  { value: "Comprehensive", label: "Comprehensive" }
                ]}
              />
              <ProjectInput
                field="research_dev_sources"
                label="8. Source Priority"
                placeholder="Rank: Academic, GitHub, Docs, Blogs, Competitors..."
                tooltip="Preferred information sources."
              />
              <ProjectTextArea
                field="research_dev_constraints"
                label="9. Technical Constraints"
                placeholder="Must use/avoid specific languages, frameworks, standards?"
                tooltip="Hard technical requirements."
              />
              <ProjectInput
                field="research_dev_context"
                label="10. Broader Context"
                placeholder="Startup, Enterprise, Side Project? Domain details?"
                tooltip="Business context."
              />
            </>
          )}

          {persona === Persona.InBetween && (
            <>
              <ProjectTextArea
                field="project_description"
                label="1. Idea & Coding Experience"
                placeholder="Briefly describe your project idea and your coding experience. What can you build already?"
                tooltip="Your idea + your skill level."
                maxLength={2000}
                required
              />
              <ProjectTextArea
                field="research_mid_problem"
                label="2. Problem & User"
                placeholder="What problem are you solving, and who experiences this problem most?"
                tooltip="The 'Why' and 'Who'."
                required
              />
              <ProjectTextArea
                field="research_mid_learn"
                label="3. Research & Learning Needs"
                placeholder="List technical topics (frameworks) and business topics (market) to investigate."
                tooltip="What do you need to learn to build this?"
              />
              <ProjectInput
                field="research_mid_existing"
                label="4. Similar Solutions"
                placeholder="Competing apps or DIY solutions? What do you like/dislike?"
                tooltip="Existing market landscape."
              />
              <ProjectTextArea
                field="research_mid_validation"
                label="5. Validation Strategy"
                placeholder="How will you validate people need this? (Surveys, prototype?)"
                tooltip="How will you prove it works?"
              />
              <ProjectSelect
                field="research_mid_platform"
                label="6. Platform Preference"
                tooltip="Where will it run?"
                options={[
                  { value: "Web App", label: "Web App (React/Next.js)" },
                  { value: "Mobile App", label: "Mobile App (iOS/Android)" },
                  { value: "Desktop App", label: "Desktop App (Mac/Win)" },
                  { value: "Cross-Platform", label: "Cross-Platform" },
                  { value: "Chrome Extension", label: "Browser Extension" },
                  { value: "Not sure", label: "Not sure – need guidance" }
                ]}
              />
              <ProjectInput
                field="research_mid_comfort"
                label="7. Technical Comfort Zone"
                placeholder="What languages/tools do you know? Open to new ones?"
                tooltip="Your current tech stack."
              />
              <ProjectInput
                field="research_mid_timeline"
                label="8. Timeline & Success"
                placeholder="Target launch date? How will you measure success?"
                tooltip="Goals and deadlines."
              />
              <ProjectSelect
                field="research_mid_budget"
                label="9. Budget"
                tooltip="Financial constraints."
                options={[
                  { value: "Free tools only", label: "Free tools only ($0)" },
                  { value: "Under $50/month", label: "Hobbyist (Under $50/mo)" },
                  { value: "Under $200/month", label: "Pro (Under $200/mo)" },
                  { value: "Flexible if needed", label: "Flexible / Scale as needed" }
                ]}
              />
            </>
          )}

          {/* Action Area */}
          <div className="pt-4 border-t border-white/5">
            {researchMethod === 'in-app' ? (
              <Button
                onClick={handleRunResearch}
                disabled={isGenerating}
                className={`w-full border-0 ${researchMode === 'deep'
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 shadow-purple-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-500 hover:to-primary-500'
                  }`}
                tooltip={researchMode === 'deep' ? `Uses ${researchProvider === 'openai' ? openaiDeepModel : 'Gemini deep-research'} agent. Takes 2-10 minutes. Pricing: ${researchProvider === 'gemini' ? '$2.00/1M in, $12.00/1M out (Same as Gemini 3 Pro)' : ''}` : "Standard Gemini 3 Pro + Search research."}
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin" size={18} /> {generationPhase || (researchMode === 'deep' ? 'Agent Working...' : 'Researching...')}</>
                ) : (
                  <><Sparkles size={18} /> Run {researchMode === 'deep' ? 'Deep Research' : 'Research'} with {researchMode === 'deep' ? (researchProvider === 'gemini' ? 'Gemini' : 'OpenAI') : standardModeInfo.providerName}</>
                )}
              </Button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <Button
                  onClick={handleGeneratePrompt}
                  variant="secondary"
                  className="w-full border-blue-500/20 hover:border-blue-500/50"
                >
                  <Sparkles size={18} className="text-blue-400" /> Generate Prompt for External AI
                </Button>

                {externalPrompt && (
                  <div className="space-y-4">
                    <CopyBlock content={externalPrompt} label="Prompt to Copy" fileName="research-prompt" />

                    {/* Visual Indicator for Right Panel */}
                    <div className="hidden md:flex items-center justify-between p-3 rounded-lg border border-dashed border-blue-500/30 bg-blue-500/5 text-blue-300 text-xs font-mono animate-pulse">
                      <span className="flex items-center gap-2"><ArrowRight size={14} /> COPY PROMPT ABOVE</span>
                      <span className="flex items-center gap-2">PASTE RESULT IN RIGHT PANEL <ArrowRight size={14} /></span>
                    </div>

                    <div className="md:hidden flex flex-col items-center justify-center py-2 text-slate-500">
                      <ArrowDown size={16} className="animate-bounce" />
                      <span className="text-[10px] uppercase tracking-widest mt-1">Paste Result Below</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* If External Method AND No Output yet, show Paste Card instead of ArtifactSection Placeholder */}
          {researchMethod === 'external' && !researchOutput ? (
            <GlassCard className="h-full flex flex-col justify-center min-h-[400px] border-dashed border-blue-500/20 bg-blue-900/5">
              <div className="text-center mb-6">
                <Sparkles className="mx-auto mb-3 text-blue-400" size={32} />
                <h3 className="text-lg font-bold text-slate-200">External Research Results</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">Paste the output from ChatGPT, Perplexity, or Gemini Advanced here to populate the workspace.</p>
              </div>
              <TextArea
                label="Paste Results"
                placeholder="Paste your research findings here..."
                value={externalPasteBuffer}
                onChange={(e) => setExternalPasteBuffer(e.target.value)}
                className="flex-1 min-h-[200px] mb-4 bg-slate-900/50 border-blue-500/20 focus:border-blue-500/50"
              />
              <Button
                onClick={handleSaveExternalResearch}
                disabled={!externalPasteBuffer.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                <CheckCircle2 size={16} /> Save Research
              </Button>
            </GlassCard>
          ) : (
            <ArtifactSection
              section="research"
              loaderLabel={researchMode === 'deep' ? "Agent is browsing, reading, and synthesizing (this may take a minute)..." : "Conducting Deep Research & Market Analysis..."}
              mode={researchMethod === 'external' ? 'manual' : 'ai'}
              placeholder={
                <div className="max-w-xs">
                  <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                  <p>
                    Fill in the details and click "Run Research" to let Gemini browse the web and analyze your idea.
                  </p>
                </div>
              }
            >
              {/* Sources Display Logic */}
              {isGenerating && (!researchSources || researchSources.length === 0) && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mt-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2 pl-6">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              )}

              {researchSources && researchSources.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Globe size={14} className="text-blue-400" /> Sources
                  </h4>
                  <div className="space-y-2">
                    {researchSources.map((source, idx) => (
                      source.web?.uri && (
                        <a
                          key={idx}
                          href={source.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-400 hover:underline truncate"
                        >
                          {idx + 1}. {source.web.title || source.web.uri}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}
            </ArtifactSection>
          )}
        </div>
      </div>

      <StepNavigation
        prev={{ label: 'Start', path: '/' }}
        next={{ label: 'Define PRD', path: '/prd', disabled: !researchOutput }}
        onPrefetchNext={() => import('./Part2PRD')}
      />
    </div>
  );
});

export default Part1Research;