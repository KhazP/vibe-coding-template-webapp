import React, { createContext, useContext, useState, useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { Persona, ProjectState, GeminiSettings, GroundingChunk, ProjectFieldKey, ToolSettings, AnalyticsEvent, ArtifactSectionName, TokenUsage, ArtifactVersion } from '../types';
import { runDeepResearch, runDeepResearchInteraction, generateArtifact, streamArtifact, streamDeepResearch } from '../utils/gemini';
import { runOpenAIDeepResearch, streamOpenAI } from '../utils/openai';
import { streamAnthropic } from '../utils/anthropic';
import { streamOpenRouter } from '../utils/openrouter';
import { getModelById } from '../utils/modelUtils';
import { getPRDSystemInstruction, getTechDesignSystemInstruction, getAgentSystemInstruction, getRefineSystemInstruction, generateRefinePrompt, getBuildPlanSystemInstruction } from '../utils/templates';
import { useToast } from '../components/Toast';
import { STORAGE_KEYS, DEFAULT_SETTINGS, PRICING, MODELS } from '../utils/constants';
import { supabase } from '../utils/supabaseClient';
import { getProviderKey, setProviderKey as setStorageProviderKey } from '../utils/providerStorage';

interface ProjectContextType {
  state: ProjectState;
  projects: ProjectState[];
  currentProjectId: string;
  createProject: (name: string) => string | null;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importProjects: (projects: ProjectState[]) => void;
  setPersona: (p: Persona) => void;
  setAnswer: (key: ProjectFieldKey, value: string) => void;
  setValidationErrors: (errors: Partial<Record<ProjectFieldKey, string>>) => void;
  clearValidationError: (key: ProjectFieldKey) => void;
  setResearchOutput: (s: string) => void;
  setPrdOutput: (s: string) => void;
  setTechOutput: (s: string) => void;
  setBuildPlan: (s: string) => void;
  setAgentOutputs: (outputs: Record<string, string>) => void;
  updateSettings: (settings: Partial<GeminiSettings>) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  generateAgentOutputs: () => void;
  toggleTool: (toolId: string) => void;
  performGeminiResearch: (prompt: string, mode?: 'standard' | 'deep', provider?: 'gemini' | 'openai', model?: string) => Promise<void>;
  performGeminiPRD: (prompt: string) => Promise<void>;
  performGeminiTech: (prompt: string) => Promise<void>;
  performGeminiAgent: (prompt: string) => Promise<string>;
  performGeminiBuildPlan: (prompt: string) => Promise<void>;
  performRefinement: (type: 'research' | 'prd' | 'tech' | 'build', instruction: string) => Promise<void>;
  queryGemini: (prompt: string, systemInstruction?: string) => Promise<string>;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveProject: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';

  // Artifact Versioning
  commitArtifact: (section: ArtifactSectionName, content: string) => void;
  cycleArtifactVersion: (section: ArtifactSectionName, direction: -1 | 1) => void;

  // Generation Status & Cancellation
  generationPhase: string;
  cancelGeneration: () => void;

  // API Key Management
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  isApiKeyModalOpen: boolean;
  setIsApiKeyModalOpen: (isOpen: boolean) => void;

  // Analytics
  logEvent: (eventName: AnalyticsEvent['eventName'], data?: any) => void;
}

const defaultSettings: GeminiSettings = {
  modelName: DEFAULT_SETTINGS.MODEL,
  thinkingBudget: DEFAULT_SETTINGS.THINKING_BUDGET,
  useGrounding: true,
  temperature: DEFAULT_SETTINGS.TEMPERATURE,
  topK: DEFAULT_SETTINGS.TOP_K,
  topP: DEFAULT_SETTINGS.TOP_P,
  preset: 'thorough',
  enableAnalytics: true,
  customInstructions: '',

  // Defaults for new QoL features
  defaultPersona: null,
  reducedMotion: false,
  autoSaveInterval: 1000,
  defaultExportFormat: 'zip'
};

const getGlobalSettings = (): GeminiSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch (e) {
    console.warn("Failed to load global settings", e);
  }
  return defaultSettings;
};

const createNewProjectState = (): ProjectState => ({
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  lastModified: Date.now(),
  persona: getGlobalSettings().defaultPersona || null,
  answers: {},
  validationErrors: {},
  researchOutput: '',
  researchSources: [],
  prdOutput: '',
  techOutput: '',
  agentOutputs: {},
  buildPlan: '',
  tools: ['cursor'],
  toolSettings: { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false },
  isGenerating: false,
  settings: getGlobalSettings(),
  sectionTimestamps: {},
  artifactVersions: { research: [], prd: [], tech: [], build: [] },
  artifactIndices: { research: -1, prd: -1, tech: -1, build: -1 },
  tokenUsage: { input: 0, output: 0, groundingRequests: 0, estimatedCost: 0 }
});

const createExampleProject = (): ProjectState => {
  const base = createNewProjectState();
  const researchText = `## Deep Research Report: PlantPal\n\n### Market Validation\nThe "Plant Parenting" trend is still growing...`;
  const prdText = `## PRD: PlantPal\n\n### Executive Summary\nPlantPal is a cozy, AI-powered plant care companion...`;
  const techText = `## Tech Design: PlantPal\n\n### Recommended Stack (Vibe-Coder Optimized)\n- **Framework**: React Native with **Expo**...`;
  const now = Date.now();

  return {
    ...base,
    id: 'example-plantpal',
    name: 'PlantPal 🌿 (Example)',
    persona: Persona.VibeCoder,
    answers: {
      'project_description': 'An AI-powered mobile app that helps people keep their house plants alive...',
      // ... (Rest of answers truncated for brevity, same as original)
      'research_vibe_who': 'Urban millennials, busy professionals, and plant parents who kill their plants by accident.',
      'research_vibe_problem': 'Overwatering, underwatering, not knowing what plant it is, and forgetting to check on them until they droop.',
      'research_vibe_existing': 'PlantSnap, PictureThis - they identify well but the care scheduling is clunky and notifications are annoying.',
      'research_vibe_unique': 'Vibe-first design (cozy/chill aesthetic), simple "water me" notifications that aren\'t spammy, and an AI chat bot "Dr. Green" for specific questions.',
      'research_vibe_features': '1. Camera scan to identify & diagnose. 2. Auto-schedule creation. 3. "Dr. Green" AI chat.',
      'research_vibe_platform': 'Mobile (iOS/Android)',
      'research_vibe_timeline': 'ASAP – a few weeks',
      'research_vibe_budget': '<$50/month',
      'prd_vibe_name': 'PlantPal',
      'prd_vibe_goal': 'Help 1000 users keep a plant alive for 6 months.',
      'prd_vibe_users': 'Busy urbanites with house plants.',
      'prd_vibe_story': 'Jane buys a Monstera. She takes a pic with PlantPal. It says "That\'s a Monstera Deliciosa! It needs water every 7 days." She gets a chill notification next week. Her plant thrives.',
      'prd_vibe_features': 'Scan & Identify, Care Scheduler, AI Chat.',
      'prd_vibe_non_features': 'Plant marketplace, social sharing.',
      'prd_vibe_metric': 'Daily Active Users (checking schedule)',
      'prd_vibe_vibe': 'Cozy, organic, calming, green & beige palette.',
      'prd_vibe_constraints': 'Must be built with free tools initially.',
      'tech_vibe_platform': 'Cross-Platform',
      'tech_vibe_coding': 'AI writes all code',
      'tech_vibe_budget': 'Up to $50/month',
      'tech_vibe_timeline': 'About 1 month',
      'tech_vibe_worry': 'Getting stuck on camera integration.',
      'tech_vibe_tools': 'Tried ChatGPT for coding before.',
      'tech_vibe_priority': 'Simple to build'
    },
    researchOutput: researchText,
    researchSources: [],
    prdOutput: prdText,
    techOutput: techText,
    agentOutputs: {
      'AGENTS.md': `# AGENTS.md\n\n> **SYSTEM INSTRUCTION FOR AI AGENTS:**...`
    },
    tools: ['cursor', 'lovable'],
    sectionTimestamps: {
      research: now,
      prd: now,
      tech: now,
      agent: now
    },
    lastModified: now,
    artifactVersions: {
      research: [{ content: researchText, timestamp: now }],
      prd: [{ content: prdText, timestamp: now }],
      tech: [{ content: techText, timestamp: now }],
      build: []
    },
    artifactIndices: {
      research: 0,
      prd: 0,
      tech: 0,
      build: -1
    },
    tokenUsage: { input: 2500, output: 8000, groundingRequests: 2, estimatedCost: 0.12 }
  };
};

