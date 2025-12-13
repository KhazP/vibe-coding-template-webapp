
import React, { createContext, useContext, useState, useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { Persona, ProjectState, GeminiSettings, GroundingChunk, ProjectFieldKey, ToolSettings, AnalyticsEvent } from '../types';
import { runDeepResearch, runDeepResearchInteraction, generateArtifact, streamArtifact, streamDeepResearch } from '../utils/gemini';
import { getPRDSystemInstruction, getTechDesignSystemInstruction, getAgentSystemInstruction, getRefineSystemInstruction, generateRefinePrompt, getBuildPlanSystemInstruction } from '../utils/templates';
import { useToast } from '../components/Toast';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';
import { supabase } from '../utils/supabaseClient';

interface ProjectContextType {
  state: ProjectState;
  projects: ProjectState[];
  currentProjectId: string;
  createProject: (name: string) => string | null;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
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
  performGeminiResearch: (prompt: string, mode?: 'standard' | 'deep') => Promise<void>;
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
  saveStatus: 'saved' | 'saving' | 'unsaved';
  
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
  persona: getGlobalSettings().defaultPersona || null, // Auto-apply default persona if set
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
  sectionTimestamps: {}
});

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
  | { type: 'UPDATE_PROJECT'; payload: Partial<ProjectState> }
  | { type: 'RESTORE_PROJECT'; payload: ProjectState };

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
      const current = state.projects[state.currentId];
      if (!current) return state;

      const updated = { ...current, ...action.payload, lastModified: Date.now() };

      // Auto-update name if description changes and name is default
      if (action.payload.answers && action.payload.answers['project_description'] && (current.name === 'Untitled Project' || current.name.startsWith('Legacy'))) {
        const desc = action.payload.answers['project_description'] || '';
        updated.name = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
      }
      // Also check specific name fields
      if (action.payload.answers && (action.payload.answers['prd_vibe_name'] || action.payload.answers['prd_dev_name'])) {
        updated.name = action.payload.answers['prd_vibe_name'] || action.payload.answers['prd_dev_name'] || updated.name;
      }

      return {
        ...state,
        projects: { ...state.projects, [state.currentId]: updated }
      };
    }
    case 'RESTORE_PROJECT':
      return {
        ...state,
        projects: { ...state.projects, [state.currentId]: action.payload }
      };
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

