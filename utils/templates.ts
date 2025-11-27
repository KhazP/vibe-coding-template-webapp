



import { Persona } from '../types';
import { FILE_NAMES, TOOL_IDS } from './constants';

export const generateResearchPrompt = (persona: Persona, answers: Record<string, string>) => {
  const idea = answers['project_description'] || 'A new software project';

  if (persona === Persona.VibeCoder) {
    return `## Deep Research Request: ${idea} (Vibe-Coder Persona)

I am a non-technical "Vibe-Coder" building: ${idea}.
I need you to act as my Lead Product Researcher.

### My Inputs
1. **Target Audience**: ${answers['research_vibe_who']}
2. **User Problems**: ${answers['research_vibe_problem']}
3. **Current Solutions**: ${answers['research_vibe_existing']}
4. **Secret Sauce**: ${answers['research_vibe_unique']}
5. **Must-Have Features**: ${answers['research_vibe_features']}
6. **Platform**: ${answers['research_vibe_platform']}
7. **Timeline**: ${answers['research_vibe_timeline']}
8. **Budget**: ${answers['research_vibe_budget']}

### Research Goals
1. **Market Validation**: Analyze the audience and problems.
2. **Competitive Analysis**: Review current solutions and my "Secret Sauce".
3. **Feasibility Check**: Can this be built with ${answers['research_vibe_budget']} on ${answers['research_vibe_platform']}?

Please provide a report in plain English, avoiding jargon.`;
  }

  if (persona === Persona.Developer) {
    return `## Deep Research Request: ${idea} (Developer Persona)

I am a Developer architecting: ${idea}.
I need a rigorous technical validation.

### Context & Directives
1. **Project Focus & Context**: ${answers['project_description']}
2. **Specific Questions**: ${answers['research_dev_questions']}
3. **Stack/API Specifics**: ${answers['research_dev_stack_specifics']}
4. **Decisions to Inform**: ${answers['research_dev_decisions']}
5. **Why Now**: ${answers['research_dev_timing']}
6. **Scope Boundaries**: ${answers['research_dev_scope']}
7. **Research Depth**: ${answers['research_dev_depth']}
8. **Source Priority**: ${answers['research_dev_sources']}
9. **Technical Constraints**: ${answers['research_dev_constraints']}
10. **Broader Context**: ${answers['research_dev_context']}

### Research Goals
1. **Technical Feasibility**: Analyze specific constraints and questions.
2. **Comparative Analysis**: Deep dive into tools/libs based on my source priority.
3. **Architecture Recommendations**: Inform the decisions listed above.

Use high-level technical language. Cite sources.`;
  }

  // In-Between
  return `## Deep Research Request: ${idea} (Learner Persona)

I am learning to code while building: ${idea}.
I need research that bridges the gap between easy-to-build and industry-standard.

### My Inputs
1. **Project Idea & Coding Experience**: ${answers['project_description']}
2. **Problem & User**: ${answers['research_mid_problem']}
3. **Research Topics (Tech & Biz)**: ${answers['research_mid_learn']}
4. **Similar Solutions**: ${answers['research_mid_existing']}
5. **Validation Strategy**: ${answers['research_mid_validation']}
6. **Platform Preference**: ${answers['research_mid_platform']}
7. **Technical Comfort Zone**: ${answers['research_mid_comfort']}
8. **Timeline & Success**: ${answers['research_mid_timeline']}
9. **Budget**: ${answers['research_mid_budget']}

### Research Goals
1. **Educational Path**: How can I build this while learning ${answers['research_mid_comfort']}?
2. **Market & Tech Check**: specific advice for ${answers['research_mid_platform']}.
3. **Validation**: Feedback on my validation strategy.

Explain complex concepts but treat me like an intelligent student.`;
};

export const getPRDSystemInstruction = () => "You are an expert Product Manager. You write clear, comprehensive Product Requirements Documents (PRDs) suitable for development. You prioritize clarity, user value, and technical feasibility."

