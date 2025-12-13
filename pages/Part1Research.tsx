import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, PersonaError, Skeleton, StepNavigation, CopyBlock, TextArea, GlassCard, Tooltip } from '../components/UI';
import { ProjectInput, ProjectTextArea, ProjectSelect } from '../components/FormFields';
import { ArtifactSection } from '../components/ArtifactSection';
import { generateResearchPrompt } from '../utils/templates';
import { Persona } from '../types';
import { Sparkles, Globe, Loader2, Zap, ExternalLink, ArrowDown, CheckCircle2, ArrowRight, Info, BrainCircuit } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { useToast } from '../components/Toast';

const Part1Research: React.FC = React.memo(() => {
  const { state, performGeminiResearch, setValidationErrors, setResearchOutput, generationPhase } = useProject();
  const { persona, answers, researchOutput, researchSources, isGenerating } = state;
  const { addToast } = useToast();
  
  const [researchMethod, setResearchMethod] = useState<'in-app' | 'external'>('in-app');
  const [researchMode, setResearchMode] = useState<'standard' | 'deep'>('standard');
  const [externalPrompt, setExternalPrompt] = useState<string>('');
  const [externalPasteBuffer, setExternalPasteBuffer] = useState<string>('');

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
      await performGeminiResearch(prompt, researchMode);
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
          
          {/* Research Method Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 w-full md:w-fit">
                  <button 
                  onClick={() => setResearchMethod('in-app')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all duration-300 ${
                      researchMethod === 'in-app' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                  >
                      <Zap size={14} /> In-App (Gemini)
                  </button>
                  <button 
                  onClick={() => setResearchMethod('external')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all duration-300 ${
                      researchMethod === 'external' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                  >
                      <ExternalLink size={14} /> External AI
                  </button>
              </div>
              <Tooltip content="In-App uses Gemini to research immediately. External AI generates a prompt you can paste into ChatGPT, Claude, or Perplexity." position="right">
                  <div className="p-2 text-slate-500 hover:text-slate-300 transition-colors cursor-help">
                      <Info size={16} />
                  </div>
              </Tooltip>
            </div>

            {/* In-App Research Depth Toggle */}
            {researchMethod === 'in-app' && (
              <GlassCard className="p-3 bg-surface/30 border-primary-500/10">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                       <BrainCircuit size={12} className="text-primary-400" /> Research Agent
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setResearchMode('standard')}
                        className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                          researchMode === 'standard' 
                            ? 'bg-primary-500/20 border-primary-500/50 text-white' 
                            : 'bg-black/20 border-transparent text-slate-500 hover:bg-black/40'
                        }`}
                      >
                         <div className="font-bold mb-0.5">Standard</div>
                         <div className="opacity-70 text-[10px]">Gemini 3 Pro + Search</div>
                      </button>
                      <button
                        onClick={() => setResearchMode('deep')}
                        className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                          researchMode === 'deep' 
                            ? 'bg-purple-500/20 border-purple-500/50 text-white' 
                            : 'bg-black/20 border-transparent text-slate-500 hover:bg-black/40'
                        }`}
                      >
                         <div className="font-bold mb-0.5 flex items-center gap-1">Deep Research <span className="bg-purple-500 text-white text-[8px] px-1 rounded">NEW</span></div>
                         <div className="opacity-70 text-[10px]">Agentic Deep Dive (Slow)</div>
                      </button>
                   </div>
                   {researchMode === 'deep' && (
                      <div className="mt-1 p-2.5 rounded-lg bg-purple-900/20 border border-purple-500/20 text-xs text-purple-200/80 flex items-start gap-2">
                          <Info size={14} className="shrink-0 mt-0.5 text-purple-400" />
                          <span>
                              <strong>Preview Feature:</strong> Deep Research (via Interactions API) is rolling out gradually. If unavailable for your key, we will automatically fall back to Standard mode.
                          </span>
                      </div>
                   )}
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
                tooltip="Target audience analysis helps Gemini understand market fit."
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
                    className={`w-full border-0 ${
                       researchMode === 'deep' 
                         ? 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 shadow-purple-500/20' 
                         : 'bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-500 hover:to-primary-500'
                    }`}
                    tooltip={researchMode === 'deep' ? "Uses 'deep-research-pro' agent. Takes 2-5 minutes." : "Standard Gemini 3 Pro research."}
                >
                    {isGenerating ? (
                    <><Loader2 className="animate-spin" size={18} /> {generationPhase || (researchMode === 'deep' ? 'Agent Working...' : 'Researching...')}</>
                    ) : (
                    <><Sparkles size={18} /> Run {researchMode === 'deep' ? 'Deep Research' : 'Research'} with Gemini</>
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