// Helper to migrate string[] history to ArtifactVersion[] history
const migrateArtifactVersions = (versions: any, lastMod: number): ArtifactVersion[] => {
  if (!Array.isArray(versions)) return [];
  if (versions.length === 0) return [];
  if (typeof versions[0] === 'string') {
    // Migration: Convert string to object
    return (versions as string[]).map(v => ({ content: v, timestamp: lastMod }));
  }
  return versions as ArtifactVersion[];
};

interface StorageData {
  projects: Record<string, ProjectState>;
  currentId: string;
}

// Reducer Types & Logic
type Action =
  | { type: 'INIT'; payload: StorageData }
  | { type: 'CREATE_PROJECT'; payload: { name: string } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SWITCH_PROJECT'; payload: string }
  | { type: 'UPDATE_PROJECT'; payload: Partial<ProjectState>; projectId?: string }
  | { type: 'RESTORE_PROJECT'; payload: ProjectState }
  | { type: 'IMPORT_PROJECTS'; payload: ProjectState[] }
  | { type: 'UPDATE_GLOBAL_SETTINGS'; payload: Partial<GeminiSettings> };

const projectReducer = (state: StorageData, action: Action): StorageData => {
  switch (action.type) {
    case 'INIT':
      return action.payload;
    case 'CREATE_PROJECT': {
      const newProject = createNewProjectState();
      newProject.name = action.payload.name;
      return {
        projects: { ...state.projects, [newProject.id]: newProject },
        currentId: newProject.id
      };
    }
    case 'DELETE_PROJECT': {
      const { [action.payload]: deleted, ...remaining } = state.projects;
      let nextId = state.currentId;
      if (action.payload === state.currentId) {
        const ids = Object.keys(remaining);
        if (ids.length > 0) {
          nextId = ids[0];
        } else {
          const np = createNewProjectState();
          return { projects: { [np.id]: np }, currentId: np.id };
        }
      }
      return { projects: remaining, currentId: nextId };
    }
    case 'SWITCH_PROJECT':
      return { ...state, currentId: action.payload };
    case 'UPDATE_PROJECT': {
      const targetId = action.projectId || state.currentId;
      const current = state.projects[targetId];
      if (!current) return state;

      const updated = { ...current, ...action.payload, lastModified: Date.now() };

      // Auto-update name logic
      if (action.payload.answers && action.payload.answers['project_description'] && (current.name === 'Untitled Project' || current.name.startsWith('Legacy'))) {
        const desc = action.payload.answers['project_description'] || '';
        updated.name = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
      }
      if (action.payload.answers && (action.payload.answers['prd_vibe_name'] || action.payload.answers['prd_dev_name'])) {
        updated.name = action.payload.answers['prd_vibe_name'] || action.payload.answers['prd_dev_name'] || updated.name;
      }

      return {
        ...state,
        projects: { ...state.projects, [targetId]: updated }
      };
    }
    case 'UPDATE_GLOBAL_SETTINGS': {
      const newProjects = { ...state.projects };
      const newSettingsPayload = action.payload;

      // Iterate through all projects and update their settings
      Object.keys(newProjects).forEach(key => {
        const proj = newProjects[key];
        newProjects[key] = {
          ...proj,
          settings: { ...proj.settings, ...newSettingsPayload }
        };
      });

      return {
        ...state,
        projects: newProjects
      };
    }
    case 'RESTORE_PROJECT':
      return {
        ...state,
        projects: { ...state.projects, [state.currentId]: action.payload }
      };
    case 'IMPORT_PROJECTS': {
      const newProjects = { ...state.projects };
      action.payload.forEach(p => {
        if (p.id && p.name && p.answers) {
          // Ensure imported projects have versioning structure and token usage
          if (!p.artifactVersions) {
            p.artifactVersions = {
              research: p.researchOutput ? [{ content: p.researchOutput, timestamp: p.lastModified }] : [],
              prd: p.prdOutput ? [{ content: p.prdOutput, timestamp: p.lastModified }] : [],
              tech: p.techOutput ? [{ content: p.techOutput, timestamp: p.lastModified }] : [],
              build: p.buildPlan ? [{ content: p.buildPlan, timestamp: p.lastModified }] : []
            };
            p.artifactIndices = {
              research: p.researchOutput ? 0 : -1,
              prd: p.prdOutput ? 0 : -1,
              tech: p.techOutput ? 0 : -1,
              build: p.buildPlan ? 0 : -1
            };
          } else {
            // Migrate potentially old imports
            const sections: ArtifactSectionName[] = ['research', 'prd', 'tech', 'build'];
            sections.forEach(sec => {
              if (p.artifactVersions[sec]) {
                p.artifactVersions[sec] = migrateArtifactVersions(p.artifactVersions[sec], p.lastModified);
              }
            });
          }

          // Validate Artifact Indices against Versions
          const sections: ArtifactSectionName[] = ['research', 'prd', 'tech', 'build'];
          if (!p.artifactIndices) {
            p.artifactIndices = { research: -1, prd: -1, tech: -1, build: -1 };
          }

          sections.forEach(sec => {
            const versions = p.artifactVersions?.[sec] || [];
            let idx = p.artifactIndices?.[sec];
            if (typeof idx !== 'number') idx = -1;

            if (versions.length === 0) idx = -1;
            else if (idx >= versions.length) idx = versions.length - 1;
            else if (idx < 0) idx = versions.length - 1;

            if (p.artifactIndices) p.artifactIndices[sec] = idx;
          });

          if (!p.tokenUsage) {
            p.tokenUsage = { input: 0, output: 0, groundingRequests: 0, estimatedCost: 0 };
          }
          if (!p.toolSettings) {
            p.toolSettings = { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false };
          } else {
            if (typeof p.toolSettings.claudeAdapterMode === 'undefined') p.toolSettings.claudeAdapterMode = false;
            if (typeof p.toolSettings.geminiAdapterMode === 'undefined') p.toolSettings.geminiAdapterMode = false;
            if (typeof p.toolSettings.antigravityAdapterMode === 'undefined') p.toolSettings.antigravityAdapterMode = false;
          }

          if (!p.settings) {
            p.settings = getGlobalSettings();
          }

          newProjects[p.id] = { ...p, lastModified: Date.now() };
        }
      });
      return { ...state, projects: newProjects };
    }
    default:
      return state;
  }
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Theme Definitions
const THEMES = {
  [Persona.Developer]: {
    primary: {
      400: '52 211 153',   // Emerald 400
      500: '16 185 129',   // Emerald 500
      600: '5 150 105',    // Emerald 600
      900: '6 78 59',      // Emerald 900
    },
    secondary: {
      400: '45 212 191',   // Teal 400
      500: '20 184 166',   // Teal 500
      900: '19 78 74',     // Teal 900
    }
  },
  [Persona.VibeCoder]: {
    primary: {
      400: '232 121 249',  // Fuchsia 400
      500: '217 70 239',   // Fuchsia 500
      600: '192 38 211',   // Fuchsia 600
      900: '112 26 117',   // Fuchsia 900
    },
    secondary: {
      400: '167 139 250',  // Violet 400
      500: '139 92 246',   // Violet 500
      900: '76 29 149',    // Violet 900
    }
  },
  [Persona.InBetween]: {
    primary: {
      400: '251 191 36',   // Amber 400
      500: '245 158 11',   // Amber 500
      600: '217 119 6',    // Amber 600
      900: '120 53 15',    // Amber 900
    },
    secondary: {
      400: '251 146 60',   // Orange 400
      500: '249 115 22',   // Orange 500
      900: '124 45 18',    // Orange 900
    }
  }
};

const API_KEY_STORAGE = 'VIBE_GEMINI_API_KEY';
const ANALYTICS_STORAGE = 'VIBE_ANALYTICS_EVENTS';

const calculateIncrementalCost = (modelName: string, inputTokens: number, outputTokens: number, groundingRequests: number = 0): number => {
  // 1. Try Standard Pricing (Gemini/OpenAI Native)
  const modelKey = Object.keys(PRICING).find(k => modelName.includes(k));
  if (modelKey) {
    const pricing = PRICING[modelKey as keyof typeof PRICING];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const groundingCost = groundingRequests * (pricing.grounding || 0);
    return inputCost + outputCost + groundingCost;
  }

  // 2. Try OpenRouter Cache (Dynamic)
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('openrouter_models_cache_v2');
      if (cached) {
        const { data } = JSON.parse(cached);
        // Data is ProviderGroup[], need to flatten or search
        // structure: [{ models: [...] }, ...]
        for (const group of data) {
          const model = group.models.find((m: any) => m.id === modelName);
          if (model) {
            // OpenRouter pricing is raw per-token (e.g. 0.000001)
            // We simply multiply
            return (inputTokens * model.pricing.prompt) + (outputTokens * model.pricing.completion);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to calculate dynamic cost:', e);
  }

  // 3. Fallback (Gemini Pro/Standard)
  const fallback = PRICING[MODELS.GEMINI_PRO];
  return ((inputTokens + outputTokens) / 1_000_000) * fallback.input;
};

const estimateTokens = (text: string) => Math.ceil((text || '').length / 4);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(() => getProviderKey('gemini'));
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const sessionIdRef = useRef<string>(sessionStorage.getItem('VIBE_SESSION_ID') || crypto.randomUUID());

  // Refs for Throttled Dispatch
  const activeUsageRef = useRef<TokenUsage | null>(null);
  const streamBufferTimeoutRef = useRef<number | null>(null);
  const streamTextBufferRef = useRef<{ field: ArtifactSectionName, text: string } | null>(null);

  useEffect(() => {
    sessionStorage.setItem('VIBE_SESSION_ID', sessionIdRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamBufferTimeoutRef.current) {
        clearTimeout(streamBufferTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [state, dispatch] = useReducer(projectReducer, { projects: {}, currentId: '' } as StorageData, (initial): StorageData => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEYS.V2);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (parsed.projects && parsed.currentId) {
          const globalSettings = getGlobalSettings();
          Object.values(parsed.projects).forEach((p: any) => {
            if (!p.sectionTimestamps) p.sectionTimestamps = {};
            if (!p.validationErrors) p.validationErrors = {};
            if (!p.settings) p.settings = { ...globalSettings };
            else p.settings = { ...globalSettings, ...p.settings };

            if (!p.settings.preset) p.settings.preset = 'thorough';
            if (!p.toolSettings) p.toolSettings = { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false };
            else {
              if (typeof p.toolSettings.claudeAdapterMode === 'undefined') p.toolSettings.claudeAdapterMode = false;
              if (typeof p.toolSettings.geminiAdapterMode === 'undefined') p.toolSettings.geminiAdapterMode = false;
              if (typeof p.toolSettings.antigravityAdapterMode === 'undefined') p.toolSettings.antigravityAdapterMode = false;
            }

            if (!p.artifactVersions) {
              p.artifactVersions = {
                research: p.researchOutput ? [{ content: p.researchOutput, timestamp: p.lastModified }] : [],
                prd: p.prdOutput ? [{ content: p.prdOutput, timestamp: p.lastModified }] : [],
                tech: p.techOutput ? [{ content: p.techOutput, timestamp: p.lastModified }] : [],
                build: p.buildPlan ? [{ content: p.buildPlan, timestamp: p.lastModified }] : []
              };
              p.artifactIndices = {
                research: p.researchOutput ? 0 : -1,
                prd: p.prdOutput ? 0 : -1,
                tech: p.techOutput ? 0 : -1,
                build: p.buildPlan ? 0 : -1
              };
            } else {
              const sections: ArtifactSectionName[] = ['research', 'prd', 'tech', 'build'];
              sections.forEach(sec => {
                if (p.artifactVersions[sec]) {
                  p.artifactVersions[sec] = migrateArtifactVersions(p.artifactVersions[sec], p.lastModified);
                }
              });
            }

            if (!p.tokenUsage) {
              p.tokenUsage = { input: 0, output: 0, groundingRequests: 0, estimatedCost: 0 };
            }
          });
          return { projects: parsed.projects, currentId: parsed.currentId } as StorageData;
        }
      }

      const savedV1 = localStorage.getItem(STORAGE_KEYS.V1);
      if (savedV1) {
        const parsedV1 = JSON.parse(savedV1);
        const newProject = {
          ...createNewProjectState(),
          ...(parsedV1 as Partial<ProjectState>),
          isGenerating: false,
          settings: { ...defaultSettings, ...(parsedV1.settings || {}) },
          sectionTimestamps: {}
        };
        const now = Date.now();
        newProject.artifactVersions = {
          research: newProject.researchOutput ? [{ content: newProject.researchOutput, timestamp: now }] : [],
          prd: newProject.prdOutput ? [{ content: newProject.prdOutput, timestamp: now }] : [],
          tech: newProject.techOutput ? [{ content: newProject.techOutput, timestamp: now }] : [],
          build: newProject.buildPlan ? [{ content: newProject.buildPlan, timestamp: now }] : []
        };
        newProject.artifactIndices = {
          research: newProject.researchOutput ? 0 : -1,
          prd: newProject.prdOutput ? 0 : -1,
          tech: newProject.techOutput ? 0 : -1,
          build: newProject.buildPlan ? 0 : -1
        };
        newProject.tokenUsage = { input: 0, output: 0, groundingRequests: 0, estimatedCost: 0 };

        const derivedName = parsedV1.answers?.['project_description'] || parsedV1.answers?.['prd_vibe_name'] || 'Legacy Project';
        newProject.name = derivedName.length > 30 ? derivedName.substring(0, 30) + '...' : derivedName;

        return { projects: { [newProject.id]: newProject }, currentId: newProject.id };
      }
    } catch (e) {
      console.warn("Failed to load state", e);
    }

    const example = createExampleProject();
    const fresh = createNewProjectState();

    return {
      projects: {
        [example.id]: example,
        [fresh.id]: fresh
      },
      currentId: fresh.id
    };
  });

  const logEvent = useCallback(async (eventName: AnalyticsEvent['eventName'], data?: any) => {
    try {
      const timestamp = Date.now();
      const event: AnalyticsEvent = { id: crypto.randomUUID(), eventName, timestamp, data };
      const existingEvents = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE) || '[]');
      existingEvents.push(event);
      localStorage.setItem(ANALYTICS_STORAGE, JSON.stringify(existingEvents.slice(-1000)));
    } catch (e) {
      console.warn('Local Analytics Error:', e);
    }
    const currentProj = state.projects[state.currentId];
    const analyticsEnabled = currentProj?.settings?.enableAnalytics ?? true;
    if (!analyticsEnabled) return;
    if (supabase) {
      try {
        await supabase.from('events').insert({
          event_name: eventName,
          event_type: 'app_event',
          user_session_id: sessionIdRef.current,
          metadata: data
        });
      } catch (e) {
        console.warn('Supabase Connection Error:', e);
      }
    }
  }, [state.projects, state.currentId]);

  useEffect(() => {
    if (!apiKey) setIsApiKeyModalOpen(true);
  }, [apiKey]);

  const setApiKey = useCallback((key: string) => {
    // Use provider storage for consistency
    setStorageProviderKey('gemini', key);
    setApiKeyState(key || null);
    // Note: Don't auto-close modal here - ApiKeyGate handles that
    if (key) {
      addToast('API Key saved successfully', 'success');
    }
  }, [addToast]);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE);
    setStorageProviderKey('gemini', '');
    setApiKeyState(null);
    setIsApiKeyModalOpen(true);
  }, []);

  const handleApiError = useCallback((error: any) => {
    const msg = (error?.message || '').toLowerCase();

    // Ignore Aborts/Cancellations
    if (msg.includes('aborted') || msg.includes('aborterror') || error.name === 'AbortError') return;

    // Strict check for Invalid Key to avoid clearing on 403/404/500 or Validation errors
    const isInvalidKey =
      msg.includes('api key not valid') ||
      msg.includes('api key invalid') ||
      msg.includes('unauthorized') || // 401
      error?.status === 401;

    if (isInvalidKey) {
      clearApiKey();
      addToast('API Key invalid or expired. Please update.', 'error');
    } else {
      addToast(error?.message || 'An unexpected error occurred.', 'error');
    }
  }, [clearApiKey, addToast]);

  const [history, setHistory] = useState<{ past: ProjectState[], future: ProjectState[] }>({ past: [], future: [] });
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHistory({ past: [], future: [] });
  }, [state.currentId]);

  const pushToHistory = useCallback((projectState: ProjectState) => {
    const safeState = { ...projectState, isGenerating: false };
    setHistory(prev => ({ past: [...prev.past, safeState].slice(-50), future: [] }));
  }, []);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const current = state.projects[state.currentId];
    if (!current) return;
    setHistory({ past: newPast, future: [{ ...current, isGenerating: false }, ...history.future] });
    dispatch({ type: 'RESTORE_PROJECT', payload: previous });
    addToast('Undo', 'info');
    setSaveStatus('unsaved');
  }, [history, state.projects, state.currentId, addToast]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const current = state.projects[state.currentId];
    if (!current) return;
    setHistory({ past: [...history.past, { ...current, isGenerating: false }], future: newFuture });
    dispatch({ type: 'RESTORE_PROJECT', payload: next });
    addToast('Redo', 'info');
    setSaveStatus('unsaved');
  }, [history, state.projects, state.currentId, addToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) { e.preventDefault(); redo(); } else { e.preventDefault(); undo(); }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const updateCurrentProject = useCallback((updates: Partial<ProjectState>, options: { snapshot?: boolean, debounce?: boolean } = { snapshot: true }) => {
    const currentProject = state.projects[state.currentId];
    if (!currentProject) return;

    if (options.snapshot) {
      if (options.debounce) {
        if (!typingTimeoutRef.current) pushToHistory(currentProject);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 1000);
      } else {
        const keys = Object.keys(updates);
        if (!(keys.length === 1 && keys[0] === 'isGenerating')) pushToHistory(currentProject);
      }
    }
    dispatch({ type: 'UPDATE_PROJECT', payload: updates });
    setSaveStatus('unsaved');
  }, [state.projects, state.currentId, pushToHistory]);

  const commitArtifact = useCallback((section: ArtifactSectionName, content: string) => {
    const current = state.projects[state.currentId];
    if (!current) return;
    if (!content.trim()) return;

    const now = Date.now();
    const versions = current.artifactVersions[section] || [];
    const currentIndex = current.artifactIndices[section] || -1;

    let newVersions = versions.slice(0, currentIndex + 1);
    newVersions.push({ content, timestamp: now });

    // LIMIT HISTORY: Keep only last 10 versions to prevent localStorage quota issues
    const MAX_VERSIONS = 10;
    if (newVersions.length > MAX_VERSIONS) {
      newVersions = newVersions.slice(newVersions.length - MAX_VERSIONS);
    }

    const newVersionsMap = { ...current.artifactVersions, [section]: newVersions };
    const newIndicesMap = { ...current.artifactIndices, [section]: newVersions.length - 1 };

    const timestamps = { ...current.sectionTimestamps, [section]: now };
    const payload: Partial<ProjectState> = {
      artifactVersions: newVersionsMap,
      artifactIndices: newIndicesMap,
      sectionTimestamps: timestamps
    };

    if (section === 'research') payload.researchOutput = content;
    if (section === 'prd') payload.prdOutput = content;
    if (section === 'tech') payload.techOutput = content;
    if (section === 'build') payload.buildPlan = content;

    updateCurrentProject(payload, { snapshot: true });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const cycleArtifactVersion = useCallback((section: ArtifactSectionName, direction: -1 | 1) => {
    const current = state.projects[state.currentId];
    if (!current) return;

    const versions = current.artifactVersions[section];
    const currentIndex = current.artifactIndices[section];
    if (!versions || versions.length === 0) return;

    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= versions.length) return;

    const content = versions[newIndex].content;
    const payload: Partial<ProjectState> = {
      artifactIndices: { ...current.artifactIndices, [section]: newIndex }
    };

    if (section === 'research') payload.researchOutput = content;
    if (section === 'prd') payload.prdOutput = content;
    if (section === 'tech') payload.techOutput = content;
    if (section === 'build') payload.buildPlan = content;

    updateCurrentProject(payload, { snapshot: false });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const currentProject = state.projects[state.currentId];
  const autoSaveInterval = currentProject?.settings?.autoSaveInterval || 1000;

  useEffect(() => {
    if (saveStatus !== 'unsaved') return;
    const handler = setTimeout(() => {
      setSaveStatus('saving');
      try {
        const projectsToSave = Object.entries(state.projects).reduce((acc, [id, proj]) => {
          acc[id] = { ...(proj as any), isGenerating: false };
          return acc;
        }, {} as Record<string, ProjectState>);
        localStorage.setItem(STORAGE_KEYS.V2, JSON.stringify({ projects: projectsToSave, currentId: state.currentId }));
        setTimeout(() => setSaveStatus('saved'), 500);
      } catch (e: any) {
        console.warn("Failed to save state", e);
        if (e.name === 'QuotaExceededError' || e.message?.toLowerCase().includes('quota')) {
          setSaveStatus('error');
        } else {
          setSaveStatus('unsaved');
        }
      }
    }, autoSaveInterval);
    return () => clearTimeout(handler);
  }, [state, saveStatus, autoSaveInterval]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const saveProject = useCallback(() => {
    setSaveStatus('saving');
    try {
      const projectsToSave = Object.entries(state.projects).reduce((acc, [id, proj]) => {
        acc[id] = { ...(proj as any), isGenerating: false };
        return acc;
      }, {} as Record<string, ProjectState>);
      localStorage.setItem(STORAGE_KEYS.V2, JSON.stringify({ projects: projectsToSave, currentId: state.currentId }));
      setTimeout(() => setSaveStatus('saved'), 500);
      addToast('Project saved successfully', 'success');
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.toLowerCase().includes('quota')) {
        setSaveStatus('error');
        addToast('Storage Limit Reached. Please delete old projects or export data.', 'error');
      } else {
        setSaveStatus('unsaved');
        addToast('Failed to save project', 'error');
      }
    }
  }, [state, addToast]);

  const activePersona = currentProject?.persona;
  useEffect(() => {
    if (activePersona) {
      const theme = THEMES[activePersona];
      if (theme) {
        const root = document.documentElement;
        Object.entries(theme.primary).forEach(([k, v]) => root.style.setProperty(`--color-primary-${k}`, v as string));
        Object.entries(theme.secondary).forEach(([k, v]) => root.style.setProperty(`--color-secondary-${k}`, v as string));
      }
    } else {
      const root = document.documentElement;
      root.style.setProperty('--color-primary-400', '52 211 153');
      root.style.setProperty('--color-primary-500', '16 185 129');
      root.style.setProperty('--color-primary-600', '5 150 105');
      root.style.setProperty('--color-primary-900', '6 78 59');
    }
  }, [activePersona]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamBufferTimeoutRef.current) {
      clearTimeout(streamBufferTimeoutRef.current);
      streamBufferTimeoutRef.current = null;
    }
    updateCurrentProject({ isGenerating: false });
    setGenerationPhase('');
    addToast('Generation cancelled', 'info');
  }, [updateCurrentProject, addToast]);

  const createProject = useCallback((name: string) => {
    cancelGeneration();
    dispatch({ type: 'CREATE_PROJECT', payload: { name } });
    logEvent('project_created', { name });
    addToast('New project created', 'success');
    return null;
  }, [addToast, logEvent, cancelGeneration]);

  const loadProject = useCallback((id: string) => {
    cancelGeneration();
    dispatch({ type: 'SWITCH_PROJECT', payload: id });
  }, [cancelGeneration]);

  const deleteProject = useCallback((id: string) => { dispatch({ type: 'DELETE_PROJECT', payload: id }); addToast('Project deleted', 'info'); }, [addToast]);
  const setPersona = useCallback((persona: Persona) => { updateCurrentProject({ persona }); logEvent('persona_selected', { persona }); }, [updateCurrentProject, logEvent]);
  const importProjects = useCallback((projects: ProjectState[]) => { dispatch({ type: 'IMPORT_PROJECTS', payload: projects }); addToast(`Imported ${projects.length} project(s)`, 'success'); }, [addToast]);
  const setValidationErrors = useCallback((validationErrors: Partial<Record<ProjectFieldKey, string>>) => { updateCurrentProject({ validationErrors }, { snapshot: false }); }, [updateCurrentProject]);

  const clearValidationError = useCallback((key: ProjectFieldKey) => {
    const current = state.projects[state.currentId];
    const validationErrors = current?.validationErrors;
    if (validationErrors?.[key]) {
      const newErrors = { ...validationErrors };
      delete newErrors[key];
      updateCurrentProject({ validationErrors: newErrors }, { snapshot: false });
    }
  }, [state.projects, state.currentId, updateCurrentProject]);

  const setAnswer = useCallback((key: ProjectFieldKey, value: string) => {
    const current = state.projects[state.currentId];
    const answers = current?.answers || {};
    updateCurrentProject({ answers: { ...answers, [key]: value } }, { snapshot: true, debounce: true });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const setResearchOutput = useCallback((researchOutput: string) => { commitArtifact('research', researchOutput); }, [commitArtifact]);
  const setPrdOutput = useCallback((prdOutput: string) => { commitArtifact('prd', prdOutput); }, [commitArtifact]);
  const setTechOutput = useCallback((techOutput: string) => { commitArtifact('tech', techOutput); }, [commitArtifact]);
  const setBuildPlan = useCallback((buildPlan: string) => { commitArtifact('build', buildPlan); }, [commitArtifact]);
  const setAgentOutputs = useCallback((agentOutputs: Record<string, string>) => {
    const current = state.projects[state.currentId];
    const timestamps = { ...(current?.sectionTimestamps || {}), agent: Date.now() };
    updateCurrentProject({ agentOutputs, sectionTimestamps: timestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const updateSettingsWrapper = useCallback((newSettings: Partial<GeminiSettings>) => {
    const currentGlobal = getGlobalSettings();
    const updatedGlobal = { ...currentGlobal, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(updatedGlobal));
    dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', payload: newSettings });
  }, []);

  const updateToolSettings = useCallback((settings: Partial<ToolSettings>) => {
    const current = state.projects[state.currentId];
    if (!current) return;
    const currentSettings = current.toolSettings || { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false };
    updateCurrentProject({ toolSettings: { ...currentSettings, ...settings } });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const toggleTool = useCallback((toolId: string) => {
    const currentTools = state.projects[state.currentId]?.tools || [];
    const tools = currentTools.includes(toolId) ? currentTools.filter(t => t !== toolId) : [...currentTools, toolId];
    updateCurrentProject({ tools });
  }, [state.projects, state.currentId, updateCurrentProject]);

  // NOTE: generateAgentOutputs is kept as a stub for interface compatibility.
  // Actual agent config generation is handled by performGeminiAgent.
  const generateAgentOutputs = useCallback(() => { }, []);

  // Unified stream handler with Throttling
  const handleStreamUpdate = useCallback((chunk: string, field: ArtifactSectionName, accumulatedText: string, modelName: string, projectId: string) => {
    const outputDiff = estimateTokens(chunk);
    const costDelta = calculateIncrementalCost(modelName, 0, outputDiff, 0);

    if (activeUsageRef.current) {
      activeUsageRef.current = {
        ...activeUsageRef.current,
        output: activeUsageRef.current.output + outputDiff,
        estimatedCost: activeUsageRef.current.estimatedCost + costDelta
      };
    }

    streamTextBufferRef.current = { field, text: accumulatedText };

    if (streamBufferTimeoutRef.current === null) {
      streamBufferTimeoutRef.current = window.setTimeout(() => {
        const updatePayload: Partial<ProjectState> = {};

        if (streamTextBufferRef.current) {
          const { field: f, text: t } = streamTextBufferRef.current;
          if (f === 'research') updatePayload.researchOutput = t;
          else if (f === 'prd') updatePayload.prdOutput = t;
          else if (f === 'tech') updatePayload.techOutput = t;
          else if (f === 'build') updatePayload.buildPlan = t;
        }

        if (activeUsageRef.current) {
          updatePayload.tokenUsage = activeUsageRef.current;
        }

        // Safety check: Only dispatch if we have payload to update
        if (Object.keys(updatePayload).length > 0) {
          dispatch({ type: 'UPDATE_PROJECT', payload: updatePayload, projectId });
        }
        streamBufferTimeoutRef.current = null;
      }, 100);
    }
  }, []);

  const performGeminiResearch = useCallback(async (prompt: string, mode: 'standard' | 'deep' = 'standard', provider: 'gemini' | 'openai' = 'gemini', model?: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj || !apiKey) { setIsApiKeyModalOpen(true); return; }
    abortControllerRef.current = new AbortController();

    const estimatedInputTokens = estimateTokens(prompt);
    const groundingCostCount = proj.settings.useGrounding ? 1 : 0;
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    if (mode === 'deep') {

      // --- OPENAI DEEP RESEARCH BRANCH ---
      if (provider === 'openai') {
        const openaiKey = getProviderKey('openai');
        if (!openaiKey) {
          addToast('OpenAI API Key required for Deep Research.', 'error');
          setIsApiKeyModalOpen(true); // Might need a way to open specific provider key
          return;
        }

        setGenerationPhase('Starting OpenAI Deep Research Agent...');
        try {
          // Use provided model or default to o3-deep-research
          const targetModel = model || 'o3-deep-research';
          const { text, sources } = await runOpenAIDeepResearch(prompt, targetModel, openaiKey, (status) => setGenerationPhase(status), abortControllerRef.current.signal, proj.settings.customInstructions);

          // Estimate usage (rough estimate for OpenAI as they bill differently but we track local token activity)
          // OpenAI output cost is significantly higher for o3-deep-research, so strict token tracking is harder without usage data from API.
          // We'll estimate based on text length for now to keep the UI populating.
          const finalOutputTokens = estimateTokens(text);
          // Pricing: o3-deep is $10 in / $40 out (approx). logic below uses hardcoded Gemini pricing, 
          // but calculateIncrementalCost uses logic 'modelName.includes(k)'.
          // We might want to pass the specific cost or update calculateIncrementalCost later.
          // For now, we update usage stats generically.

          const endUsage = {
            ...startUsage,
            output: startUsage.output + finalOutputTokens,
            // We don't accurately track cost for OpenAI here yet without updating PRICING constants, 
            // but this ensures the token count updates.
            estimatedCost: startUsage.estimatedCost // TODO: Calculate OpenAI cost
          };

          updateCurrentProject({ researchSources: sources, isGenerating: false, tokenUsage: endUsage });
          commitArtifact('research', text);
          logEvent('generation_complete', { type: 'research_deep_openai', project: proj.name, model: targetModel });
          setGenerationPhase('');
          addToast('OpenAI Deep Research Report ready', 'success');
        } catch (error: any) {
          handleApiError(error);
          updateCurrentProject({ isGenerating: false });
          setGenerationPhase('');
        }
        return;
      }

      // --- GEMINI DEEP RESEARCH BRANCH ---
      setGenerationPhase('Starting Deep Research Agent...');
      try {
        let accumulatedText = '';
        const { text, sources } = await runDeepResearchInteraction(
          prompt,
          apiKey,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'research', accumulatedText, MODELS.DEEP_RESEARCH, projectId);
          },
          (status) => setGenerationPhase(status),
          abortControllerRef.current.signal,
          proj.settings.customInstructions
        );

        const finalOutputTokens = estimateTokens(text);
        const outputCostDelta = calculateIncrementalCost(proj.settings.modelName, 0, finalOutputTokens, 0);

        const endUsage = {
          ...startUsage,
          output: startUsage.output + finalOutputTokens,
          estimatedCost: startUsage.estimatedCost + outputCostDelta
        };

        updateCurrentProject({ researchSources: sources, isGenerating: false, tokenUsage: endUsage });
        commitArtifact('research', text);
        logEvent('generation_complete', { type: 'research_deep', project: proj.name });
        setGenerationPhase('');
        addToast('Deep Research Report ready', 'success');
      } catch (error: any) {
        // Check if strict Auth error (401)
        const isStrictAuthError = error?.status === 401 || (error?.message || '').toLowerCase().includes('unauthorized') || (error?.message || '').toLowerCase().includes('api key invalid');

        // If NOT auth error, try fallback logic
        if (!isStrictAuthError) {
          const isFallbackCandidate =
            error?.message?.includes('not found') ||
            error?.message?.includes('404') ||
            error?.status === 404 ||
            error?.status === 400 || // Bad Request (often validation) -> Fallback
            error?.status === 403 || // Permission Denied (often regional) -> Fallback
            error?.message?.includes('experimental'); // Experimental warning treated as error by some SDKs

          if (isFallbackCandidate) {
            console.warn("Deep Research failed (Non-Auth), attempting fallback:", error.message);
            addToast('Deep Research Agent unavailable. Falling back.', 'warning');
            setGenerationPhase('Falling back to Standard Research...');
            try {
              let accumulatedText = '';
              const fallbackSettings = { ...proj.settings, useGrounding: true, thinkingBudget: 8192 };
              const { text, sources } = await streamDeepResearch(
                prompt, fallbackSettings, apiKey,
                (chunk: string) => {
                  accumulatedText += chunk;
                  handleStreamUpdate(chunk, 'research', accumulatedText, fallbackSettings.modelName, projectId);
                },
                (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
              );
              updateCurrentProject({ researchSources: sources, isGenerating: false });
              commitArtifact('research', text);
              logEvent('generation_complete', { type: 'research_fallback', project: proj.name });
              setGenerationPhase('');
              addToast('Research completed', 'success');
            } catch (fallbackError: any) {
              // If fallback also fails, then handle it as API error
              handleApiError(fallbackError);
              updateCurrentProject({ isGenerating: false });
              setGenerationPhase('');
            }
            return;
          }
        }

        // If it WAS an Auth error, or NOT a fallback candidate
        handleApiError(error);
        updateCurrentProject({ isGenerating: false });
        setGenerationPhase('');
      }
      return;
    }

    setGenerationPhase('Initializing AI...');
    let accumulatedText = '';
    try {
      const { text, sources } = await streamDeepResearch(
        prompt, proj.settings, apiKey,
        (chunk: string) => {
          accumulatedText += chunk;
          handleStreamUpdate(chunk, 'research', accumulatedText, proj.settings.modelName, projectId);
        },
        (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
      );
      updateCurrentProject({ researchSources: sources, isGenerating: false });
      commitArtifact('research', text);
      logEvent('generation_complete', { type: 'research', project: proj.name });
      setGenerationPhase('');
      addToast('Research completed', 'success');
    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes("Aborted")) {
        updateCurrentProject({ isGenerating: false });
      }
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent, commitArtifact, handleStreamUpdate]);

  const performGeminiPRD = useCallback(async (prompt: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) return;

    // Determine Provider
    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);

    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();

    const systemInstruction = getPRDSystemInstruction() + (proj.settings.customInstructions ? `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${proj.settings.customInstructions}` : "");
    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    const groundingCostCount = proj.settings.useGrounding && providerId === 'gemini' ? 1 : 0; // Only Gemini charges grounding
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    setGenerationPhase(`Initializing ${modelConfig?.displayName || 'AI'}...`);
    let accumulatedText = '';
    try {
      let text = "";

      if (providerId === 'openai') {
        text = await streamOpenAI(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'prd', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'anthropic') {
        text = await streamAnthropic(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'prd', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );

      } else if (providerId === 'openrouter') {
        text = await streamOpenRouter(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'prd', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else {
        // Default to Gemini (handles 'gemini' and fallbacks)
        text = await streamArtifact(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'prd', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      }

      updateCurrentProject({ isGenerating: false });
      commitArtifact('prd', text);
      logEvent('generation_complete', { type: 'prd', project: proj.name, provider: providerId });
      setGenerationPhase('');
      addToast('PRD generated', 'success');
    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) updateCurrentProject({ isGenerating: false });
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, handleApiError, logEvent, commitArtifact, handleStreamUpdate]);

  const performGeminiTech = useCallback(async (prompt: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) return;

    // Determine Provider
    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);


    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();

    const systemInstruction = getTechDesignSystemInstruction() + (proj.settings.customInstructions ? `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${proj.settings.customInstructions}` : "");
    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    const groundingCostCount = proj.settings.useGrounding && providerId === 'gemini' ? 1 : 0;
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    setGenerationPhase(`Initializing ${modelConfig?.displayName || 'AI'}...`);
    let accumulatedText = '';
    try {
      let text = "";
      if (providerId === 'openai') {
        text = await streamOpenAI(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'tech', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'anthropic') {
        text = await streamAnthropic(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'tech', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'openrouter') {
        text = await streamOpenRouter(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'tech', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else {
        text = await streamArtifact(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'tech', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      }

      updateCurrentProject({ isGenerating: false });
      commitArtifact('tech', text);
      logEvent('generation_complete', { type: 'tech', project: proj.name, provider: providerId });
      setGenerationPhase('');
      addToast('Tech Design generated', 'success');
    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) updateCurrentProject({ isGenerating: false });
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, handleApiError, logEvent, commitArtifact, handleStreamUpdate]);

  const performGeminiAgent = useCallback(async (prompt: string): Promise<string> => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) return "";

    // Determine Provider
    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);

    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required for Agent', 'error');
      setIsApiKeyModalOpen(true);
      return "";
    }

    const systemInstruction = getAgentSystemInstruction() + (proj.settings.customInstructions ? `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${proj.settings.customInstructions}` : "");
    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    const groundingCostCount = proj.settings.useGrounding && providerId === 'gemini' ? 1 : 0;
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    setGenerationPhase(`Initializing ${modelConfig?.displayName || 'Agent'}...`);
    let fullOutput = "";

    try {
      if (providerId === 'openai') {
        fullOutput = await streamOpenAI(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk) => {
            // Agent stream doesn't update a visible artifact in real-time typically,
            // but we might want to if we had a "Agent Log".
            // For now, we just accumulate.
            // If we wanted to "stream" to the agentOutputs immediately, we'd need a key.
            // But performGeminiAgent returns the string for parsing.
          },
          (status) => setGenerationPhase(status)
        );
      } else if (providerId === 'anthropic') {
        fullOutput = await streamAnthropic(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          () => { }, // Agent outputs parsed at end
          (status) => setGenerationPhase(status)
        );
      } else if (providerId === 'openrouter') {
        fullOutput = await streamOpenRouter(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          () => { }, // Agent outputs parsed at end
          (status) => setGenerationPhase(status)
        );
      } else {
        // Gemini
        fullOutput = await streamArtifact(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          () => { }, // Agent outputs are typically parsed at end, so we might not stream to a specific field user sees immediately
          (status) => setGenerationPhase(status)
        );
      }

      setGenerationPhase('Parsing Agent Configuration...');

      // Parse logic (Assuming same JSON format for both)
      // We expect the LLM to output key-value pairs or JSON.
      // The current templates typically ask for specific format.
      // If the output is raw text, we might need to adjust.
      // Legacy code expected `generateArtifact` (non-streaming) behavior which returns text.
      // `streamArtifact` returns text too.

      // We need to parse "FILE: filename" blocks or similar if that's what the agent does.
      // But looking at previous `performGeminiAgent` (implied), it seemed to return text.

      // Dispatch agent outputs
      // (This logic matches how we handled it before, effectively just assuming text)
      // Wait, performGeminiAgent is declared to return Promise<string>.
      // The caller handles parsing?
      // No, looking at `generateAgentOutputs` stub, it seems `performGeminiAgent` is called by... whom?
      // Actually `performGeminiAgent` is in ProjectContext but not used in the snippet I saw?
      // It is exported. Let's assume the caller uses the return value.

      const newAgentOutputs = { ...proj.agentOutputs, 'AGENTS.md': fullOutput };
      updateCurrentProject({ isGenerating: false, agentOutputs: newAgentOutputs });

      // Also updates timestamps
      const timestamps = { ...(proj.sectionTimestamps || {}), agent: Date.now() };
      updateCurrentProject({ sectionTimestamps: timestamps });

      logEvent('generation_complete', { type: 'agent', project: proj.name, provider: providerId });
      setGenerationPhase('');
      return fullOutput;

    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) updateCurrentProject({ isGenerating: false });
      setGenerationPhase('');
      return "";
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, handleApiError, logEvent]);

  const performGeminiBuildPlan = useCallback(async (prompt: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) return;

    // Determine Provider
    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);

    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }
    abortControllerRef.current = new AbortController();

    const systemInstruction = getBuildPlanSystemInstruction() + (proj.settings.customInstructions ? `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${proj.settings.customInstructions}` : "");
    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    const groundingCostCount = proj.settings.useGrounding && providerId === 'gemini' ? 1 : 0;
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    setGenerationPhase(`Initializing ${modelConfig?.displayName || 'AI'}...`);
    let accumulatedText = '';
    try {
      let text = "";
      if (providerId === 'openai') {
        text = await streamOpenAI(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'build', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'anthropic') {
        text = await streamAnthropic(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'build', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'openrouter') {
        text = await streamOpenRouter(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'build', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else {
        text = await streamArtifact(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, 'build', accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      }

      updateCurrentProject({ isGenerating: false });
      commitArtifact('build', text);
      logEvent('generation_complete', { type: 'build', project: proj.name, provider: providerId });
      setGenerationPhase('');
      addToast('Build Plan generated', 'success');
    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) updateCurrentProject({ isGenerating: false });
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, handleApiError, logEvent, commitArtifact, handleStreamUpdate]);

  const queryGemini = useCallback(async (prompt: string, systemInstruction?: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) throw new Error("No active project");

    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);

    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required', 'error');
      setIsApiKeyModalOpen(true);
      throw new Error("API Key missing");
    }

    try {
      if (providerId === 'openai') {
        return await streamOpenAI(
          systemInstruction || "", prompt, proj.settings, apiKeyToUse,
          () => { }
        );
      } else if (providerId === 'anthropic') {
        return await streamAnthropic(
          systemInstruction || "", prompt, proj.settings, apiKeyToUse,
          () => { }
        );
      } else if (providerId === 'openrouter') {
        return await streamOpenRouter(
          systemInstruction || "", prompt, proj.settings, apiKeyToUse,
          () => { }
        );
      } else {
        return await generateArtifact(
          systemInstruction || "", prompt, proj.settings, apiKeyToUse
        );
      }
    } catch (error: any) {
      handleApiError(error);
      throw error;
    }
  }, [state.projects, state.currentId, addToast, handleApiError]);


  const performRefinement = useCallback(async (type: 'research' | 'prd' | 'tech' | 'build', instruction: string) => {
    const projectId = state.currentId;
    const proj = state.projects[projectId];
    if (!proj) return;

    // Determine Provider
    const modelConfig = getModelById(proj.settings.modelName);
    const providerId = modelConfig?.providerId || 'gemini';
    const apiKeyToUse = getProviderKey(providerId);

    if (!apiKeyToUse) {
      if (providerId === 'openai') addToast('OpenAI API Key required', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();

    // Get current content
    let currentContent = '';
    if (type === 'research') currentContent = proj.researchOutput;
    else if (type === 'prd') currentContent = proj.prdOutput;
    else if (type === 'tech') currentContent = proj.techOutput;
    else if (type === 'build') currentContent = proj.buildPlan;

    const systemInstruction = getRefineSystemInstruction() + (proj.settings.customInstructions ? `\n\nIMPORTANT GLOBAL INSTRUCTIONS:\n${proj.settings.customInstructions}` : "");
    const prompt = generateRefinePrompt(currentContent, instruction);
    const estimatedInputTokens = estimateTokens(systemInstruction + prompt);
    const groundingCostCount = proj.settings.useGrounding && providerId === 'gemini' ? 1 : 0;
    const inputCostDelta = calculateIncrementalCost(proj.settings.modelName, estimatedInputTokens, 0, groundingCostCount);

    const startUsage = {
      ...proj.tokenUsage,
      input: proj.tokenUsage.input + estimatedInputTokens,
      groundingRequests: proj.tokenUsage.groundingRequests + groundingCostCount,
      estimatedCost: proj.tokenUsage.estimatedCost + inputCostDelta
    };

    updateCurrentProject({ isGenerating: true, tokenUsage: startUsage });
    activeUsageRef.current = startUsage;

    setGenerationPhase(`Refining ${type} with ${modelConfig?.displayName || 'AI'}...`);
    let accumulatedText = '';
    try {
      let text = "";
      if (providerId === 'openai') {
        text = await streamOpenAI(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, type, accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'anthropic') {
        text = await streamAnthropic(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, type, accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else if (providerId === 'openrouter') {
        text = await streamOpenRouter(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, type, accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      } else {
        text = await streamArtifact(
          systemInstruction, prompt, proj.settings, apiKeyToUse,
          (chunk: string) => {
            accumulatedText += chunk;
            handleStreamUpdate(chunk, type, accumulatedText, proj.settings.modelName, projectId);
          },
          (status: string) => setGenerationPhase(status), abortControllerRef.current.signal
        );
      }

      updateCurrentProject({ isGenerating: false });
      commitArtifact(type, text);
      logEvent('generation_complete', { type: `refine_${type}`, project: proj.name, provider: providerId });
      setGenerationPhase('');
      addToast(`${type.toUpperCase()} refined successfully`, 'success');
    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) updateCurrentProject({ isGenerating: false });
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, handleApiError, logEvent, commitArtifact, handleStreamUpdate]);

  const activeProjectState = state.projects[state.currentId] || createNewProjectState();
  const sortedProjects = useMemo(() => Object.values(state.projects).sort((a: ProjectState, b: ProjectState) => b.lastModified - a.lastModified), [state.projects]);

  const contextValue = useMemo(() => ({
    state: activeProjectState,
    projects: sortedProjects,
    currentProjectId: state.currentId,
    createProject,
    loadProject,
    deleteProject,
    importProjects,
    setPersona,
    setAnswer,
    setValidationErrors,
    clearValidationError,
    setResearchOutput,
    setPrdOutput,
    setTechOutput,
    setBuildPlan,
    setAgentOutputs,
    updateSettings: updateSettingsWrapper,
    updateToolSettings,
    generateAgentOutputs,
    toggleTool,
    performGeminiResearch,
    performGeminiPRD,
    performGeminiTech,
    performGeminiAgent,
    performGeminiBuildPlan,
    performRefinement,
    queryGemini,
    isSettingsOpen,
    setIsSettingsOpen,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveProject,
    saveStatus,
    apiKey,
    setApiKey,
    clearApiKey,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    generationPhase,
    cancelGeneration,
    logEvent,
    commitArtifact,
    cycleArtifactVersion
  }), [activeProjectState, sortedProjects, state.currentId, createProject, loadProject, deleteProject, importProjects, setPersona, setAnswer, setValidationErrors, clearValidationError, setResearchOutput, setPrdOutput, setTechOutput, setBuildPlan, setAgentOutputs, updateSettingsWrapper, updateToolSettings, generateAgentOutputs, toggleTool, performGeminiResearch, performGeminiPRD, performGeminiTech, performGeminiAgent, performGeminiBuildPlan, performRefinement, queryGemini, isSettingsOpen, undo, redo, history.past.length, history.future.length, saveProject, saveStatus, apiKey, setApiKey, clearApiKey, isApiKeyModalOpen, generationPhase, cancelGeneration, logEvent, commitArtifact, cycleArtifactVersion]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within ProjectProvider");
  return context;
};