export const generatePRDPrompt = (persona: Persona, answers: Record<string, string>, researchContext: string) => {
  const name = answers['prd_vibe_name'] || answers['prd_dev_name'] || answers['prd_mid_name'] || 'The App';

  if (persona === Persona.VibeCoder) {
    return `Create a Narrative-Driven PRD for ${name}.

### User Inputs (Vibe-Coder)
1. **One-Sentence Problem**: ${answers['project_description']}
2. **Launch Goal**: ${answers['prd_vibe_goal']}
3. **Users**: ${answers['prd_vibe_users']}
4. **User Journey Story**: ${answers['prd_vibe_story']}
5. **Must-Have Features**: ${answers['prd_vibe_features']}
6. **Deferred Features**: ${answers['prd_vibe_non_features']}
7. **Success Metric**: ${answers['prd_vibe_metric']}
8. **Vibe/Style**: ${answers['prd_vibe_vibe']}
9. **Constraints**: ${answers['prd_vibe_constraints']}

### Research Context
${researchContext}

### Output Requirements
Generate a PRD that focuses on the *Story* and *Vibe*.
1. **Executive Summary**: The vision for ${name}.
2. **User Journey Map**: Step-by-step flow based on the story.
3. **Functional Requirements**: Extracted from the narrative.
4. **UI/UX Guidelines**: Based on the "${answers['prd_vibe_vibe']}" vibe.
5. **Success Definition**: Based on ${answers['prd_vibe_metric']}.

Keep it simple, inspiring, and ready for a developer/AI to build.`;
  }

  if (persona === Persona.Developer) {
    return `Create a Technical PRD for ${name}.

### User Inputs (Developer)
1. **One-Liner**: ${answers['prd_dev_oneliner']}
2. **Goal**: ${answers['prd_dev_goal']}
3. **Audience**: ${answers['prd_dev_audience']}
4. **User Stories**: ${answers['prd_dev_stories']}
5. **Features (MoSCoW)**: ${answers['prd_dev_features']}
6. **Metrics**: ${answers['prd_dev_metrics']}
7. **Tech/UX Requirements**: ${answers['prd_dev_tech']}
8. **Compliance**: ${answers['prd_dev_compliance']}
9. **Risks**: ${answers['prd_dev_risks']}
10. **Business Constraints**: ${answers['prd_dev_biz']}

### Research Context
${researchContext}

### Output Requirements
Standard Engineering PRD format:
1. **Problem & Opportunity**
2. **Scope & Goals**
3. **User Personas & Stories**
4. **Functional Requirements** (Detailed)
5. **Non-Functional Requirements** (Performance, Security, etc.)
6. **Success Metrics**
7. **Risks & Mitigation**
`;
  }

  // In-Between
  return `Create a Learning-Oriented PRD for ${name}.

### User Inputs (Learner)
1. **Purpose**: ${answers['prd_mid_purpose']}
2. **Goal**: ${answers['prd_mid_goal']}
3. **Users**: ${answers['prd_mid_users']}
4. **Flow**: ${answers['prd_mid_flow']}
5. **Core Features**: ${answers['prd_mid_features']}
6. **Future Features**: ${answers['prd_mid_non_features']}
7. **Metrics**: ${answers['prd_mid_metric']}
8. **Design**: ${answers['prd_mid_design']}
9. **Constraints**: ${answers['prd_mid_constraints']}

### Research Context
${researchContext}

### Output Requirements
A PRD that explains *why* requirements exist.
1. **Product Vision**
2. **Core User Flow**
3. **MVP Feature Set** (With implementation notes)
4. **Technical Considerations** (Simplified)
5. **Future Roadmap**

Tone: Educational but professional.
`;
};

export const getTechDesignSystemInstruction = () => "You are an expert Software Architect. You design scalable, secure, and maintainable systems. You provide clear technical specifications, database schemas, and API definitions suitable for implementation.";

