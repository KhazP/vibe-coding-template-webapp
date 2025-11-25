
import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, PersonaError, StepNavigation } from '../components/UI';
import { ProjectInput, ProjectTextArea } from '../components/FormFields';
import { ArtifactSection } from '../components/ArtifactSection';
import { generatePRDPrompt } from '../utils/templates';
import { Sparkles, CheckCircle, AlertCircle, Edit2, Loader2, Link } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { Persona } from '../types';
import { useToast } from '../components/Toast';

const Part2PRD: React.FC = React.memo(() => {
  const { state, setAnswer, performGeminiPRD, setValidationErrors } = useProject();
  const { answers, prdOutput, persona, researchOutput, isGenerating } = state;
  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const { addToast } = useToast();

  // Sync answers from Research to PRD
  useEffect(() => {
    // VibeCoder Mappings
    if (persona === Persona.VibeCoder) {
      if (!answers['prd_vibe_users'] && answers['research_vibe_who']) {
        setAnswer('prd_vibe_users', answers['research_vibe_who']);
      }
      if (!answers['prd_vibe_features'] && answers['research_vibe_features']) {
        setAnswer('prd_vibe_features', answers['research_vibe_features']);
      }
    }

    // Developer Mappings
    if (persona === Persona.Developer) {
      // 1. Project Context -> One-Liner
      if (!answers['prd_dev_oneliner'] && answers['project_description']) {
        setAnswer('prd_dev_oneliner', answers['project_description']);
      }
      // 2. Research Constraints -> Tech Requirements
      if (!answers['prd_dev_tech'] && answers['research_dev_constraints']) {
        setAnswer('prd_dev_tech', answers['research_dev_constraints']);
      }
      // 3. Research Context -> Biz Constraints
      if (!answers['prd_dev_biz'] && answers['research_dev_context']) {
        setAnswer('prd_dev_biz', answers['research_dev_context']);
      }
    }

    // In-Between Mappings
    if (persona === Persona.InBetween) {
      if (!answers['prd_mid_purpose'] && answers['project_description']) {
        setAnswer('prd_mid_purpose', answers['project_description']);
      }
      if (!answers['prd_mid_users'] && answers['research_mid_problem']) {
         setAnswer('prd_mid_users', answers['research_mid_problem']);
      }
      if (!answers['prd_mid_metric'] && answers['research_mid_timeline']) {
         setAnswer('prd_mid_metric', answers['research_mid_timeline']);
      }
    }
  }, [
    persona, 
    answers['research_vibe_who'], 
    answers['research_vibe_features'],
    answers['project_description'], 
    answers['research_dev_constraints'], 
    answers['research_dev_context'],
    answers['research_mid_problem'],
    answers['research_mid_timeline']
  ]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (persona === Persona.VibeCoder) {
        if (!answers['prd_vibe_name']) newErrors['prd_vibe_name'] = "Project name is required.";
        if (!answers['project_description']) newErrors['project_description'] = "Problem statement is required.";
        if (!answers['prd_vibe_users']) newErrors['prd_vibe_users'] = "User persona is required.";
        if (!answers['prd_vibe_features']) newErrors['prd_vibe_features'] = "Core features are required.";
    } 
    else if (persona === Persona.Developer) {
        if (!answers['prd_dev_name']) newErrors['prd_dev_name'] = "Project name is required.";
        if (!answers['prd_dev_oneliner']) newErrors['prd_dev_oneliner'] = "One-liner is required.";
        if (!answers['prd_dev_features']) newErrors['prd_dev_features'] = "Feature list is required.";
    }
    else if (persona === Persona.InBetween) {
        if (!answers['prd_mid_name']) newErrors['prd_mid_name'] = "Project name is required.";
        if (!answers['prd_mid_purpose']) newErrors['prd_mid_purpose'] = "Purpose is required.";
        if (!answers['prd_mid_features']) newErrors['prd_mid_features'] = "Core features are required.";
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (validate() && persona) {
      const prompt = generatePRDPrompt(persona, answers, researchOutput);
      await performGeminiPRD(prompt);
    } else {
      addToast('Please fix validation errors before generating PRD.', 'error');
    }
  };

  const hasIdea = !!answers['project_description'];
  const fromResearchBadge = <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"><Link size={8}/> From Research</span>;

  if (!persona) return <PersonaError />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part II: Product Requirements</h2>
        <p className="text-slate-400">Define WHAT you are building using a framework tailored to your style.</p>
      </div>

      <ModelStatus />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          
          {persona === Persona.VibeCoder && (
             <>
               <ProjectInput 
                 field="prd_vibe_name"
                 label="1. What’s the name of your product/app?" 
                 placeholder="If undecided, we can brainstorm." 
                 tooltip="Catchy name for the project." 
                 maxLength={100}
                 required
               />
               
               {/* Smart Idea Input: Hides if already filled in Part 1 */}
               {hasIdea && !showIdeaInput ? (
                 <div className="mb-5 p-4 bg-surface/50 border border-white/10 rounded-xl flex justify-between items-center group hover:border-primary-500/30 transition-colors">
                    <div className="flex-1 mr-4">
                        <label className="text-xs font-mono text-primary-400 uppercase tracking-widest block mb-1">Project Idea (From Research)</label>
                        <p className="text-slate-300 text-sm line-clamp-2 italic">"{answers['project_description']}"</p>
                    </div>
                    <Button variant="secondary" onClick={() => setShowIdeaInput(true)} className="h-8 text-xs px-3 gap-1">
                        <Edit2 size={12} /> Edit
                    </Button>
                 </div>
               ) : (
                 <ProjectTextArea 
                   field="project_description"
                   label="2. In one sentence, what problem does your app solve?" 
                   placeholder="e.g. “Helps freelancers track time and invoice clients automatically”" 
                   tooltip="The elevator pitch." 
                   maxLength={1000}
                   required
                   rightLabel={answers['project_description'] ? fromResearchBadge : undefined}
                 />
               )}

               <ProjectInput 
                 field="prd_vibe_goal"
                 label="3. What’s your launch goal or motivation?" 
                 placeholder="100 users? Earn $1,000 MRR? Build portfolio?" 
                 tooltip="Define success." 
                 maxLength={200} 
               />
               
               <ProjectTextArea 
                  field="prd_vibe_users"
                  label={answers['research_vibe_who'] ? "4. Refine your User Persona" : "4. Who will use your app?"} 
                  placeholder="Describe target users: Job, Lifestyle, Tech-savviness, Frustrations." 
                  tooltip="Detailed user persona." 
                  maxLength={1000}
                  required
                  rightLabel={answers['research_vibe_who'] ? fromResearchBadge : undefined}
               />
               
               <ProjectTextArea 
                 field="prd_vibe_story"
                 label="5. Imagine a typical user’s journey." 
                 placeholder="Tell a short story: User has problem X... finds app... does Y... happy because Z." 
                 tooltip="Narrative user flow." 
                 maxLength={2000} 
               />
               
               <ProjectTextArea 
                  field="prd_vibe_features"
                  label={answers['research_vibe_features'] ? "6. Refine Must-Have Features (Top 3-5)" : "6. What are the 3–5 must-have features for launch?"} 
                  placeholder="Core features your MVP absolutely needs." 
                  tooltip="MVP Requirements." 
                  maxLength={2000}
                  required
                  rightLabel={answers['research_vibe_features'] ? fromResearchBadge : undefined}
               />
               
               <ProjectTextArea 
                 field="prd_vibe_non_features"
                 label="7. What features are you not including now?" 
                 placeholder="List ideas saved for Version 2+." 
                 tooltip="Out of scope items." 
               />
               <ProjectInput 
                 field="prd_vibe_metric"
                 label="8. How will you know if the app is successful?" 
                 placeholder="1–2 simple metrics (sign-ups, daily users)." 
                 tooltip="Key Performance Indicators (KPIs)." 
                 maxLength={200} 
               />
               <ProjectInput 
                 field="prd_vibe_vibe"
                 label="9. What vibe or style do you want for the UI/UX?" 
                 placeholder="e.g. “clean, fast, professional” or “fun, colorful, friendly”" 
                 tooltip="Look and feel." 
                 maxLength={200} 
               />
               <ProjectTextArea 
                 field="prd_vibe_constraints"
                 label="10. Any constraints or special requirements?" 
                 placeholder="Budget limits, deadline, specific platforms/technologies." 
                 tooltip="Limitations to consider." 
               />
             </>
          )}

          {persona === Persona.Developer && (
            <>
               <ProjectInput 
                 field="prd_dev_name"
                 label="1. Product/App Name" 
                 placeholder="Product name" 
                 tooltip="Project identifier." 
                 required
               />
               
               <ProjectTextArea 
                 field="prd_dev_oneliner"
                 label={answers['project_description'] ? "2. Refine Executive One-Liner" : "2. Executive one-liner"} 
                 placeholder="Problem solved / Value provided." 
                 tooltip="Concise value prop (Pre-filled from Research Context)." 
                 maxLength={500}
                 required
                 rightLabel={answers['project_description'] ? fromResearchBadge : undefined}
               />
               
               <ProjectInput 
                 field="prd_dev_goal"
                 label="3. Launch goal or key objective" 
                 placeholder="Success criteria for launch (user count, revenue)." 
                 tooltip="Business objective." 
               />
               <ProjectTextArea 
                 field="prd_dev_audience"
                 label="4. Define your target audience in detail" 
                 placeholder="Primary/Secondary personas, Jobs-to-be-done." 
                 tooltip="User segmentation." 
               />
               <ProjectTextArea 
                 field="prd_dev_stories"
                 label="5. Provide 3–5 user stories for the MVP" 
                 placeholder="'As a [user], I want to [action] so that [benefit]'." 
                 tooltip="Agile user stories." 
               />
               
               <ProjectTextArea 
                 field="prd_dev_features"
                 label="6. List core features with priorities (MoSCoW)" 
                 placeholder="Must-have, Should-have, Could-have, Won't-have." 
                 tooltip="Feature prioritization." 
                 maxLength={3000}
                 required
               />

               <ProjectInput 
                 field="prd_dev_metrics"
                 label="7. Define success metrics and targets" 
                 placeholder="Activation rate, engagement, retention, revenue." 
                 tooltip="Quantitative metrics." 
               />
               
               <ProjectTextArea 
                 field="prd_dev_tech"
                 label={answers['research_dev_constraints'] ? "8. Refine Technical & UX Requirements" : "8. Technical & UX Requirements"} 
                 placeholder="Performance, Accessibility, Platform support, Design system." 
                 tooltip="Non-functional requirements (Pre-filled from Research)." 
                 rightLabel={answers['research_dev_constraints'] ? fromResearchBadge : undefined}
               />
               
               <ProjectTextArea 
                 field="prd_dev_compliance"
                 label="9. Compliance & Data Privacy" 
                 placeholder="GDPR, HIPAA, Data Residency, Auditing requirements?" 
                 tooltip="Legal/Security constraints." 
               />
               <ProjectTextArea 
                 field="prd_dev_risks"
                 label="10. Assess risks and assumptions" 
                 placeholder="Technical risks, market risks, execution risks." 
                 tooltip="Risk mitigation." 
               />
               
               <ProjectTextArea 
                 field="prd_dev_biz"
                 label={answers['research_dev_context'] ? "11. Refine Business model & constraints" : "11. Business model & constraints"} 
                 placeholder="Monetization, Budget, Corporate policies." 
                 tooltip="Business constraints (Pre-filled from Research Context)." 
                 rightLabel={answers['research_dev_context'] ? fromResearchBadge : undefined}
               />
            </>
          )}

          {persona === Persona.InBetween && (
            <>
               <ProjectInput 
                 field="prd_mid_name"
                 label="1. What’s the name of your app or project?" 
                 placeholder="Name of your project." 
                 tooltip="Project name." 
                 required
               />
               
               <ProjectTextArea 
                 field="prd_mid_purpose"
                 label={answers['project_description'] ? "2. Refine the app’s purpose" : "2. Summarize the app’s purpose in one sentence."} 
                 placeholder="What problem does it solve, or what goal does it help users achieve?" 
                 tooltip="Purpose statement (Pre-filled from Research)." 
                 maxLength={1000}
                 required
                 rightLabel={answers['project_description'] ? fromResearchBadge : undefined}
               />
               
               <ProjectInput 
                 field="prd_mid_goal"
                 label="3. What is your launch goal for this MVP?" 
                 placeholder="e.g. “Get 50 beta users,” “Have a working app in 2 months”" 
                 tooltip="Learning or business goal." 
               />
               
               <ProjectTextArea 
                 field="prd_mid_users"
                 label={answers['research_mid_problem'] ? "4. Refine Target Users & Needs" : "4. Who are your target users and what do they need?"} 
                 placeholder="Primary user type, main problem, current workaround." 
                 tooltip="Target user definition (Pre-filled from Research)." 
                 rightLabel={answers['research_mid_problem'] ? fromResearchBadge : undefined}
               />
               
               <ProjectTextArea 
                 field="prd_mid_flow"
                 label="5. Walk through the main user flow." 
                 placeholder="Discovery -> First action -> Core action -> Outcome." 
                 tooltip="Core user journey." 
                 maxLength={2000} 
               />
               
               <ProjectTextArea 
                 field="prd_mid_features"
                 label="6. Which 3–5 features must be in Version 1?" 
                 placeholder="Briefly describe what it does and why it’s critical." 
                 tooltip="MVP scope." 
                 maxLength={2000}
                 required
               />

               <ProjectTextArea 
                 field="prd_mid_non_features"
                 label="7. What are you not building yet?" 
                 placeholder="Features deferred until later." 
                 tooltip="Future roadmap." 
               />
               
               <ProjectInput 
                 field="prd_mid_metric"
                 label={answers['research_mid_timeline'] ? "8. Refine Success Metrics" : "8. How will you measure success?"} 
                 placeholder="Short-term (1 month) and Medium-term (3 months) metrics." 
                 tooltip="Success definitions." 
                 rightLabel={answers['research_mid_timeline'] ? fromResearchBadge : undefined}
               />
               
               <ProjectTextArea 
                 field="prd_mid_design"
                 label="9. Describe the desired design and user experience." 
                 placeholder="Visual style, key screens, mobile-responsive?" 
                 tooltip="UX/UI expectations." 
               />
               <ProjectTextArea 
                 field="prd_mid_constraints"
                 label="10. List any constraints or requirements." 
                 placeholder="Budget, timeline, technical preferences." 
                 tooltip="Hard constraints." 
               />
            </>
          )}

          {/* Context Indicator */}
          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${researchOutput ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
             {researchOutput ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
             {researchOutput ? "Research Context Attached" : "No Research Context found (skipping Part 1)"}
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-green-600 to-primary-600 hover:from-green-500 hover:to-primary-500 border-0"
            tooltip="Generate a structured PRD using Gemini."
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} /> Generating...</>
            ) : (
              <><Sparkles size={18} /> Generate PRD with Gemini</>
            )}
          </Button>
        </div>

        <div className="space-y-4">
           <ArtifactSection 
             section="prd"
             loaderLabel="Defining Product Requirements & User Stories..."
             placeholder={
               <div className="max-w-xs">
                 <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                 <p>Fill in the details and click "Generate PRD" to let Gemini draft a comprehensive document.</p>
               </div>
             }
           />
        </div>
      </div>
      
      <StepNavigation 
         prev={{ label: 'Research', path: '/research' }}
         next={{ label: 'Tech Design', path: '/tech', disabled: !prdOutput }}
         onPrefetchNext={() => import('./Part3Tech')}
      />
    </div>
  );
});

export default Part2PRD;
