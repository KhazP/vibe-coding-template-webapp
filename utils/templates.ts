
import { Persona } from '../types';
import { FILE_NAMES, TOOL_IDS } from './constants';

/**
 * Sanitizes user input to prevent prompt injection or formatting breakage.
 * Escapes critical Markdown characters (#, **, ```) that could confuse the LLM's structure parsing.
 */
const sanitizeForPrompt = (text: string | undefined) => {
  if (!text) return '';
  return text
    .replace(/^#+/gm, (match) => '\\' + match) // Escape headers at start of line
    .replace(/\*\*/g, '\\*\\*') // Escape bolding
    .replace(/```/g, '\\`\\`\\`'); // Escape code blocks
};

export const generateResearchPrompt = (persona: Persona, answers: Record<string, string>) => {
  const idea = sanitizeForPrompt(answers['project_description']) || 'A new software project';

  if (persona === Persona.VibeCoder) {
    return `## Deep Research Request: ${idea} (Vibe-Coder Persona)

I am a non-technical "Vibe-Coder" building: ${idea}.
I need you to act as my Lead Product Researcher.

### My Inputs
1. **Target Audience**: ${sanitizeForPrompt(answers['research_vibe_who'])}
2. **User Problems**: ${sanitizeForPrompt(answers['research_vibe_problem'])}
3. **Current Solutions**: ${sanitizeForPrompt(answers['research_vibe_existing'])}
4. **Secret Sauce**: ${sanitizeForPrompt(answers['research_vibe_unique'])}
5. **Must-Have Features**: ${sanitizeForPrompt(answers['research_vibe_features'])}
6. **Platform**: ${sanitizeForPrompt(answers['research_vibe_platform'])}
7. **Timeline**: ${sanitizeForPrompt(answers['research_vibe_timeline'])}
8. **Budget**: ${sanitizeForPrompt(answers['research_vibe_budget'])}

### Research Goals
1. **Market Validation**: Analyze the audience and problems.
2. **Competitive Analysis**: Review current solutions and my "Secret Sauce".
3. **Feasibility Check**: Can this be built with ${sanitizeForPrompt(answers['research_vibe_budget'])} on ${sanitizeForPrompt(answers['research_vibe_platform'])}?

Please provide a report in plain English, avoiding jargon.`;
  }

  if (persona === Persona.Developer) {
    return `## Deep Research Request: ${idea} (Developer Persona)

I am a Developer architecting: ${idea}.
I need a rigorous technical validation.

### Context & Directives
1. **Project Focus & Context**: ${sanitizeForPrompt(answers['project_description'])}
2. **Specific Questions**: ${sanitizeForPrompt(answers['research_dev_questions'])}
3. **Stack/API Specifics**: ${sanitizeForPrompt(answers['research_dev_stack_specifics'])}
4. **Decisions to Inform**: ${sanitizeForPrompt(answers['research_dev_decisions'])}
5. **Why Now**: ${sanitizeForPrompt(answers['research_dev_timing'])}
6. **Scope Boundaries**: ${sanitizeForPrompt(answers['research_dev_scope'])}
7. **Research Depth**: ${sanitizeForPrompt(answers['research_dev_depth'])}
8. **Source Priority**: ${sanitizeForPrompt(answers['research_dev_sources'])}
9. **Technical Constraints**: ${sanitizeForPrompt(answers['research_dev_constraints'])}
10. **Broader Context**: ${sanitizeForPrompt(answers['research_dev_context'])}

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
1. **Project Idea & Coding Experience**: ${sanitizeForPrompt(answers['project_description'])}
2. **Problem & User**: ${sanitizeForPrompt(answers['research_mid_problem'])}
3. **Research Topics (Tech & Biz)**: ${sanitizeForPrompt(answers['research_mid_learn'])}
4. **Similar Solutions**: ${sanitizeForPrompt(answers['research_mid_existing'])}
5. **Validation Strategy**: ${sanitizeForPrompt(answers['research_mid_validation'])}
6. **Platform Preference**: ${sanitizeForPrompt(answers['research_mid_platform'])}
7. **Technical Comfort Zone**: ${sanitizeForPrompt(answers['research_mid_comfort'])}
8. **Timeline & Success**: ${sanitizeForPrompt(answers['research_mid_timeline'])}
9. **Budget**: ${sanitizeForPrompt(answers['research_mid_budget'])}

### Research Goals
1. **Educational Path**: How can I build this while learning ${sanitizeForPrompt(answers['research_mid_comfort'])}?
2. **Market & Tech Check**: specific advice for ${sanitizeForPrompt(answers['research_mid_platform'])}.
3. **Validation**: Feedback on my validation strategy.

Explain complex concepts but treat me like an intelligent student.`;
};

export const getPRDSystemInstruction = () => "You are an expert Product Manager. You write clear, comprehensive Product Requirements Documents (PRDs) suitable for development. You prioritize clarity, user value, and technical feasibility.";

export const generatePRDPrompt = (persona: Persona, answers: Record<string, string>, researchContext: string) => {
  const name = sanitizeForPrompt(answers['prd_vibe_name'] || answers['prd_dev_name'] || answers['prd_mid_name']) || 'The App';

  if (persona === Persona.VibeCoder) {
    return `Create a Narrative-Driven PRD for ${name}.

### User Inputs (Vibe-Coder)
1. **One-Sentence Problem**: ${sanitizeForPrompt(answers['project_description'])}
2. **Launch Goal**: ${sanitizeForPrompt(answers['prd_vibe_goal'])}
3. **Users**: ${sanitizeForPrompt(answers['prd_vibe_users'])}
4. **User Journey Story**: ${sanitizeForPrompt(answers['prd_vibe_story'])}
5. **Must-Have Features**: ${sanitizeForPrompt(answers['prd_vibe_features'])}
6. **Deferred Features**: ${sanitizeForPrompt(answers['prd_vibe_non_features'])}
7. **Success Metric**: ${sanitizeForPrompt(answers['prd_vibe_metric'])}
8. **Vibe/Style**: ${sanitizeForPrompt(answers['prd_vibe_vibe'])}
9. **Constraints**: ${sanitizeForPrompt(answers['prd_vibe_constraints'])}

### Research Context
${researchContext}

### Output Requirements
Generate a PRD that focuses on the *Story* and *Vibe*.
1. **Executive Summary**: The vision for ${name}.
2. **User Journey Map**: Step-by-step flow based on the story.
3. **Functional Requirements**: Extracted from the narrative.
4. **UI/UX Guidelines**: Based on the "${sanitizeForPrompt(answers['prd_vibe_vibe'])}" vibe.
5. **Success Definition**: Based on ${sanitizeForPrompt(answers['prd_vibe_metric'])}.

Keep it simple, inspiring, and ready for a developer/AI to build.`;
  }

  if (persona === Persona.Developer) {
    return `Create a Technical PRD for ${name}.

### User Inputs (Developer)
1. **One-Liner**: ${sanitizeForPrompt(answers['prd_dev_oneliner'])}
2. **Goal**: ${sanitizeForPrompt(answers['prd_dev_goal'])}
3. **Audience**: ${sanitizeForPrompt(answers['prd_dev_audience'])}
4. **User Stories**: ${sanitizeForPrompt(answers['prd_dev_stories'])}
5. **Features (MoSCoW)**: ${sanitizeForPrompt(answers['prd_dev_features'])}
6. **Metrics**: ${sanitizeForPrompt(answers['prd_dev_metrics'])}
7. **Tech/UX Requirements**: ${sanitizeForPrompt(answers['prd_dev_tech'])}
8. **Compliance**: ${sanitizeForPrompt(answers['prd_dev_compliance'])}
9. **Risks**: ${sanitizeForPrompt(answers['prd_dev_risks'])}
10. **Business Constraints**: ${sanitizeForPrompt(answers['prd_dev_biz'])}

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
1. **Purpose**: ${sanitizeForPrompt(answers['prd_mid_purpose'])}
2. **Goal**: ${sanitizeForPrompt(answers['prd_mid_goal'])}
3. **Users**: ${sanitizeForPrompt(answers['prd_mid_users'])}
4. **Flow**: ${sanitizeForPrompt(answers['prd_mid_flow'])}
5. **Core Features**: ${sanitizeForPrompt(answers['prd_mid_features'])}
6. **Future Features**: ${sanitizeForPrompt(answers['prd_mid_non_features'])}
7. **Metrics**: ${sanitizeForPrompt(answers['prd_mid_metric'])}
8. **Design**: ${sanitizeForPrompt(answers['prd_mid_design'])}
9. **Constraints**: ${sanitizeForPrompt(answers['prd_mid_constraints'])}

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
    const name = sanitizeForPrompt(answers['prd_vibe_name'] || answers['prd_dev_name'] || answers['prd_mid_name']) || 'The App';
    
    if (persona === Persona.VibeCoder) {
        return `Create a "Vibe-Code" Tech Design for ${name}.

### User Inputs (Vibe-Coder)
1. **Platform**: ${sanitizeForPrompt(answers['tech_vibe_platform'])}
2. **Coding Approach**: ${sanitizeForPrompt(answers['tech_vibe_coding'])}
3. **Budget**: ${sanitizeForPrompt(answers['tech_vibe_budget'])}
4. **Timeline**: ${sanitizeForPrompt(answers['tech_vibe_timeline'])}
5. **Fears/Risks**: ${sanitizeForPrompt(answers['tech_vibe_worry'])}
6. **Existing Tools**: ${sanitizeForPrompt(answers['tech_vibe_tools'])}
7. **Priority**: ${sanitizeForPrompt(answers['tech_vibe_priority'])}

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
1. **Platform Strategy**: ${sanitizeForPrompt(answers['tech_dev_platform'])}
2. **Preferred Stack**: ${sanitizeForPrompt(answers['tech_dev_stack'])}
3. **Architecture**: ${sanitizeForPrompt(answers['tech_dev_architecture'])}
4. **State Management**: ${sanitizeForPrompt(answers['tech_dev_state'])}
5. **Components**: ${sanitizeForPrompt(answers['tech_dev_components'])}
6. **AI Strategy**: ${sanitizeForPrompt(answers['tech_dev_ai'])}
7. **Workflow**: ${sanitizeForPrompt(answers['tech_dev_workflow'])}
8. **Performance**: ${sanitizeForPrompt(answers['tech_dev_perf'])}
9. **Security**: ${sanitizeForPrompt(answers['tech_dev_security'])}

### PRD Context
${prdContext}

### Output Requirements
Comprehensive Engineering Spec:
1. **System Architecture**: Diagrammatic description.
2. **Tech Stack & Libraries**: With justification.
3. **Database Schema**: ERD or Schema definition (SQL/NoSQL).
4. **API Design**: Key endpoints and protocols.
5. **Security & Auth**: Implementation details.
6. **Deployment & CI/CD**: Pipeline strategy.
`;
    }

    // In-Between / Learner
    return `Create an Educational Tech Design for ${name}.

### User Inputs (Learner)
1. **Platform**: ${sanitizeForPrompt(answers['tech_mid_platform'])}
2. **Comfort Zone**: ${sanitizeForPrompt(answers['tech_mid_comfort'])}
3. **Approach**: ${sanitizeForPrompt(answers['tech_mid_approach'])}
4. **Complexity**: ${sanitizeForPrompt(answers['tech_mid_complexity'])}
5. **Budget**: ${sanitizeForPrompt(answers['tech_mid_budget'])}
6. **AI Preference**: ${sanitizeForPrompt(answers['tech_mid_ai'])}
7. **Timeline**: ${sanitizeForPrompt(answers['tech_mid_timeline'])}

### PRD Context
${prdContext}

### Output Requirements
A Spec that teaches *how* to build it.
1. **Chosen Stack**: Why these tools match the user's comfort zone.
2. **Architecture Explained**: Concept of Frontend vs Backend for this app.
3. **Data Model**: Schema with explanation of relationships.
4. **Key Logic**: How the main features will work under the hood.
5. **Learning Resources**: Links or terms to search for.

Tone: Encouraging and educational.`;
};

// --- Missing Functions ---

export const getAgentSystemInstruction = () => "You are an expert AI configuration specialist. You create optimized system instructions and configuration files for AI coding agents to ensure they follow project guidelines and persona preferences.";

export const generateAgentsMdPrompt = (persona: Persona, answers: Record<string, string>, prd: string, tech: string) => {
  return `Generate a comprehensive AGENTS.md file for the project.

### Project Context
- **Name**: ${sanitizeForPrompt(answers['project_description']) || 'The App'}
- **Persona**: ${persona} (Affects tone and detail level)

### Inputs
**PRD Summary**:
${prd.substring(0, 2000)}... (truncated)

**Tech Stack**:
${tech.substring(0, 2000)}... (truncated)

### Requirements for AGENTS.md
The file should act as the "Universal Brain" for any AI agent (Cursor, Windsurf, Aider, etc.) working on this project.
It must include:
1. **Project Mission**: One sentence summary.
2. **Tech Stack & Standards**: Strict rules on what to use.
3. **Coding Rules**: Formatting, naming conventions, error handling.
4. **Project Structure**: High-level folder structure.
5. **Persona Instructions**: specific to ${persona} (e.g. if VibeCoder, explain code more; if Developer, be concise).

Format the output as a single valid Markdown file starting with # AGENTS.md`;
};

export const generateToolConfig = (
  toolId: string, 
  projectName: string, 
  persona: Persona, 
  answers: Record<string, string>,
  settings: { claudeAdapterMode: boolean, geminiAdapterMode: boolean, antigravityAdapterMode: boolean }
) => {
  const basePrompt = `Project: ${sanitizeForPrompt(projectName)}\nPersona: ${persona}`;
  
  switch (toolId) {
    case TOOL_IDS.CURSOR:
      return `# .cursorrules\n\n# This project uses AGENTS.md as the source of truth.\n# Always read AGENTS.md before starting any task.\n\nconst fs = require('fs');\nif (fs.existsSync('AGENTS.md')) {\n  console.log("Loaded AGENTS.md context");\n}`;
    case TOOL_IDS.WINDSURF:
      return `# .windsurfrules\n\n@AGENTS.md\n\n# Windsurf will automatically index the above file.`;
    case TOOL_IDS.AIDER:
      return `read: [AGENTS.md]\n`;
    case TOOL_IDS.CLINE:
        return `You are Cline. Please strictly follow the project rules defined in AGENTS.md in the root directory.`;
    case TOOL_IDS.GEMINI_CLI:
        if (settings.geminiAdapterMode) {
            return `You are a Gemini CLI agent working on ${sanitizeForPrompt(projectName)}. Read AGENTS.md for context.`;
        }
        return `You are a Gemini CLI agent. Context: ${basePrompt}.`;
    case TOOL_IDS.CLAUDE:
        if (settings.claudeAdapterMode) {
             return `You are Claude Code. Please use AGENTS.md as your primary context file.`;
        }
        return `You are Claude Code. Project: ${sanitizeForPrompt(projectName)}.`;
    case TOOL_IDS.ANTIGRAVITY:
        return `Project: ${sanitizeForPrompt(projectName)}. Context: AGENTS.md.`;
    default:
      return `# Config for ${toolId}\n\nSee AGENTS.md`;
  }
};

export const getBuildPlanSystemInstruction = () => "You are an expert Technical Project Manager. You break down complex software projects into a step-by-step, file-by-file build plan that an AI agent can execute.";

export const generateBuildPlanPrompt = (persona: Persona, answers: Record<string, string>, prd: string, tech: string) => {
    return `Create a Master Build Plan (BUILD_PLAN.md) for the project.

### Context
PRD and Tech Design are provided.
Persona: ${persona}

### Output Requirements
1. **File Tree**: A complete ASCII tree of the project structure.
2. **Phase 1: Scaffolding**: Setup commands and base files.
3. **Phase 2: Core Features**: List of files to create/edit for MVP.
4. **Phase 3: Polish**: UI/UX and Testing.

Format as a Markdown file.`;
};

export const generatePhasePrompt = (persona: Persona, answers: Record<string, string>, buildPlan: string, phase: string) => {
    return `Generate a specific prompt for an AI agent to execute **${phase}**.

### Context
Build Plan:
${buildPlan}

### Goal
Write a prompt that I can copy-paste into Cursor/Windsurf to execute ${phase}.
The prompt should:
1. Reference specific files from the file tree.
2. List the exact steps to take.
3. Include any specific tech stack constraints.

Return ONLY the prompt text.`;
};

export const generateTroubleshootPrompt = (persona: Persona, answers: Record<string, string>, error: string, tech: string) => {
    return `I am encountering an error while building the project.

### Tech Stack
${tech}

### Error Message / Issue
${error}

### Request
Analyze the error and provide a specific fix (code block or terminal command). Explain why it happened briefly.`;
};

export const getRefineSystemInstruction = () => "You are an expert Technical Editor. You improve and refine technical documentation based on specific user instructions. You MUST always output valid Markdown. Maintain the original structure and formatting styles.";

export const generateRefinePrompt = (currentContent: string, instruction: string) => {
    // Truncate to avoid excessive tokens that exceed output limits anyway
    const MAX_CONTEXT_CHARS = 25000; // ~6k tokens. Enough context, keeps input manageable.
    let context = currentContent;
    if (context.length > MAX_CONTEXT_CHARS) {
        context = context.substring(0, MAX_CONTEXT_CHARS) + "\n\n... [Content truncated for refinement context] ...";
    }

    return `Original Content:
${context}

Instruction:
${instruction}

Please rewrite the content to address the instruction. Ensure the output is valid Markdown. Maintain the original markdown format (headers, lists, code blocks).`;
};

export const generateInlineRefinePrompt = (selection: string, instruction: string) => {
    return `Selection:
${selection}
    
Instruction: ${instruction}

Rewrite the selection based on the instruction. Return ONLY the rewritten text in valid Markdown. Preserve any existing markdown styling (bold, code, links) unless asked to remove it.`;
};