export const generateTechDesignPrompt = (persona: Persona, answers: Record<string, string>, prdContext: string) => {
    const name = answers['prd_vibe_name'] || answers['prd_dev_name'] || answers['prd_mid_name'] || 'The App';
    
    if (persona === Persona.VibeCoder) {
        return `Create a "Vibe-Code" Tech Design for ${name}.

### User Inputs (Vibe-Coder)
1. **Platform**: ${answers['tech_vibe_platform']}
2. **Coding Approach**: ${answers['tech_vibe_coding']}
3. **Budget**: ${answers['tech_vibe_budget']}
4. **Timeline**: ${answers['tech_vibe_timeline']}
5. **Fears/Risks**: ${answers['tech_vibe_worry']}
6. **Existing Tools**: ${answers['tech_vibe_tools']}
7. **Priority**: ${answers['tech_vibe_priority']}

### PRD Context
${prdContext}

### Output Requirements
A Tech Spec optimized for AI-assisted generation.
1. **Recommended Stack**: Choose tools that work best with AI code generation (e.g., Supabase, Firebase, Next.js). Explain *why*.
2. **Project Structure**: Simple file folder structure.
3. **Data Model**: Simple schema (User, Posts, etc.) in plain English.
4. **Step-by-Step Build Plan**: How to build this iteratively.
5. **AI Prompts**: Suggest 3-5 prompts I can copy-paste to start building.

Focus on simplicity and speed.`;
    }

    if (persona === Persona.Developer) {
        return `Create a System Architecture Document for ${name}.

### User Inputs (Developer)
1. **Platform Strategy**: ${answers['tech_dev_platform']}
2. **Preferred Stack**: ${answers['tech_dev_stack']}
3. **Architecture**: ${answers['tech_dev_architecture']}
4. **State Management**: ${answers['tech_dev_state']}
5. **Components**: ${answers['tech_dev_components']}
6. **AI Strategy**: ${answers['tech_dev_ai']}
7. **Workflow**: ${answers['tech_dev_workflow']}
8. **Performance**: ${answers['tech_dev_perf']}
9. **Security**: ${answers['tech_dev_security']}

### PRD Context
${prdContext}

### Output Requirements
Professional Architecture Document.
1. **System Overview**: High-level diagram description.
2. **Tech Stack Decision Record**: Justification for choices.
3. **Database Schema**: ER Diagram description or SQL/Prisma schema.
4. **API Design**: Key endpoints and logic.
5. **Component Architecture**: Frontend/Backend split.
6. **Security & Scalability**: Addressing specific constraints.
`;
    }

    return `Create a "Learner's" Tech Spec for ${name}.

### User Inputs (Learner)
1. **Platform**: ${answers['tech_mid_platform']}
2. **Comfort Zone**: ${answers['tech_mid_comfort']}
3. **MVP Approach**: ${answers['tech_mid_approach']}
4. **Complexity**: ${answers['tech_mid_complexity']}
5. **Budget**: ${answers['tech_mid_budget']}
6. **AI Assistance**: ${answers['tech_mid_ai']}
7. **Timeline**: ${answers['tech_mid_timeline']}

### PRD Context
${prdContext}

### Output Requirements
A Tech Spec that teaches while defining.
1. **Chosen Stack**: Explain *what* we are using and *why* it fits the skill level.
2. **Database Schema**: Explained simply (e.g. "Users table holds...").
3. **Key Concepts**: Explain any complex patterns needed (e.g., "WebSockets" or "Auth").
4. **Development Roadmap**: Logical steps to build and learn.
5. **Resources**: Links or keywords to learn more.
`;
};

export const getAgentSystemInstruction = () => `You are an expert AI Configuration Specialist. You generate comprehensive, standardized ${FILE_NAMES.AGENTS_MD} files that serve as the single source of truth for AI coding agents (Cursor, Windsurf, Copilot, etc.). You ensure the instructions are clear, context-aware, and actionable.`;

