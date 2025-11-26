
import React, { createContext, useContext, useState, useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { Persona, ProjectState, GeminiSettings, GroundingChunk, ProjectFieldKey } from '../types';
import { runDeepResearch, generateArtifact, streamArtifact, streamDeepResearch } from '../utils/gemini';
import { getPRDSystemInstruction, getTechDesignSystemInstruction, getAgentSystemInstruction, getRefineSystemInstruction, generateRefinePrompt, getBuildPlanSystemInstruction } from '../utils/templates';
import { useToast } from '../components/Toast';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants';

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
  updateSettings: (settings: Partial<GeminiSettings>) => void;
  generateAgentOutputs: () => void;
  toggleTool: (toolId: string) => void;
  performGeminiResearch: (prompt: string) => Promise<void>;
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
}

const defaultSettings: GeminiSettings = {
  modelName: DEFAULT_SETTINGS.MODEL,
  thinkingBudget: DEFAULT_SETTINGS.THINKING_BUDGET, 
  useGrounding: true,
  temperature: DEFAULT_SETTINGS.TEMPERATURE,
  topK: DEFAULT_SETTINGS.TOP_K,
  topP: DEFAULT_SETTINGS.TOP_P
};

const getGlobalSettings = (): GeminiSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.warn("Failed to load global settings", e);
    }
    return defaultSettings;
};

// Helper to get API Key securely
const getApiKey = () => {
    const key = localStorage.getItem('VIBE_GEMINI_API_KEY');
    return key || '';
};

