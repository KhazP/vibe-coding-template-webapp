
import { ToolDefinition } from "../types";

export const APP_NAME = 'Vibe-Coding Workflow';

export const ROUTES = {
  HOME: '/',
  PROJECTS: '/projects',
  RESEARCH: '/research',
  PRD: '/prd',
  TECH: '/tech',
  AGENT: '/agent',
  BUILD: '/build',
} as const;

export const STORAGE_KEYS = {
  V1: 'vibe-coding-state-v1',
  V2: 'vibe-coding-storage-v2',
  GLOBAL_SETTINGS: 'vibe-coding-global-settings',
} as const;

export const MODELS = {
  GEMINI_PRO: 'gemini-3-pro-preview',
  GEMINI_FLASH: 'gemini-2.5-flash',
} as const;

export const MODEL_CONFIGS = {
  [MODELS.GEMINI_PRO]: {
    label: 'Gemini 3 Pro Preview (Recommended)',
    maxThinkingBudget: 32768,
    supportsGrounding: true,
    description: 'Supports deep reasoning (up to 32k tokens).',
    isFlash: false
  },
  [MODELS.GEMINI_FLASH]: {
    label: 'Gemini 2.5 Flash (Faster/Cheaper)',
    maxThinkingBudget: 24576,
    supportsGrounding: true,
    description: 'Optimized for speed (up to 24k tokens).',
    isFlash: true
  }
} as const;

export const DEFAULT_SETTINGS = {
  MODEL: MODELS.GEMINI_PRO,
  THINKING_BUDGET: 32768,
  TEMPERATURE: 0.7,
  TOP_K: 64,
  TOP_P: 0.95,
} as const;

export const PERSONA_KEYS = {
  VIBE_CODER: 'A',
  DEVELOPER: 'B',
  IN_BETWEEN: 'C'
} as const;

export const TOOL_IDS = {
  CURSOR: 'cursor',
  CLINE: 'cline',
  AIDER: 'aider',
  WINDSURF: 'windsurf',
  COPILOT: 'copilot',
  GEMINI_CLI: 'gemini-cli',
  CLAUDE: 'claude',
  ANTIGRAVITY: 'google-antigravity',
  LOVABLE: 'lovable',
  V0: 'v0'
} as const;

export const FILE_NAMES = {
  AGENTS_MD: 'AGENTS.md',
  GEMINI_MD: 'GEMINI.md',
  CLAUDE_MD: 'CLAUDE.md',
  CURSOR_RULES: '.cursorrules',
  CLINE_RULES: '.clinerules',
  WINDSURF_RULES: '.windsurfrules',
  AIDER_CONF: '.aider.conf.yml',
  COPILOT_INSTR: '.github/copilot-instructions.md',
  ANTIGRAVITY_MD: 'ANTIGRAVITY.md',
  LOVABLE_PROMPT: 'LOVABLE_PROMPT.md',
  V0_PROMPT: 'V0_PROMPT.md',
  BUILD_PLAN: 'BUILD_PLAN.md'
} as const;

export const TOOLS: ToolDefinition[] = [
  // Native Support (Directly reads AGENTS.md)
  {
    id: TOOL_IDS.CURSOR,
    name: 'Cursor',
    file: FILE_NAMES.CURSOR_RULES, 
    category: 'Native Support',
    description: 'Reads AGENTS.md automatically. We generate a one-line .cursorrules to enforce strict inheritance.',
    supportLevel: 'native',
    techTooltip: 'Generates .cursorrules. Note: Requires .cursor/mcp.json for MCP server features.'
  },
  { 
    id: TOOL_IDS.CLINE, 
    name: 'Cline', 
    file: FILE_NAMES.CLINE_RULES, 
    category: 'Native Support',
    description: 'VS Code extension. Supports AGENTS.md natively or via .clinerules.',
    supportLevel: 'native',
    techTooltip: 'Uses .clinerules to natively enforce AGENTS.md rules.'
  },
  { 
    id: TOOL_IDS.AIDER, 
    name: 'Aider', 
    file: FILE_NAMES.AIDER_CONF, 
    category: 'Native Support',
    description: 'CLI pair programmer. Reads AGENTS.md by default.',
    supportLevel: 'native',
    techTooltip: 'Configures .aider.conf.yml to auto-read AGENTS.md context.'
  },
  { 
    id: TOOL_IDS.WINDSURF, 
    name: 'Windsurf', 
    file: FILE_NAMES.WINDSURF_RULES, 
    category: 'Native Support',
    description: 'IDE by Codeium. Automatically detects rule files.',
    supportLevel: 'native',
    techTooltip: 'Generates .windsurfrules which is auto-detected by the IDE.'
  },
  { 
    id: TOOL_IDS.COPILOT, 
    name: 'GitHub Copilot', 
    file: FILE_NAMES.COPILOT_INSTR, 
    category: 'Native Support',
    description: 'Reads AGENTS.md via context. We link it explicitly.',
    supportLevel: 'native',
    techTooltip: 'Creates .github/copilot-instructions.md for native context integration.'
  },
  
  // Adapter Required
  { 
    id: TOOL_IDS.GEMINI_CLI, 
    name: 'Gemini CLI', 
    file: FILE_NAMES.GEMINI_MD, 
    category: 'Adapter Required',
    description: 'Uses GEMINI.md as project memory.',
    supportLevel: 'adapter',
    techTooltip: 'Adapts AGENTS.md into a GEMINI.md system prompt.'
  },
  { 
    id: TOOL_IDS.CLAUDE, 
    name: 'Claude Code', 
    file: FILE_NAMES.CLAUDE_MD, 
    category: 'Adapter Required',
    description: 'Requires an import statement (@AGENTS.md) in CLAUDE.md.',
    supportLevel: 'adapter',
    techTooltip: 'Creates CLAUDE.md to set project-wide coding conventions.'
  },
  {
    id: TOOL_IDS.ANTIGRAVITY,
    name: 'Google Antigravity',
    file: FILE_NAMES.ANTIGRAVITY_MD, 
    category: 'Adapter Required',
    description: 'Requires explicit context linking to AGENTS.md.',
    supportLevel: 'adapter',
    techTooltip: 'Links AGENTS.md via explicit import in ANTIGRAVITY.md.'
  },
  
  // Generators
  { 
    id: TOOL_IDS.LOVABLE, 
    name: 'Lovable', 
    file: FILE_NAMES.LOVABLE_PROMPT, 
    category: 'Generator',
    description: 'Full-stack builder. We generate a prompt that summarizes AGENTS.md.',
    supportLevel: 'manual',
    techTooltip: 'Generates a prompt summary optimized for the Lovable builder.'
  },
  { 
    id: TOOL_IDS.V0, 
    name: 'v0', 
    file: FILE_NAMES.V0_PROMPT, 
    category: 'Generator',
    description: 'Generative UI. We generate a prompt that summarizes AGENTS.md.',
    supportLevel: 'manual',
    techTooltip: 'Generates a prompt summary optimized for the v0 UI generator.'
  },
];