export const getRefineSystemInstruction = () => "You are an expert technical editor and product consultant. You refine and improve technical documents based on specific feedback while maintaining the original format and structured depth.";

export const generateRefinePrompt = (originalContent: string, instruction: string) => {
    return `Original Content:
"""
${originalContent}
"""

Refinement Instruction:
"${instruction}"

Task: Rewrite the content to incorporate the instruction. Maintain the original markdown structure/headers unless asked to change them. Return the full updated document.`;
};

export const generateAgentsMdPrompt = (persona: Persona, answers: Record<string, string>, prd: string, tech: string) => {
    return `Create a comprehensive '${FILE_NAMES.AGENTS_MD}' file for this project.
This file will serve as the "Universal Brain" for all AI coding agents (Cursor, Copilot, Cline, etc.).

### Context
- **Project Name**: ${answers['project_description'] || 'The App'}
- **Persona**: ${persona} (Adjust tone: VibeCoder = Helpful/Educational, Developer = Concise/Technical).
- **Stack**: ${answers['tech_dev_stack'] || answers['tech_vibe_platform']}

### Input Documents
PRD Summary:
${prd.substring(0, 1500)}...

Tech Design Summary:
${tech.substring(0, 1500)}...

### Output Format
Generate a Markdown file named ${FILE_NAMES.AGENTS_MD} containing these specific sections:
1. **Project Overview**: High-level goal and "Secret Sauce".
2. **User Persona & Role**: Who the user is (e.g., "I am a vibe coder, explain things simply") and how the Agent should behave.
3. **Tech Stack & Architecture**: Bullet points of the stack, db, and key libraries.
4. **Development Setup**: Standard commands (install, run, test) inferred from the stack.
5. **Coding Standards**: Rules for code quality (e.g. "TypeScript Strict", "Functional Components").
6. **Documentation Index**: Reference the other docs (docs/PRD.md, docs/TechDesign.md).

The goal is that ANY AI agent reading this file knows exactly what to do without hallucinations.`;
};

export interface ToolOptions {
    claudeAdapterMode?: boolean; // true = adapter (@AGENTS.md), false = full config
    geminiAdapterMode?: boolean; // true = adapter, false = full config
    antigravityAdapterMode?: boolean; // true = adapter, false = full config
}