const createNewProjectState = (): ProjectState => ({
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  lastModified: Date.now(),
  persona: null,
  answers: {},
  validationErrors: {},
  researchOutput: '',
  researchSources: [],
  prdOutput: '',
  techOutput: '',
  agentOutputs: {},
  buildPlan: '',
  tools: ['cursor'],
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

/**
 * Provider component for the ProjectContext.
 * Manages state persistence, history (undo/redo), and interaction with Gemini API.
 */
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Initialize Reducer
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
            ...parsedV1,
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


  // Persistence Effect - Debounced
  useEffect(() => {
    // Only save if dirty
    if (saveStatus !== 'unsaved') return;

    const handler = setTimeout(() => {
      setSaveStatus('saving');
      try {
        // Ensure we don't persist 'isGenerating: true'
        const projectsToSave = Object.entries(state.projects).reduce((acc, [id, proj]) => {
          acc[id] = { ...proj, isGenerating: false };
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
    }, 1000); // 1s debounce to prevent spamming local storage on keystrokes

    return () => clearTimeout(handler);
  }, [state, saveStatus]);

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
          acc[id] = { ...proj, isGenerating: false };
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

  // Theme Effect
  const currentProject = state.projects[state.currentId];
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
    addToast('New project created', 'success');
    return null; 
  }, [addToast]);

  const loadProject = useCallback((id: string) => {
    dispatch({ type: 'SWITCH_PROJECT', payload: id });
  }, []);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    addToast('Project deleted', 'info');
  }, [addToast]);

  const setPersona = useCallback((persona: Persona) => updateCurrentProject({ persona }), [updateCurrentProject]);
  
  const setValidationErrors = useCallback((validationErrors: Partial<Record<ProjectFieldKey, string>>) => {
      // Direct updates to validation errors should not trigger deep history snapshots
      updateCurrentProject({ validationErrors }, { snapshot: false });
  }, [updateCurrentProject]);

  const clearValidationError = useCallback((key: ProjectFieldKey) => {
      const current = state.projects[state.currentId];
      if (current?.validationErrors?.[key]) {
          const newErrors = { ...current.validationErrors };
          delete newErrors[key];
          updateCurrentProject({ validationErrors: newErrors }, { snapshot: false });
      }
  }, [state.projects, state.currentId, updateCurrentProject]);

  const setAnswer = useCallback((key: ProjectFieldKey, value: string) => {
    const current = state.projects[state.currentId];
    const answers = current?.answers || {};
    
    // Note: We no longer strictly clear validation errors here. 
    // This allows FormFields to handle validation logic (real-time vs onBlur) explicitly.
    
    updateCurrentProject({ 
        answers: { ...answers, [key]: value }
    }, { snapshot: true, debounce: true });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const setResearchOutput = useCallback((researchOutput: string) => {
      const current = state.projects[state.currentId];
      const sectionTimestamps = { ...((current?.sectionTimestamps || {}) as Record<string, number>), research: Date.now() };
      updateCurrentProject({ researchOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setPrdOutput = useCallback((prdOutput: string) => {
      const current = state.projects[state.currentId];
      const sectionTimestamps = { ...((current?.sectionTimestamps || {}) as Record<string, number>), prd: Date.now() };
      updateCurrentProject({ prdOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setTechOutput = useCallback((techOutput: string) => {
      const current = state.projects[state.currentId];
      const sectionTimestamps = { ...((current?.sectionTimestamps || {}) as Record<string, number>), tech: Date.now() };
      updateCurrentProject({ techOutput, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const setBuildPlan = useCallback((buildPlan: string) => {
      const current = state.projects[state.currentId];
      const sectionTimestamps = { ...((current?.sectionTimestamps || {}) as Record<string, number>), build: Date.now() };
      updateCurrentProject({ buildPlan, sectionTimestamps });
  }, [updateCurrentProject, state.projects, state.currentId]);

  const updateSettingsWrapper = useCallback((newSettings: Partial<GeminiSettings>) => {
    const currentSettings = state.projects[state.currentId]?.settings || defaultSettings;
    const updated = { ...currentSettings, ...newSettings };
    updateCurrentProject({ settings: updated });
    
    // Persist global settings
    localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(updated));
    addToast('Settings updated', 'info');
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const toggleTool = useCallback((toolId: string) => {
    const currentTools = state.projects[state.currentId]?.tools || [];
    const tools = currentTools.includes(toolId)
      ? currentTools.filter(t => t !== toolId)
      : [...currentTools, toolId];
    updateCurrentProject({ tools });
  }, [state.projects, state.currentId, updateCurrentProject]);

  const generateAgentOutputs = useCallback(() => { /* Component handled */ }, []);

  // --- Gemini Actions with Streaming ---

  const performGeminiResearch = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    const apiKey = getApiKey();

    updateCurrentProject({ isGenerating: true, researchOutput: '', researchSources: [] });
    let accumulatedText = '';
    
    try {
      const { text, sources } = await streamDeepResearch(prompt, proj.settings, apiKey, (chunk) => {
        accumulatedText += chunk;
        dispatch({ 
            type: 'UPDATE_PROJECT', 
            payload: { researchOutput: accumulatedText } 
        });
      });

      const sectionTimestamps = { ...(proj.sectionTimestamps || {}), research: Date.now() };
      updateCurrentProject({ 
          researchOutput: text, 
          researchSources: sources, 
          isGenerating: false,
          sectionTimestamps
      });
      addToast('Research completed', 'success');

    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      updateCurrentProject({ 
        researchOutput: accumulatedText + `\n\n[Generation Failed: ${errorMessage}]`, 
        isGenerating: false 
      });
      addToast(`Research Failed: ${errorMessage}`, 'error');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const performGeminiPRD = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    const apiKey = getApiKey();

    updateCurrentProject({ isGenerating: true, prdOutput: '' });
    let accumulatedText = '';
    try {
        await streamArtifact(getPRDSystemInstruction(), prompt, proj.settings, apiKey, (chunk) => {
            accumulatedText += chunk;
            dispatch({ type: 'UPDATE_PROJECT', payload: { prdOutput: accumulatedText } });
        });
        const sectionTimestamps = { ...(proj.sectionTimestamps || {}), prd: Date.now() };
        updateCurrentProject({ prdOutput: accumulatedText, isGenerating: false, sectionTimestamps });
        addToast('PRD generated', 'success');
    } catch (error: any) {
        updateCurrentProject({ isGenerating: false });
        addToast(`PRD Failed: ${error?.message}`, 'error');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const performGeminiTech = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    const apiKey = getApiKey();

    updateCurrentProject({ isGenerating: true, techOutput: '' });
    let accumulatedText = '';
    try {
        await streamArtifact(getTechDesignSystemInstruction(), prompt, proj.settings, apiKey, (chunk) => {
            accumulatedText += chunk;
            dispatch({ type: 'UPDATE_PROJECT', payload: { techOutput: accumulatedText } });
        });
        const sectionTimestamps = { ...(proj.sectionTimestamps || {}), tech: Date.now() };
        updateCurrentProject({ techOutput: accumulatedText, isGenerating: false, sectionTimestamps });
        addToast('Tech Design generated', 'success');
    } catch (error: any) {
        updateCurrentProject({ isGenerating: false });
        addToast(`Tech Design Failed: ${error?.message}`, 'error');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const performGeminiBuildPlan = useCallback(async (prompt: string) => {
    const proj = state.projects[state.currentId];
    if (!proj) return;
    const apiKey = getApiKey();

    updateCurrentProject({ isGenerating: true, buildPlan: '' });
    let accumulatedText = '';
    try {
        await streamArtifact(getBuildPlanSystemInstruction(), prompt, proj.settings, apiKey, (chunk) => {
            accumulatedText += chunk;
            dispatch({ type: 'UPDATE_PROJECT', payload: { buildPlan: accumulatedText } });
        });
        const sectionTimestamps = { ...(proj.sectionTimestamps || {}), build: Date.now() };
        updateCurrentProject({ buildPlan: accumulatedText, isGenerating: false, sectionTimestamps });
        addToast('Build Plan generated', 'success');
    } catch (error: any) {
        updateCurrentProject({ isGenerating: false });
        addToast(`Build Plan Failed: ${error?.message}`, 'error');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const performGeminiAgent = useCallback(async (prompt: string) => {
      const proj = state.projects[state.currentId];
      if (!proj) return "";
      const apiKey = getApiKey();

      updateCurrentProject({ isGenerating: true });
      try {
          const text = await generateArtifact(getAgentSystemInstruction(), prompt, proj.settings, apiKey);
          updateCurrentProject({ isGenerating: false });
          addToast('Agent config generated', 'success');
          return text;
      } catch (error: any) {
          updateCurrentProject({ isGenerating: false });
          addToast(`Agent Config Failed: ${error?.message}`, 'error');
          return "";
      }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const performRefinement = useCallback(async (type: 'research' | 'prd' | 'tech' | 'build', instruction: string) => {
    updateCurrentProject({ isGenerating: true });
    
    const currentProj = state.projects[state.currentId];
    const apiKey = getApiKey();
    let currentContent = '';
    if (type === 'research') currentContent = currentProj.researchOutput;
    if (type === 'prd') currentContent = currentProj.prdOutput;
    if (type === 'tech') currentContent = currentProj.techOutput;
    if (type === 'build') currentContent = currentProj.buildPlan;
    
    const prompt = generateRefinePrompt(currentContent, instruction);
    let accumulatedText = '';

    try {
      await streamArtifact(getRefineSystemInstruction(), prompt, currentProj.settings, apiKey, (chunk) => {
          accumulatedText += chunk;
          const update: any = {};
          if (type === 'research') update.researchOutput = accumulatedText;
          if (type === 'prd') update.prdOutput = accumulatedText;
          if (type === 'tech') update.techOutput = accumulatedText;
          if (type === 'build') update.buildPlan = accumulatedText;
          dispatch({ type: 'UPDATE_PROJECT', payload: update });
      });
      
      const finalUpdate: any = { isGenerating: false, sectionTimestamps: { ...currentProj.sectionTimestamps } };
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
      addToast('Content refined', 'success');

    } catch (error: any) {
      updateCurrentProject({ isGenerating: false });
      addToast(`Refinement Failed: ${error?.message}`, 'error');
    }
  }, [state.projects, state.currentId, updateCurrentProject, addToast]);

  const queryGemini = useCallback(async (prompt: string, systemInstruction?: string) => {
     try {
         const apiKey = getApiKey();
         return await generateArtifact(systemInstruction || "You are a helpful AI assistant.", prompt, state.projects[state.currentId].settings, apiKey);
     } catch (error: any) {
         addToast(`Query Failed: ${error?.message}`, 'error');
         throw error;
     }
  }, [state.projects, state.currentId, addToast]);

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
    updateSettings: updateSettingsWrapper,
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
    saveStatus
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
    updateSettingsWrapper,
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
    saveStatus
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