/**
 * Provider component for the ProjectContext.
 * Manages state persistence, history (undo/redo), and interaction with Gemini API.
 */
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  // Generation Status & Cancellation State
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // API Key State
  const [apiKey, setApiKeyState] = useState<string | null>(() => localStorage.getItem(API_KEY_STORAGE));
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Session ID Management
  const sessionIdRef = useRef<string>(sessionStorage.getItem('VIBE_SESSION_ID') || crypto.randomUUID());

  useEffect(() => {
    sessionStorage.setItem('VIBE_SESSION_ID', sessionIdRef.current);
  }, []);

  // Initialize Reducer first to make state available
  const [state, dispatch] = useReducer(projectReducer, { projects: {}, currentId: '' } as StorageData, (initial): StorageData => {
    try {
        // 1. Try load V2
        const savedV2 = localStorage.getItem(STORAGE_KEYS.V2);
        if (savedV2) {
          const parsed = JSON.parse(savedV2);
          if (parsed.projects && parsed.currentId) {
            // Ensure sectionTimestamps & validationErrors exists for old V2 data
            Object.values(parsed.projects).forEach((p: any) => {
              if (!p.sectionTimestamps) p.sectionTimestamps = {};
              if (!p.validationErrors) p.validationErrors = {};
              if (!p.settings) p.settings = { ...defaultSettings };
              else p.settings = { ...defaultSettings, ...p.settings }; // Merge defaults
              
              if (!p.settings.preset) p.settings.preset = 'thorough'; // Migration for existing projects
              if (!p.toolSettings) p.toolSettings = { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false }; // Migration
              // Ensure Antigravity key exists if not present
              if (p.toolSettings && !('antigravityAdapterMode' in p.toolSettings)) {
                  p.toolSettings.antigravityAdapterMode = false;
              }
            });
            return { projects: parsed.projects, currentId: parsed.currentId } as StorageData;
          }
        }
  
        // 2. Try load V1 (Migration)
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
          const derivedName = parsedV1.answers?.['project_description'] || parsedV1.answers?.['prd_vibe_name'] || 'Legacy Project';
          newProject.name = derivedName.length > 30 ? derivedName.substring(0, 30) + '...' : derivedName;
  
          return { projects: { [newProject.id]: newProject }, currentId: newProject.id };
        }
      } catch (e) {
        console.warn("Failed to load state", e);
      }
      
      // 3. Default
      const defaultProject = createNewProjectState();
      return { projects: { [defaultProject.id]: defaultProject }, currentId: defaultProject.id };
  });

  // Analytics Engine
  const logEvent = useCallback(async (eventName: AnalyticsEvent['eventName'], data?: any) => {
    // 1. Log to Local Storage (Backup / Immediate Client Access)
    try {
        const timestamp = Date.now();
        const event: AnalyticsEvent = {
            id: crypto.randomUUID(),
            eventName,
            timestamp,
            data
        };
        const existingEvents = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE) || '[]');
        existingEvents.push(event);
        // Keep last 1000 events locally
        const trimmed = existingEvents.slice(-1000);
        localStorage.setItem(ANALYTICS_STORAGE, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('Local Analytics Error:', e);
    }

    // Check Analytics Setting
    const currentProj = state.projects[state.currentId];
    // Default to true if undefined
    const analyticsEnabled = currentProj?.settings?.enableAnalytics ?? true;

    if (!analyticsEnabled) return;

    // 2. Log to Supabase (Primary Source of Truth)
    if (supabase) {
        try {
            const { error } = await supabase.from('events').insert({
              event_name: eventName,
              event_type: 'app_event',
              user_session_id: sessionIdRef.current,
              metadata: data
            });
            
            if (error) {
               console.warn('Supabase Insert Error:', error.message);
            }
        } catch (e) {
            console.warn('Supabase Connection Error:', e);
        }
    }
  }, [state.projects, state.currentId]);

  // Auto-open modal if no key on mount
  useEffect(() => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
    }
  }, [apiKey]);

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKeyState(key);
    setIsApiKeyModalOpen(false);
    addToast('API Key saved successfully', 'success');
  }, [addToast]);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKeyState(null);
    setIsApiKeyModalOpen(true);
  }, []);

  const handleApiError = useCallback((error: any) => {
    const msg = error?.message || '';
    
    // Ignore abort errors
    if (msg.includes('Aborted') || msg.includes('AbortError') || error.name === 'AbortError') {
       return;
    }

    // The "Rebound" Logic: If key is bad, wipe it and show modal
    if (msg.includes('400') || msg.includes('401') || msg.includes('403') || msg.includes('API key') || msg.includes('valid')) {
      clearApiKey();
      addToast('API Key invalid or expired. Please update.', 'error');
    } else {
      addToast(msg || 'An unexpected error occurred.', 'error');
    }
  }, [clearApiKey, addToast]);

  // --- History Management (Undo/Redo) ---
  const [history, setHistory] = useState<{ past: ProjectState[], future: ProjectState[] }>({ past: [], future: [] });
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset history when switching projects
  useEffect(() => {
    setHistory({ past: [], future: [] });
  }, [state.currentId]);

  const pushToHistory = useCallback((projectState: ProjectState) => {
    // Sanitize state before saving (e.g., ensure isGenerating is false)
    const safeState = { ...projectState, isGenerating: false };
    setHistory(prev => {
        // Limit history size to 50
        const newPast = [...prev.past, safeState].slice(-50);
        return { past: newPast, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const current = state.projects[state.currentId];
    
    if (!current) return;

    // Sanitize current before pushing to future
    const safeCurrent = { ...current, isGenerating: false };

    setHistory({
        past: newPast,
        future: [safeCurrent, ...history.future]
    });
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

    const safeCurrent = { ...current, isGenerating: false };

    setHistory({
        past: [...history.past, safeCurrent],
        future: newFuture
    });
    dispatch({ type: 'RESTORE_PROJECT', payload: next });
    addToast('Redo', 'info');
    setSaveStatus('unsaved');
  }, [history, state.projects, state.currentId, addToast]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        // Native undo handles input fields, only global override if desired (usually not)
        if (isInput) return;

        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            if (e.shiftKey) {
                e.preventDefault();
                redo();
            } else {
                e.preventDefault();
                undo();
            }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- Wrapper for State Updates with History ---
  const updateCurrentProject = useCallback((updates: Partial<ProjectState>, options: { snapshot?: boolean, debounce?: boolean } = { snapshot: true }) => {
    const currentProject = state.projects[state.currentId];
    if (!currentProject) return;

    if (options.snapshot) {
        if (options.debounce) {
             // Debounce logic for typing
             if (!typingTimeoutRef.current) {
                // Snapshot state BEFORE the burst of typing
                pushToHistory(currentProject);
             }
             if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
             typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
             }, 1000); // 1 second commit window
        } else {
             // Immediate snapshot
             // Avoid snapshotting pure 'isGenerating' toggles if that's the only change
             const keys = Object.keys(updates);
             if (!(keys.length === 1 && keys[0] === 'isGenerating')) {
                 pushToHistory(currentProject);
             }
        }
    }

    dispatch({ type: 'UPDATE_PROJECT', payload: updates });
    setSaveStatus('unsaved');
  }, [state.projects, state.currentId, pushToHistory]);


  // Persistence Effect - Configurable Auto-Save
  const currentProject = state.projects[state.currentId];
  const autoSaveInterval = currentProject?.settings?.autoSaveInterval || 1000;

  useEffect(() => {
    // Only save if dirty
    if (saveStatus !== 'unsaved') return;

    const handler = setTimeout(() => {
      setSaveStatus('saving');
      try {
        // Ensure we don't persist 'isGenerating: true'
        const projectsToSave = Object.entries(state.projects).reduce((acc, [id, proj]) => {
          acc[id] = { ...(proj as any), isGenerating: false };
          return acc;
        }, {} as Record<string, ProjectState>);

        localStorage.setItem(STORAGE_KEYS.V2, JSON.stringify({
          projects: projectsToSave,
          currentId: state.currentId
        }));
        
        // Short delay to let user see "Saving..."
        setTimeout(() => setSaveStatus('saved'), 500);
      } catch (e) {
        console.warn("Failed to save state", e);
        setSaveStatus('saved'); // Reset to avoid getting stuck
      }
    }, autoSaveInterval); 

    return () => clearTimeout(handler);
  }, [state, saveStatus, autoSaveInterval]);

  // Prevent Navigation when unsaved
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

        localStorage.setItem(STORAGE_KEYS.V2, JSON.stringify({
          projects: projectsToSave,
          currentId: state.currentId
        }));
        
        setTimeout(() => setSaveStatus('saved'), 500);
        addToast('Project saved successfully', 'success');
    } catch (e) {
        setSaveStatus('unsaved');
        addToast('Failed to save project', 'error');
    }
  }, [state, addToast]);

  // Reduced Motion Effect
  const reducedMotion = currentProject?.settings?.reducedMotion || false;
  useEffect(() => {
      if (reducedMotion) {
          document.body.classList.add('reduce-motion');
      } else {
          document.body.classList.remove('reduce-motion');
      }
  }, [reducedMotion]);

  // Theme Effect
  const activePersona = currentProject?.persona;

  useEffect(() => {
    if (activePersona) {
      const theme = THEMES[activePersona];
      if (theme) {
        const root = document.documentElement;
        root.style.setProperty('--color-primary-400', theme.primary[400]);
        root.style.setProperty('--color-primary-500', theme.primary[500]);
        root.style.setProperty('--color-primary-600', theme.primary[600]);
        root.style.setProperty('--color-primary-900', theme.primary[900]);
        root.style.setProperty('--color-secondary-400', theme.secondary[400]);
        root.style.setProperty('--color-secondary-500', theme.secondary[500]);
        root.style.setProperty('--color-secondary-900', theme.secondary[900]);
      }
    } else {
        const root = document.documentElement;
        root.style.setProperty('--color-primary-400', '52 211 153');
        root.style.setProperty('--color-primary-500', '16 185 129');
        root.style.setProperty('--color-primary-600', '5 150 105');
        root.style.setProperty('--color-primary-900', '6 78 59');
    }
  }, [activePersona]);

  // --- Project Actions ---

  const createProject = useCallback((name: string) => {
    dispatch({ type: 'CREATE_PROJECT', payload: { name } });
    logEvent('project_created', { name });
    addToast('New project created', 'success');
    return null; 
  }, [addToast, logEvent]);

  const loadProject = useCallback((id: string) => {
    dispatch({ type: 'SWITCH_PROJECT', payload: id });
  }, []);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    addToast('Project deleted', 'info');
  }, [addToast]);

  const setPersona = useCallback((persona: Persona) => {
      updateCurrentProject({ persona });
      logEvent('persona_selected', { persona });
  }, [updateCurrentProject, logEvent]);
  
  const setValidationErrors = useCallback((validationErrors: Partial<Record<ProjectFieldKey, string>>) => {
      updateCurrentProject({ validationErrors }, { snapshot: false });
  }, [updateCurrentProject]);

  const clearValidationError = useCallback((key: ProjectFieldKey) => {
      const current = state.projects[state.currentId];
      // Safely access validationErrors
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
    
    updateCurrentProject({ 
        answers: { ...answers, [key]: value }
    }, { snapshot: true, debounce: true });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const setResearchOutput = useCallback((researchOutput: string) => {
      const current = state.projects[state.currentId];
      if (!current) return;
      const currentTimestamps = current.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, research: Date.now() };
      updateCurrentProject({ researchOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setPrdOutput = useCallback((prdOutput: string) => {
      const current = state.projects[state.currentId];
      if (!current) return;
      const currentTimestamps = current.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, prd: Date.now() };
      updateCurrentProject({ prdOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setTechOutput = useCallback((techOutput: string) => {
      const current = state.projects[state.currentId];
      if (!current) return;
      const currentTimestamps = current.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, tech: Date.now() };
      updateCurrentProject({ techOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setBuildPlan = useCallback((buildPlan: string) => {
      const current = state.projects[state.currentId];
      if (!current) return;
      const currentTimestamps = current.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, build: Date.now() };
      updateCurrentProject({ buildPlan, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setAgentOutputs = useCallback((agentOutputs: Record<string, string>) => {
      const current = state.projects[state.currentId];
      if (!current) return;
      const currentTimestamps = current.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, agent: Date.now() };
      updateCurrentProject({ agentOutputs, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const updateSettingsWrapper = useCallback((newSettings: Partial<GeminiSettings>) => {
    const currentSettings = state.projects[state.currentId]?.settings || defaultSettings;
    const updated = { ...currentSettings, ...newSettings };
    updateCurrentProject({ settings: updated });
    
    // Also update global default settings in storage
    localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(updated));
  }, [state.projects, state.currentId, updateCurrentProject]);
  
  const updateToolSettings = useCallback((settings: Partial<ToolSettings>) => {
    const current = state.projects[state.currentId];
    if (!current) return;
    const currentSettings = current.toolSettings || { claudeAdapterMode: false, geminiAdapterMode: false, antigravityAdapterMode: false };
    updateCurrentProject({ toolSettings: { ...currentSettings, ...settings } });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const toggleTool = useCallback((toolId: string) => {
    const currentTools = state.projects[state.currentId]?.tools || [];
    const tools = currentTools.includes(toolId)
      ? currentTools.filter(t => t !== toolId)
      : [...currentTools, toolId];
    updateCurrentProject({ tools });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const generateAgentOutputs = useCallback(() => { /* Component handled */ }, []);

  // --- Cancellation Logic ---
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    updateCurrentProject({ isGenerating: false });
    setGenerationPhase('');
    addToast('Generation cancelled', 'info');
  }, [updateCurrentProject, addToast]);

  // --- Gemini Actions with Streaming ---

  const performGeminiResearch = useCallback(async (prompt: string, mode: 'standard' | 'deep' = 'standard') => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    // Reset abort controller
    abortControllerRef.current = new AbortController();
    
    updateCurrentProject({ isGenerating: true, researchOutput: '', researchSources: [] });
    
    // -- Deep Research (Agent Mode) --
    if (mode === 'deep') {
        setGenerationPhase('Starting Deep Research Agent...');
        try {
            const { text, sources } = await runDeepResearchInteraction(
                prompt, 
                apiKey, 
                (status) => setGenerationPhase(status),
                abortControllerRef.current.signal
            );
            
            const currentTimestamps = proj.sectionTimestamps || {};
            const sectionTimestamps = { ...currentTimestamps, research: Date.now() };
            
            updateCurrentProject({ 
                researchOutput: text, 
                researchSources: sources, 
                isGenerating: false, 
                sectionTimestamps
            });
            logEvent('generation_complete', { type: 'research_deep', project: proj.name });
            setGenerationPhase('');
            addToast('Deep Research Report ready', 'success');
        } catch (error: any) {
             // Fallback Logic: If Agent fails (404/Not Found), fallback to Gemini Pro + Grounding
             if (error?.message?.includes('not found') || error?.message?.includes('404') || error?.status === 404) {
                 console.warn("Deep Research fallback triggered:", error.message);
                 addToast('Deep Research Agent unavailable (Beta). Falling back to Gemini Pro + Search.', 'warning');
                 setGenerationPhase('Falling back to Standard Research...');
                 
                 // Fallback execution
                 try {
                    let accumulatedText = '';
                    const fallbackSettings = { ...proj.settings, useGrounding: true, thinkingBudget: 8192 }; // Enhance fallback settings
                    
                    const { text, sources } = await streamDeepResearch(
                        prompt, 
                        fallbackSettings, 
                        apiKey, 
                        (chunk) => {
                            accumulatedText += chunk;
                            dispatch({ 
                                type: 'UPDATE_PROJECT', 
                                payload: { researchOutput: accumulatedText } 
                            });
                        },
                        (status) => setGenerationPhase(status),
                        abortControllerRef.current.signal
                    );

                    const currentTimestamps = proj.sectionTimestamps || {};
                    const sectionTimestamps = { ...currentTimestamps, research: Date.now() };
                    updateCurrentProject({ 
                        researchOutput: text, 
                        researchSources: sources, 
                        isGenerating: false, 
                        sectionTimestamps
                    });
                    logEvent('generation_complete', { type: 'research_fallback', project: proj.name });
                    setGenerationPhase('');
                    addToast('Research completed (Standard Mode)', 'success');
                    return; // Exit successfully after fallback
                 } catch (fallbackError: any) {
                     handleApiError(fallbackError);
                     updateCurrentProject({ 
                        researchOutput: `[Deep Research Failed: ${error.message}]\n[Fallback Failed: ${fallbackError.message}]`, 
                        isGenerating: false 
                     });
                     setGenerationPhase('');
                     return;
                 }
             }

             // Standard Error Handling for other errors
             handleApiError(error);
             updateCurrentProject({ 
                researchOutput: `[Deep Research Failed: ${error.message}]`, 
                isGenerating: false 
             });
             setGenerationPhase('');
        }
        return;
    }

    // -- Standard Mode --
    setGenerationPhase('Initializing AI...');
    let accumulatedText = '';
    
    try {
      const { text, sources } = await streamDeepResearch(
        prompt, 
        proj.settings, 
        apiKey, 
        (chunk) => {
            accumulatedText += chunk;
            dispatch({ 
                type: 'UPDATE_PROJECT', 
                payload: { researchOutput: accumulatedText } 
            });
        },
        (status) => setGenerationPhase(status),
        abortControllerRef.current.signal
      );

      const currentTimestamps = proj.sectionTimestamps || {};
      const sectionTimestamps = { ...currentTimestamps, research: Date.now() };
      updateCurrentProject({ 
          researchOutput: text, 
          researchSources: sources, 
          isGenerating: false, 
          sectionTimestamps
      });
      logEvent('generation_complete', { type: 'research', project: proj.name });
      setGenerationPhase('');
      addToast('Research completed', 'success');

    } catch (error: any) {
      handleApiError(error);
      const errorMessage = error?.message || "Unknown error";
      
      // Don't overwrite if aborted
      if (!errorMessage.includes("Aborted")) {
          updateCurrentProject({ 
            researchOutput: accumulatedText + `\n\n[Generation Failed: ${errorMessage}]`, 
            isGenerating: false 
          });
      }
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent]);

  const performGeminiPRD = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();
    updateCurrentProject({ isGenerating: true, prdOutput: '' });
    setGenerationPhase('Initializing AI...');

    let accumulatedText = '';
    try {
        await streamArtifact(
            getPRDSystemInstruction(), 
            prompt, 
            proj.settings, 
            apiKey, 
            (chunk) => {
                accumulatedText += chunk;
                dispatch({ type: 'UPDATE_PROJECT', payload: { prdOutput: accumulatedText } });
            },
            (status) => setGenerationPhase(status),
            abortControllerRef.current.signal
        );
        
        const currentTimestamps = proj.sectionTimestamps || {};
        const sectionTimestamps = { ...currentTimestamps, prd: Date.now() };
        updateCurrentProject({ prdOutput: accumulatedText, isGenerating: false, sectionTimestamps });
        logEvent('generation_complete', { type: 'prd', project: proj.name });
        setGenerationPhase('');
        addToast('PRD generated', 'success');
    } catch (error: any) {
        handleApiError(error);
        if (!error?.message?.includes('Aborted')) {
            updateCurrentProject({ isGenerating: false });
        }
        setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent]);

  const performGeminiTech = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();
    updateCurrentProject({ isGenerating: true, techOutput: '' });
    setGenerationPhase('Initializing AI...');

    let accumulatedText = '';
    try {
        await streamArtifact(
            getTechDesignSystemInstruction(), 
            prompt, 
            proj.settings, 
            apiKey, 
            (chunk) => {
                accumulatedText += chunk;
                dispatch({ type: 'UPDATE_PROJECT', payload: { techOutput: accumulatedText } });
            },
            (status) => setGenerationPhase(status),
            abortControllerRef.current.signal
        );
        
        const currentTimestamps = proj.sectionTimestamps || {};
        const sectionTimestamps = { ...currentTimestamps, tech: Date.now() };
        updateCurrentProject({ techOutput: accumulatedText, isGenerating: false, sectionTimestamps });
        logEvent('generation_complete', { type: 'tech', project: proj.name });
        setGenerationPhase('');
        addToast('Tech Design generated', 'success');
    } catch (error: any) {
        handleApiError(error);
        if (!error?.message?.includes('Aborted')) {
            updateCurrentProject({ isGenerating: false });
        }
        setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent]);

  const performGeminiAgent = useCallback(async (prompt: string) => {
      const proj = state.projects[state.currentId];
      if (!proj) return "";
      if (!apiKey) {
        setIsApiKeyModalOpen(true);
        return "";
      }

      updateCurrentProject({ isGenerating: true });
      setGenerationPhase('Generating Agent Config...');
      try {
          // Agent generation is usually fast/single-shot, so using non-streaming is fine, 
          // but we still want standard error handling.
          const text = await generateArtifact(getAgentSystemInstruction(), prompt, proj.settings, apiKey);
          updateCurrentProject({ isGenerating: false });
          logEvent('generation_complete', { type: 'agent', project: proj.name });
          setGenerationPhase('');
          addToast('Agent config generated', 'success');
          return text;
      } catch (error: any) {
          handleApiError(error);
          updateCurrentProject({ isGenerating: false });
          setGenerationPhase('');
          return "";
      }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent]);

  const performGeminiBuildPlan = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    abortControllerRef.current = new AbortController();
    updateCurrentProject({ isGenerating: true, buildPlan: '' });
    setGenerationPhase('Initializing AI...');

    let accumulatedText = '';
    try {
        await streamArtifact(
            getBuildPlanSystemInstruction(), 
            prompt, 
            proj.settings, 
            apiKey, 
            (chunk) => {
                accumulatedText += chunk;
                dispatch({ type: 'UPDATE_PROJECT', payload: { buildPlan: accumulatedText } });
            },
            (status) => setGenerationPhase(status),
            abortControllerRef.current.signal
        );
        
        const currentTimestamps = proj.sectionTimestamps || {};
        const sectionTimestamps = { ...currentTimestamps, build: Date.now() };
        updateCurrentProject({ buildPlan: accumulatedText, isGenerating: false, sectionTimestamps });
        logEvent('generation_complete', { type: 'build_plan', project: proj.name });
        setGenerationPhase('');
        addToast('Build Plan generated', 'success');
    } catch (error: any) {
        handleApiError(error);
        if (!error?.message?.includes('Aborted')) {
            updateCurrentProject({ isGenerating: false });
        }
        setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError, logEvent]);

  const performRefinement = useCallback(async (type: 'research' | 'prd' | 'tech' | 'build', instruction: string) => {
    updateCurrentProject({ isGenerating: true });
    
    const currentProj = state.projects[state.currentId];
    if (!currentProj) return; // Guard clause
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      updateCurrentProject({ isGenerating: false });
      return;
    }

    abortControllerRef.current = new AbortController();
    setGenerationPhase('Refining Content...');

    let currentContent = '';
    if (type === 'research') currentContent = currentProj.researchOutput;
    if (type === 'prd') currentContent = currentProj.prdOutput;
    if (type === 'tech') currentContent = currentProj.techOutput;
    if (type === 'build') currentContent = currentProj.buildPlan;
    
    const prompt = generateRefinePrompt(currentContent, instruction);
    let accumulatedText = '';

    try {
      await streamArtifact(
          getRefineSystemInstruction(), 
          prompt, 
          currentProj.settings, 
          apiKey, 
          (chunk) => {
              accumulatedText += chunk;
              const update: any = {};
              if (type === 'research') update.researchOutput = accumulatedText;
              if (type === 'prd') update.prdOutput = accumulatedText;
              if (type === 'tech') update.techOutput = accumulatedText;
              if (type === 'build') update.buildPlan = accumulatedText;
              dispatch({ type: 'UPDATE_PROJECT', payload: update });
          },
          (status) => setGenerationPhase(status),
          abortControllerRef.current.signal
      );
      
      const currentTimestamps = currentProj.sectionTimestamps || {};
      const finalUpdate: any = { isGenerating: false, sectionTimestamps: { ...currentTimestamps } };
      
      if (type === 'research') {
        finalUpdate.researchOutput = accumulatedText;
        finalUpdate.sectionTimestamps.research = Date.now();
      }
      if (type === 'prd') {
        finalUpdate.prdOutput = accumulatedText;
        finalUpdate.sectionTimestamps.prd = Date.now();
      }
      if (type === 'tech') {
        finalUpdate.techOutput = accumulatedText;
        finalUpdate.sectionTimestamps.tech = Date.now();
      }
      if (type === 'build') {
        finalUpdate.buildPlan = accumulatedText;
        finalUpdate.sectionTimestamps.build = Date.now();
      }
      
      updateCurrentProject(finalUpdate);
      setGenerationPhase('');
      addToast('Content refined', 'success');

    } catch (error: any) {
      handleApiError(error);
      if (!error?.message?.includes('Aborted')) {
          updateCurrentProject({ isGenerating: false });
      }
      setGenerationPhase('');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast, apiKey, handleApiError]);

  const queryGemini = useCallback(async (prompt: string, systemInstruction?: string) => {
     try {
         if (!apiKey) {
           setIsApiKeyModalOpen(true);
           throw new Error("API Key missing");
         }
         return await generateArtifact(systemInstruction || "You are a helpful AI assistant.", prompt, state.projects[state.currentId].settings, apiKey);
     } catch (error: any) {
         handleApiError(error);
         throw error;
     }
  }, [state.projects, state.currentId, handleApiError, apiKey]);

  // Safe accessor for current state
  const activeProjectState = state.projects[state.currentId] || createNewProjectState();

  // Memoize the projects array
  const sortedProjects = useMemo(() => {
    return Object.values(state.projects).sort((a: ProjectState, b: ProjectState) => b.lastModified - a.lastModified);
  }, [state.projects]);

  // Memoize the context value
  const contextValue = useMemo(() => ({ 
    state: activeProjectState,
    projects: sortedProjects,
    currentProjectId: state.currentId,
    createProject,
    loadProject,
    deleteProject,
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
    logEvent
  }), [
    activeProjectState, 
    sortedProjects, 
    state.currentId,
    createProject,
    loadProject,
    deleteProject,
    setPersona,
    setAnswer,
    setValidationErrors,
    clearValidationError,
    setResearchOutput,
    setPrdOutput,
    setTechOutput,
    setBuildPlan,
    setAgentOutputs,
    updateSettingsWrapper,
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
    undo,
    redo,
    history.past.length,
    history.future.length,
    saveProject,
    saveStatus,
    apiKey,
    setApiKey,
    clearApiKey,
    isApiKeyModalOpen,
    generationPhase,
    cancelGeneration,
    logEvent
  ]);

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