export const generateToolConfig = (toolId: string, appName: string, persona: Persona, answers: Record<string, string>, options?: ToolOptions) => {
    // Adapter generation logic
    const commonContext = `Project: ${appName}`;
    const agentsMd = FILE_NAMES.AGENTS_MD;
    
    // Helper to infer stack-based commands for Claude/Gemini
    const getStackCommands = () => {
        const stack = (answers['tech_dev_stack'] || answers['tech_vibe_platform'] || '').toLowerCase();
        
        if (stack.includes('python') || stack.includes('django') || stack.includes('flask')) {
            return `# Bash commands
- pip install -r requirements.txt: Install dependencies
- python manage.py runserver: Start dev server
- pytest: Run tests`;
        }
        if (stack.includes('go') || stack.includes('golang')) {
             return `# Bash commands
- go run main.go: Start application
- go test ./...: Run all tests
- go mod tidy: Clean dependencies`;
        }
        if (stack.includes('rust')) {
             return `# Bash commands
- cargo run: Start application
- cargo test: Run tests
- cargo build: Build project`;
        }
        // Default to Node/JS
        return `# Bash commands
- npm install: Install dependencies
- npm run dev: Start development server
- npm run build: Build for production
- npm test: Run test suite`;
    };

    const getCodingStandards = () => {
        if (persona === Persona.VibeCoder) {
            return `- Keep solutions simple and beginner-friendly
- Comment complex logic extensively
- Use modern, stable libraries`;
        } else {
             return `- Follow patterns defined in ${agentsMd}
- Prefer functional paradigms where possible
- Keep components small and focused
- Write comments for complex logic only`;
        }
    };

    switch (toolId) {
        case TOOL_IDS.CURSOR:
            return `# ${FILE_NAMES.CURSOR_RULES}
# This file inherits instructions from ${agentsMd}

Read and strictly follow the rules in ${agentsMd}.
`;
        case TOOL_IDS.CLINE:
             return `# ${FILE_NAMES.CLINE_RULES}
# This file inherits instructions from ${agentsMd}

Read and strictly follow the rules in ${agentsMd}.
`;
        case TOOL_IDS.WINDSURF:
             return `# ${FILE_NAMES.WINDSURF_RULES}
# This file inherits instructions from ${agentsMd}

Read and strictly follow the rules in ${agentsMd}.
`;
        case TOOL_IDS.COPILOT:
            return `# ${FILE_NAMES.COPILOT_INSTR}

# This file inherits instructions from ${agentsMd}

Read and strictly follow the rules in ${agentsMd}.
`;
        case TOOL_IDS.AIDER:
            return `# ${FILE_NAMES.AIDER_CONF}
read: ${agentsMd}
`;
        case TOOL_IDS.GEMINI_CLI:
        case TOOL_IDS.ANTIGRAVITY:
            // Check specific adapter mode based on tool ID
            const isGemini = toolId === TOOL_IDS.GEMINI_CLI;
            const useAdapter = isGemini ? options?.geminiAdapterMode : options?.antigravityAdapterMode;

            if (useAdapter) {
                 // Adapter Mode
                 return `# ${FILE_NAMES.GEMINI_MD} Adapter
# This file inherits instructions from ${agentsMd}

# Context for Google Antigravity / Gemini
@${agentsMd}
`;
            } else {
                // Optimized Mode (Best Practice GEMINI.md)
                return `# GEMINI.MD: AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

* **Primary Goal:** ${answers['project_description'] || 'Build a functional application.'}
* **Business Domain:** ${answers['research_vibe_who'] || answers['prd_dev_audience'] || 'General User Base'}

## 2. Core Technologies & Stack

* **Stack:** ${answers['tech_dev_stack'] || answers['tech_vibe_platform'] || 'Standard Web Stack'}

## 3. Architectural Patterns

* **Overall Architecture:** ${answers['tech_dev_architecture'] || 'Modular Monolith (Default)'}
* **Directory Structure Philosophy:** (Inferred)
    * \`/src\`: Contains all primary source code.
    * \`/tests\`: Contains all unit and integration tests.
    * \`/config\`: Holds environment and configuration files.

## 4. Coding Conventions & Style Guide

* **Formatting:** Standard formatting (e.g. Prettier/Black).
* **Naming Conventions:** CamelCase for vars/funcs, PascalCase for classes/components.
* **API Design:** RESTful principles (unless otherwise specified).
* **Error Handling:** Use try...catch blocks and custom error classes.

## 5. Key Files & Entrypoints

* **Main Entrypoint(s):** (Inferred from stack, e.g., index.js, app.py)
* **Configuration:** .env, config files.
* **CI/CD Pipeline:** GitHub Actions (inferred).

## 6. Development & Testing Workflow

* **Local Development Environment:**
${getStackCommands()}

* **Testing:**
    * Run tests via standard commands.
    * New code requires corresponding unit tests.

## 7. Specific Instructions for AI Collaboration

* **Contribution Guidelines:** All changes must review ${agentsMd}.
* **Security:** Do not hardcode secrets. Ensure auth logic is secure.
* **Dependencies:** Use standard package managers (npm/pip) to add libs.
`;
            }

        case TOOL_IDS.CLAUDE:
            if (options?.claudeAdapterMode) {
                // Switch ON: Generate Adapter
                return `@${agentsMd}`;
            } else {
                // Switch OFF: Generate Full Best-Practice Config
                return `# ${FILE_NAMES.CLAUDE_MD}

# Bash commands
${getStackCommands()}

# Code style
- Framework: ${answers['tech_dev_stack'] || 'Standard'}
${getCodingStandards()}

# Workflow
- Review ${agentsMd} before starting complex tasks
- Run tests after every significant change
- Use descriptive commit messages
- Create small, focused pull requests

# Environment
- Project: ${appName}
- Persona: ${persona}
`;
            }

        // Generators (Keep prompt style for copy-paste tools)
        case TOOL_IDS.LOVABLE:
        case TOOL_IDS.V0:
            return `# ${toolId.toUpperCase()}_PROMPT.md

I want you to build ${appName}.

## Instructions
Please read the attached ${agentsMd} (if available) or the following context.

${commonContext}

Start by building the core layout and navigation.
`;
        default:
            return `# ${agentsMd} Adapter

Read and strictly follow the rules in ${agentsMd}.
`;
    }
};

