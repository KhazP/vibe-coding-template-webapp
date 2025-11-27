
import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Button, PersonaError, StepNavigation } from '../components/UI';
import { ProjectInput, ProjectTextArea, ProjectSelect } from '../components/FormFields';
import { ArtifactSection } from '../components/ArtifactSection';
import { generateTechDesignPrompt } from '../utils/templates';
import { Sparkles, CheckCircle, AlertCircle, Loader2, Link } from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { Persona } from '../types';
import { useToast } from '../components/Toast';

const Part3Tech: React.FC = React.memo(() => {
  const { state, setAnswer, performGeminiTech, setValidationErrors, generationPhase } = useProject();
  const { answers, prdOutput, persona, isGenerating } = state;
  const { addToast } = useToast();

  // Sync/Map answers from Research to Tech to avoid duplicates
  useEffect(() => {
    // VibeCoder Mappings
    if (persona === Persona.VibeCoder) {
      // Platform Mapping
      if (!answers['tech_vibe_platform'] && answers['research_vibe_platform']) {
        const rp = answers['research_vibe_platform'];
        let tp = '';
        if (rp.includes('Web')) tp = 'Web (browser)';
        else if (rp.includes('Mobile')) tp = 'Mobile app';
        else if (rp.includes('Desktop')) tp = 'Desktop app';
        else if (rp.includes('Cross')) tp = 'Cross-Platform';
        else if (rp.includes('Watch') || rp.includes('TV')) tp = 'Watch/TV';
        
        if (tp) setAnswer('tech_vibe_platform', tp);
      }

      // Budget Mapping
      if (!answers['tech_vibe_budget'] && answers['research_vibe_budget']) {
         const rb = answers['research_vibe_budget'];
         let tb = '';
         if (rb.includes('Free')) tb = 'Free only';
         else if (rb.includes('50')) tb = 'Up to $50/month';
         else if (rb.includes('200') || rb.includes('500')) tb = 'Up to $200/month';
         else if (rb.includes('Flexible')) tb = 'Flexible';
         
         if (tb) setAnswer('tech_vibe_budget', tb);
      }

      // Timeline Mapping
      if (!answers['tech_vibe_timeline'] && answers['research_vibe_timeline']) {
         const rt = answers['research_vibe_timeline'];
         let tt = '';
         if (rt.includes('ASAP')) tt = 'ASAP (1-2 weeks)';
         else if (rt.includes('1–2 months')) tt = 'About 1 month';
         else if (rt.includes('Flexible')) tt = 'No rush';

         if (tt) setAnswer('tech_vibe_timeline', tt);
      }
    }

    // Developer Mappings
    if (persona === Persona.Developer) {
        // 1. Research Stack -> Tech Stack
        if (!answers['tech_dev_stack'] && answers['research_dev_stack_specifics']) {
            setAnswer('tech_dev_stack', answers['research_dev_stack_specifics']);
        }
        // 2. PRD Compliance -> Security
        if (!answers['tech_dev_security'] && answers['prd_dev_compliance']) {
            setAnswer('tech_dev_security', answers['prd_dev_compliance']);
        }
    }

    // In-Between Mappings
    if (persona === Persona.InBetween) {
       if (!answers['tech_mid_platform'] && answers['research_mid_platform']) {
           setAnswer('tech_mid_platform', answers['research_mid_platform']);
       }
       if (!answers['tech_mid_comfort'] && answers['research_mid_comfort']) {
           setAnswer('tech_mid_comfort', answers['research_mid_comfort']);
       }
       if (!answers['tech_mid_budget'] && answers['research_mid_budget']) {
           setAnswer('tech_mid_budget', answers['research_mid_budget']);
       }
       if (!answers['tech_mid_timeline'] && answers['research_mid_timeline']) {
           setAnswer('tech_mid_timeline', answers['research_mid_timeline']);
       }
    }
  }, [
    persona, 
    answers['research_vibe_platform'], 
    answers['research_vibe_budget'], 
    answers['research_vibe_timeline'],
    answers['research_dev_stack_specifics'],
    answers['prd_dev_compliance'],
    answers['research_mid_platform'],
    answers['research_mid_comfort'],
    answers['research_mid_budget'],
    answers['research_mid_timeline']
  ]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (persona === Persona.VibeCoder) {
        if (!answers['tech_vibe_platform']) newErrors['tech_vibe_platform'] = "Platform selection is required.";
        if (!answers['tech_vibe_priority']) newErrors['tech_vibe_priority'] = "Main priority is required.";
    } 
    else if (persona === Persona.Developer) {
        if (!answers['tech_dev_platform']) newErrors['tech_dev_platform'] = "Platform strategy is required.";
        if (!answers['tech_dev_stack']) newErrors['tech_dev_stack'] = "Tech stack is required.";
    }
    else if (persona === Persona.InBetween) {
        if (!answers['tech_mid_platform']) newErrors['tech_mid_platform'] = "Platform is required.";
        if (!answers['tech_mid_approach']) newErrors['tech_mid_approach'] = "Build approach is required.";
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (validate() && persona) {
      const prompt = generateTechDesignPrompt(persona, answers, prdOutput);
      await performGeminiTech(prompt);
    } else {
        addToast('Please fix validation errors before generating Tech Design.', 'error');
    }
  };

  const contextBadge = <span className="text-[10px] text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1"><Link size={8}/> From Research/PRD</span>;

  if (!persona) return <PersonaError />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part III: Tech Design</h2>
        <p className="text-slate-400">Define HOW you will build it. Tailored complexity based on your profile.</p>
      </div>

      <ModelStatus />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">

          {persona === Persona.VibeCoder && (
             <>
                <ProjectSelect
                  field="tech_vibe_platform"
                  label="1. Where will people use your app?"
                  tooltip="Deployment target."
                  required
                  options={[
                    { value: "Web (browser)", label: "🌐 Web (Browser / SPA)" },
                    { value: "Mobile app", label: "📱 Mobile App (iOS/Android)" },
                    { value: "Desktop app", label: "💻 Desktop App (Mac/Win)" },
                    { value: "Cross-Platform", label: "✨ Cross-Platform (React Native/Flutter)" },
                    { value: "Watch/TV", label: "⌚ WatchOS / TV App" },
                    { value: "Not sure", label: "Not sure – need advice" }
                  ]}
                />

                <ProjectSelect
                  field="tech_vibe_coding"
                  label="2. What’s your approach to coding?"
                  tooltip="Your preferred development methodology."
                  options={[
                    { value: "No-code only", label: "🚫 No-code only (visual builders)" },
                    { value: "AI writes all code", label: "🤖 AI writes all code (you guide & test)" },
                    { value: "Learning basics", label: "📚 Learning basics (simple code + AI)" },
                    { value: "Understand everything", label: "💡 I want to understand everything" }
                  ]}
                />

                <ProjectSelect
                  field="tech_vibe_budget"
                  label="3. What’s your budget for dev tools?"
                  tooltip="Operational cost limits."
                  options={[
                    { value: "Free only", label: "🆓 Free only ($0)" },
                    { value: "Up to $50/month", label: "💵 Hobbyist (Up to $50/month)" },
                    { value: "Up to $200/month", label: "💰 Pro/Startup (Up to $200/month)" },
                    { value: "Enterprise", label: "🏢 Enterprise (Unlimited)" },
                    { value: "Flexible", label: "🎯 Flexible if worth it" }
                  ]}
                />

                <ProjectSelect
                  field="tech_vibe_timeline"
                  label="4. How quickly do you need to launch?"
                  tooltip="Development speed expectations."
                  options={[
                    { value: "ASAP (1-2 weeks)", label: "⚡ ASAP (1–2 weeks)" },
                    { value: "About 1 month", label: "📅 About 1 month" },
                    { value: "2-3 months", label: "📆 2–3 months" },
                    { value: "No rush", label: "🎓 No rush – learning" }
                  ]}
                />

                <ProjectTextArea 
                  field="tech_vibe_worry"
                  label="5. What worries you most about building this app?" 
                  placeholder="Select fears: Getting stuck, Costs, Security, Wrong tech, Breaking things..." 
                  tooltip="Identifying risks helps Gemini provide better advice." 
                />
                <ProjectTextArea 
                  field="tech_vibe_tools"
                  label="6. Have you tried any tools or platforms so far?" 
                  placeholder="List AI tools, no-code builders, frameworks experimented with." 
                  tooltip="Your current experience context." 
                />
                
                <ProjectSelect
                  field="tech_vibe_priority"
                  label="7. Main Priority"
                  tooltip="Choose one primary optimization goal."
                  required
                  options={[
                    { value: "Simple to build", label: "Speed to Market (Simple to build)" },
                    { value: "Works perfectly", label: "Reliability (Works perfectly/Zero bugs)" },
                    { value: "Looks amazing", label: "UI/UX (Looks amazing)" },
                    { value: "Scales easily", label: "Scalability (Handles growth)" },
                    { value: "High Performance", label: "Performance (Fast load times)" },
                    { value: "Offline First", label: "Offline Capability" },
                    { value: "Secure", label: "Security & Privacy" }
                  ]}
                />
             </>
          )}

          {persona === Persona.Developer && (
            <>
                <ProjectTextArea 
                  field="tech_dev_platform"
                  label="1. Platform Strategy" 
                  placeholder="Web, mobile, desktop? Why?" 
                  tooltip="Deployment architecture." 
                  required
                />
                
                <ProjectTextArea 
                  field="tech_dev_stack"
                  label={answers['research_dev_stack_specifics'] ? "2. Refine Preferred Tech Stack" : "2. Preferred Tech Stack"} 
                  placeholder="Frontend, Backend, DB, Infra, AI." 
                  tooltip="Preferred libraries and frameworks (Pre-filled from Research)." 
                  maxLength={1000}
                  required
                  rightLabel={answers['research_dev_stack_specifics'] ? contextBadge : undefined}
                />
                
                <ProjectInput 
                  field="tech_dev_architecture"
                  label="3. Architecture Pattern" 
                  placeholder="Monolith, Microservices, Serverless?" 
                  tooltip="High-level system design." 
                />
                <ProjectTextArea 
                  field="tech_dev_state"
                  label="4. State & Data Strategy" 
                  placeholder="Client vs Server state? (Redux, Zustand, React Query, Server Actions)" 
                  tooltip="Data management approach." 
                />
                <ProjectTextArea 
                  field="tech_dev_components"
                  label="5. Key Components" 
                  placeholder="Auth, Storage, Payments, Notifications, Analytics." 
                  tooltip="Major system blocks." 
                />
                <ProjectTextArea 
                  field="tech_dev_ai"
                  label="6. AI Assistance Strategy" 
                  placeholder="Claude, Gemini, Cursor, Copilot? Integration strategy." 
                  tooltip="How AI will support development." 
                />
                <ProjectTextArea 
                  field="tech_dev_workflow"
                  label="7. Dev Workflow" 
                  placeholder="Git strategy, CI/CD, Testing approach." 
                  tooltip="Process and automation." 
                />
                <ProjectTextArea 
                  field="tech_dev_perf"
                  label="8. Performance & Scale" 
                  placeholder="Load, Regions, Caching, Real-time needs." 
                  tooltip="Scalability requirements." 
                />
                
                <ProjectTextArea 
                  field="tech_dev_security"
                  label={answers['prd_dev_compliance'] ? "9. Refine Security & Compliance" : "9. Security & Compliance"} 
                  placeholder="Data sensitivity, GDPR, Auth, API security." 
                  tooltip="Security posture (Pre-filled from PRD)." 
                  rightLabel={answers['prd_dev_compliance'] ? contextBadge : undefined}
                />
            </>
          )}

          {persona === Persona.InBetween && (
             <>
                <ProjectSelect
                  field="tech_mid_platform"
                  label="1. Which platform should it run on?"
                  tooltip="Deployment target."
                  required
                  options={[
                    { value: "Web App", label: "🌐 Web App (Browser)" },
                    { value: "Mobile App", label: "📱 Mobile App (iOS/Android)" },
                    { value: "Desktop App", label: "💻 Desktop App" },
                    { value: "Cross-Platform", label: "✨ Cross-Platform" },
                    { value: "Both", label: "Both (Web + Mobile)" },
                    { value: "Not sure", label: "Not sure – need guidance" }
                  ]}
                />

                <ProjectTextArea 
                  field="tech_mid_comfort"
                  label={answers['research_mid_comfort'] ? "2. Refine Technical Comfort Zone" : "2. Technical Comfort Zone"} 
                  placeholder="Languages known, frameworks tried, comfortable areas." 
                  tooltip="Your current skill set (Pre-filled from Research)." 
                  rightLabel={answers['research_mid_comfort'] ? contextBadge : undefined}
                />

                <ProjectSelect
                  field="tech_mid_approach"
                  label="3. How do you want to build your MVP?"
                  tooltip="Implementation strategy."
                  required
                  options={[
                    { value: "No-code platform", label: "📋 No-code (Bubble/Webflow)" },
                    { value: "Low-code with AI", label: "🤖 Low-code (FlutterFlow/Lovable)" },
                    { value: "Code Export", label: "📤 Code Export Builders (Bolt/Lovable)" },
                    { value: "Learn-by-building", label: "🎓 Learn-by-building (AI + Manual)" },
                    { value: "Concierge MVP", label: "🛎️ Concierge MVP (Manual backend)" },
                    { value: "Wizard of Oz", label: "🧙‍♂️ Wizard of Oz (Fake it til you make it)" },
                    { value: "Outsource", label: "Outsource/Hire" }
                  ]}
                />

                <ProjectTextArea 
                  field="tech_mid_complexity"
                  label="4. Complexity Check" 
                  placeholder="Select complexity: Simple CRUD, Real-time, File uploads, 3rd Party APIs, Complex logic." 
                  tooltip="Technical challenges anticipated." 
                />
                
                <ProjectSelect
                  field="tech_mid_budget"
                  label="5. Monthly Budget"
                  tooltip="Operational costs."
                  options={[
                    { value: "Free tools only", label: "Free tools only ($0)" },
                    { value: "Under $50/month", label: "Hobby ($10-50/mo)" },
                    { value: "Under $200/month", label: "Startup ($50-200/mo)" },
                    { value: "Flexible if needed", label: "Flexible" }
                  ]}
                />

                <ProjectSelect
                  field="tech_mid_ai"
                  label="6. How do you prefer AI to assist?"
                  tooltip="AI interaction style."
                  options={[
                    { value: "AI does everything", label: "💻 AI does everything, I test" },
                    { value: "AI explains code", label: "🗣️ AI explains what it's doing" },
                    { value: "AI helps when stuck", label: "🆘 AI helps only when stuck" },
                    { value: "Mixed", label: "🤝 Mixed depending on task" }
                  ]}
                />
                
                <ProjectTextArea 
                  field="tech_mid_timeline"
                  label={answers['research_mid_timeline'] ? "7. Refine Realistic Timeline" : "7. Realistic Timeline"} 
                  placeholder="Hours per week? Launch date? Beta user count?" 
                  tooltip="Time availability (Pre-filled from Research)." 
                  rightLabel={answers['research_mid_timeline'] ? contextBadge : undefined}
                />
             </>
          )}

          {/* Context Indicator */}
          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${prdOutput ? 'bg-purple-900/20 border-purple-800 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
             {prdOutput ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
             {prdOutput ? "PRD Context Attached" : "No PRD Context found (skipping Part 2)"}
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-500 hover:to-primary-500 border-0"
            tooltip="Generate a robust technical design document."
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} /> {generationPhase || 'Designing...'}</>
            ) : (
              <><Sparkles size={18} /> Generate Tech Design with Gemini</>
            )}
          </Button>
        </div>

        <div className="space-y-4">
           <ArtifactSection 
             section="tech"
             loaderLabel="Architecting Solution & Database Schema..."
             placeholder={
               <div className="max-w-xs">
                 <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                 <p>Fill in the details and click "Generate Tech Design" to let Gemini architect your solution.</p>
               </div>
             }
           />
        </div>
      </div>
      
      <StepNavigation 
         prev={{ label: 'PRD', path: '/prd' }}
         next={{ label: 'Agent Config', path: '/agent', disabled: !state.techOutput }}
         onPrefetchNext={() => import('./Part4Agent')}
      />
    </div>
  );
});

export default Part3Tech;
