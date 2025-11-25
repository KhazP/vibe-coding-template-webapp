

export enum Persona {
  VibeCoder = 'A',
  Developer = 'B',
  InBetween = 'C'
}

export type ProjectFieldKey = 
  | 'project_description'
  // Research - Vibe
  | 'research_vibe_who' | 'research_vibe_problem' | 'research_vibe_existing' | 'research_vibe_unique' | 'research_vibe_features' | 'research_vibe_platform' | 'research_vibe_timeline' | 'research_vibe_budget'
  // Research - Dev
  | 'research_dev_questions' | 'research_dev_stack_specifics' | 'research_dev_decisions' | 'research_dev_timing' | 'research_dev_scope' | 'research_dev_depth' | 'research_dev_sources' | 'research_dev_constraints' | 'research_dev_context'
  // Research - Mid
  | 'research_mid_problem' | 'research_mid_learn' | 'research_mid_existing' | 'research_mid_validation' | 'research_mid_platform' | 'research_mid_comfort' | 'research_mid_timeline' | 'research_mid_budget'
  // PRD - Vibe
  | 'prd_vibe_name' | 'prd_vibe_goal' | 'prd_vibe_users' | 'prd_vibe_story' | 'prd_vibe_features' | 'prd_vibe_non_features' | 'prd_vibe_metric' | 'prd_vibe_vibe' | 'prd_vibe_constraints'
  // PRD - Dev
  | 'prd_dev_name' | 'prd_dev_oneliner' | 'prd_dev_goal' | 'prd_dev_audience' | 'prd_dev_stories' | 'prd_dev_features' | 'prd_dev_metrics' | 'prd_dev_tech' | 'prd_dev_compliance' | 'prd_dev_risks' | 'prd_dev_biz'
  // PRD - Mid
  | 'prd_mid_name' | 'prd_mid_purpose' | 'prd_mid_goal' | 'prd_mid_users' | 'prd_mid_flow' | 'prd_mid_features' | 'prd_mid_non_features' | 'prd_mid_metric' | 'prd_mid_design' | 'prd_mid_constraints'
  // Tech - Vibe
  | 'tech_vibe_platform' | 'tech_vibe_coding' | 'tech_vibe_budget' | 'tech_vibe_timeline' | 'tech_vibe_worry' | 'tech_vibe_tools' | 'tech_vibe_priority'
  // Tech - Dev
  | 'tech_dev_platform' | 'tech_dev_stack' | 'tech_dev_architecture' | 'tech_dev_state' | 'tech_dev_components' | 'tech_dev_ai' | 'tech_dev_workflow' | 'tech_dev_perf' | 'tech_dev_security'
  // Tech - Mid
  | 'tech_mid_platform' | 'tech_mid_comfort' | 'tech_mid_approach' | 'tech_mid_complexity' | 'tech_mid_budget' | 'tech_mid_ai' | 'tech_mid_timeline';

export interface Question {
  id: string;
  text: string;
  placeholder?: string;
  options?: string[];
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GeminiSettings {
  modelName: string;
  thinkingBudget: number;
  useGrounding: boolean;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface ProjectState {
  id: string;
  name: string;
  lastModified: number;
  persona: Persona | null;
  answers: Partial<Record<ProjectFieldKey, string>>;
  validationErrors: Partial<Record<ProjectFieldKey, string>>;
  researchOutput: string;
  researchSources: GroundingChunk[];
  prdOutput: string;
  techOutput: string;
  agentOutputs: Record<string, string>;
  buildPlan: string;
  tools: string[];
  isGenerating: boolean;
  settings: GeminiSettings;
  sectionTimestamps: Record<string, number>;
}

export type StepId = 'home' | 'research' | 'prd' | 'tech' | 'agent' | 'build' | 'settings';

export interface ToolDefinition {
  id: string;
  name: string;
  file: string;
  category: 'Native Support' | 'Adapter Required' | 'Generator';
  description: string;
  supportLevel: 'native' | 'adapter' | 'manual';
  techTooltip: string;
}