export const getBuildPlanSystemInstruction = () => "You are a Senior Engineering Manager. Your goal is to break down a technical design into a concrete, step-by-step execution plan for an AI coding agent. You focus on file structure, dependencies, and logical implementation order.";

export const generateBuildPlanPrompt = (persona: Persona, answers: Record<string, string>, prd: string, tech: string) => {
  const stack = answers['tech_dev_stack'] || answers['tech_vibe_platform'] || 'Standard Web Stack';
  
  return `Create a ${FILE_NAMES.BUILD_PLAN} for ${answers['project_description'] || 'the project'}.

### Context
Persona: ${persona}
Tech Stack: ${stack}
Primary Instruction File: ${FILE_NAMES.AGENTS_MD}

### Inputs
PRD Summary:
${prd.substring(0, 2000)}...

Tech Design Summary:
${tech.substring(0, 2000)}...

### Output Requirements
1. **File Tree**: A complete ASCII file tree of the project structure. THIS IS CRITICAL.
2. **Phase 1: Scaffolding**: Command to init project and initial config.
3. **Phase 2: Core Components**: List of files to create, including dependencies.
4. **Phase 3: Features**: Logical order of implementation.
5. **Verification**: How to test each phase.

Format as a Markdown file ready to be read by an AI agent. Make sure the File Tree is at the top.`;
};

export const generatePhasePrompt = (persona: Persona, answers: Record<string, string>, buildPlan: string, phase: string) => {
    const stack = answers['tech_dev_stack'] || answers['tech_vibe_platform'] || 'Standard Web Stack';

    return `Act as a Technical Lead. I need a specific prompt to give to my AI Code Agent (like Cursor or Windsurf) to execute **${phase}** of this project.

### Project Context
- **Description**: ${answers['project_description'] || 'App Build'}
- **Stack**: ${stack}

### Master Build Plan
${buildPlan}

### Task
Write a comprehensive, step-by-step prompt that I can copy and paste into my AI Agent to complete **${phase}**. 
The prompt MUST:
1. Reference specific files from the **File Tree** in the Master Build Plan above.
2. Include specific terminal commands to run.
3. detailed code requirements for this phase.
4. Verification steps (how to check it works).

Output ONLY the prompt text I should paste. Do not add markdown code blocks around the whole thing if possible, or just standard text.`;
};

export const generateTroubleshootPrompt = (persona: Persona, answers: Record<string, string>, error: string, tech: string) => {
    const stack = answers['tech_dev_stack'] || answers['tech_vibe_platform'] || 'Standard Web Stack';

    return `Act as a Senior Debugger. I am hitting an error while building this project.

### Project Context
- **Stack**: ${stack}
- **Tech Design Summary**: ${tech.substring(0, 1000)}...

### The Error
${error}

### Task
Analyze the error and provide a specific solution.
1. Explain what is wrong briefly.
2. Provide the corrected code or terminal commands to fix it.
3. Explain how to prevent it.`;
};