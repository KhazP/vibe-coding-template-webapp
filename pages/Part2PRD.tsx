import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, PersonaError, StepNavigation } from '../components/UI';
import { ProjectInput, ProjectTextArea, ProjectSelect } from '../components/FormFields';
import { ArtifactSection } from '../components/ArtifactSection';
import { generatePRDPrompt } from '../utils/templates';
import { Sparkles, CheckCircle, AlertCircle, Edit2, Loader2, Link } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { Persona } from '../types';
import { useToast } from '../components/Toast';
import { getModelById } from '../utils/modelUtils';

const Part2PRD: React.FC = React.memo(() => {
  const { state, setAnswer, performGeminiPRD, setValidationErrors, generationPhase } = useProject();
  const { answers, prdOutput, persona, researchOutput, isGenerating } = state;
  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const { addToast } = useToast();

  // Get model display name for dynamic button text
  const modelConfig = getModelById(state.settings.modelName);
  const providerDisplayName = modelConfig?.displayName || 'AI';

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
  const fromResearchBadge = <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"><Link size={8} /> From Research</span>;

  if (!persona) return <PersonaError />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Part II: Product Requirements</h1>
        <p className="text-slate-400">Define WHAT you are building using a framework tailored to your style.</p>
      </div>

      <ModelStatus />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                tooltip="Scope creep prevention."
                maxLength={1000}
              />

              <ProjectInput
                field="prd_vibe_metric"
                label="8. How will you know it’s working?"
                placeholder="e.g. 'Users engage daily' or 'People pay $5'."
                tooltip="Success metrics."
              />

              <ProjectInput
                field="prd_vibe_vibe"
                label="9. What’s the 'Vibe' of the app?"
                placeholder="e.g. Minimalist & Fast, Fun & Gamified, Corporate & Serious."
                tooltip="Design aesthetic and tone."
              />

              <ProjectTextArea
                field="prd_vibe_constraints"
                label="10. Any hard constraints?"
                placeholder="Budget, Timeline, Legal, etc."
                tooltip="Limitations."
              />
            </>
          )}

          {persona === Persona.Developer && (
            <>
              <ProjectInput
                field="prd_dev_name"
                label="1. Project Name"
                placeholder="Internal codename or product name."
                required
              />
              <ProjectTextArea
                field="prd_dev_oneliner"
                label={answers['project_description'] ? "2. Refine Problem/Solution Statement" : "2. Problem/Solution Statement"}
                placeholder="Concise technical problem and proposed solution."
                required
                rightLabel={answers['project_description'] ? fromResearchBadge : undefined}
              />
              <ProjectInput
                field="prd_dev_goal"
                label="3. Primary Objective"
                placeholder="Business or technical goal."
              />
              <ProjectTextArea
                field="prd_dev_audience"
                label="4. Target Audience"
                placeholder="User segments."
              />
              <ProjectTextArea
                field="prd_dev_stories"
                label="5. Key User Stories"
                placeholder="As a [user], I want to [action] so that [benefit]."
              />
              <ProjectTextArea
                field="prd_dev_features"
                label="6. Functional Requirements (MoSCoW)"
                placeholder="Must Have, Should Have, Could Have, Won't Have."
                required
              />
              <ProjectTextArea
                field="prd_dev_metrics"
                label="7. Success Metrics (KPIs)"
                placeholder="Retention, Latency, Conversion."
              />
              <ProjectTextArea
                field="prd_dev_tech"
                label={answers['research_dev_constraints'] ? "8. Refine Tech Requirements" : "8. Tech Requirements"}
                placeholder="Platform, performance budgets, existing infra integration."
                rightLabel={answers['research_dev_constraints'] ? fromResearchBadge : undefined}
              />
              <ProjectTextArea
                field="prd_dev_compliance"
                label="9. Compliance & Security"
                placeholder="GDPR, HIPAA, SOC2, Auth requirements."
              />
              <ProjectTextArea
                field="prd_dev_risks"
                label="10. Risks & Mitigation"
                placeholder="Technical debt, adoption risks."
              />
              <ProjectTextArea
                field="prd_dev_biz"
                label={answers['research_dev_context'] ? "11. Refine Business Constraints" : "11. Business Constraints"}
                placeholder="Budget, Timeline, Stakeholders."
                rightLabel={answers['research_dev_context'] ? fromResearchBadge : undefined}
              />
            </>
          )}

          {persona === Persona.InBetween && (
            <>
              <ProjectInput
                field="prd_mid_name"
                label="1. App Name"
                required
              />
              <ProjectTextArea
                field="prd_mid_purpose"
                label={answers['project_description'] ? "2. Refine Purpose" : "2. Purpose"}
                placeholder="Why are you building this? What problem does it solve?"
                required
                rightLabel={answers['project_description'] ? fromResearchBadge : undefined}
              />
              <ProjectInput
                field="prd_mid_goal"
                label="3. Learning vs Launching?"
                placeholder="Is the goal to learn X technology or launch a real business?"
              />
              <ProjectTextArea
                field="prd_mid_users"
                label={answers['research_mid_problem'] ? "4. Refine Users" : "4. Target Users"}
                placeholder="Who is this for?"
                rightLabel={answers['research_mid_problem'] ? fromResearchBadge : undefined}
              />
              <ProjectTextArea
                field="prd_mid_flow"
                label="5. Core Flow"
                placeholder="Simple step-by-step of how it works."
              />
              <ProjectTextArea
                field="prd_mid_features"
                label="6. Key Features (MVP)"
                placeholder="What is the bare minimum needed to work?"
                required
              />
              <ProjectTextArea
                field="prd_mid_non_features"
                label="7. Future Ideas"
                placeholder="Things to add later."
              />
              <ProjectInput
                field="prd_mid_metric"
                label={answers['research_mid_timeline'] ? "8. Refine Success Definition" : "8. Success Definition"}
                placeholder="It works? People use it? I learned React?"
                rightLabel={answers['research_mid_timeline'] ? fromResearchBadge : undefined}
              />
              <ProjectInput
                field="prd_mid_design"
                label="9. Design Preferences"
                placeholder="Simple, colorful, dark mode?"
              />
              <ProjectTextArea
                field="prd_mid_constraints"
                label="10. Constraints"
                placeholder="Time, skills, money."
              />
            </>
          )}

          {/* Context Indicator */}
          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${researchOutput ? 'bg-blue-900/20 border-blue-800 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            {researchOutput ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {researchOutput ? "Research Context Attached" : "No Research Context found (skipping Part 1)"}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-500 hover:to-primary-500 border-0"
            tooltip="Generate a comprehensive PRD based on your inputs."
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} /> {generationPhase || 'Generating PRD...'}</>
            ) : (
              <><Sparkles size={18} /> Generate PRD with {providerDisplayName}</>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <ArtifactSection
            section="prd"
            loaderLabel="Drafting Product Requirements..."
            placeholder={
              <div className="max-w-xs">
                <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                <p>Fill in the details and click "Generate PRD" to let {providerDisplayName} structure your project requirements.</p>
              </div>
            }
          />
        </div>
      </div>

      <StepNavigation
        prev={{ label: 'Research', path: '/research' }}
        next={{ label: 'Tech Design', path: '/tech', disabled: !state.prdOutput }}
        onPrefetchNext={() => import('./Part3Tech')}
      />
    </div>
  );
});

export default Part2PRD;