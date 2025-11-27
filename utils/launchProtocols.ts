


import { TOOL_IDS } from './constants';

export const LAUNCH_PROTOCOL_INDEX = `# Vibe-Coding Launch Protocols Index

| Service | Time | Integration | Value Prop |
| :--- | :--- | :--- | :--- |
| **Cursor** | ≈5 min | Native | Native AGENTS.md support with zero config. |
| **Cline** | ≈5 min | Native | Open-source VS Code extension with deep agentic capabilities. |
| **Windsurf** | ≈10 min | Native | "Flow" state IDE that reads rules automatically. |
| **Aider** | ≈10 min | Import | Powerful CLI pair programmer for terminal lovers. |
| **GitHub Copilot** | ≈10 min | Linking | Ubiquitous AI completion, now with agentic workspace context. |
| **Gemini CLI** | ≈5 min | Import | Direct access to Google's 2M context window models. |
| **Claude Code** | ≈10 min | Import | Anthropic's official CLI tool for deep coding tasks. |
| **Google Antigravity**| ≈15 min | Linking | Enterprise-grade agentic development platform. |
| **Lovable** | ≈2 min | Prompt | Full-stack web app builder from natural language. |
| **v0** | ≈2 min | Prompt | Generative UI builder by Vercel. |

> **Note:** "Native" means the tool reads \`AGENTS.md\` automatically. "Import" or "Linking" requires a one-time configuration step.
`;

export const LAUNCH_PROTOCOLS: Record<string, string> = {
  [TOOL_IDS.CURSOR]: `### Cursor Quick Start Guide

**Time Estimate:** 5 minutes

#### 1. Installation
Install the CLI via the one-line command (Mac/Linux) or download from cursor.com.
\`\`\`bash
sh -c "curl https://cursor.com/install -fsS | bash"
\`\`\`
- **Requirements:** macOS / Windows / Linux
- **Verification:** Run \`cursor-agent --version\` in your terminal.

#### 2. Setup AGENTS.md Integration
Cursor natively supports Vibe-Coding.
- **File Location:** Project root.
- **Configuration:** Zero config required. Cursor scans the root for this file.
- **Verification:** Open Cursor's "Composer" (Cmd+I) and type "Read rules". It should reference the file.

#### 3. First Prompt
Open Composer (Cmd+I) or Chat (Cmd+L) and run:
\`\`\`text
Read AGENTS.md. Scaffold the project structure based on the Tech Design.
\`\`\`
- **Expect:** Cursor will read the file and propose a file tree creation plan.

#### 4. Context & Workflow
- **Reference:** You don't always need to type "Read AGENTS.md", but it helps for big tasks.
- **Updates:** If you edit \`AGENTS.md\`, start a new chat session to refresh context.
- **Tip:** Use \`@AGENTS.md\` in chat to explicitly force attention to it.

#### 5. Links & Resources
- **Official Docs:** [docs.cursor.com/rules](https://docs.cursor.com)
- **Community:** [forum.cursor.com](https://forum.cursor.com)
`,

  [TOOL_IDS.CLINE]: `### Cline Quick Start Guide

**Time Estimate:** 5 minutes

#### 1. Installation
Install the CLI globally via npm.
\`\`\`bash
npm install -g cline && cline auth
\`\`\`
- **Requirements:** Node.js >= 20, VS Code
- **Compatibility:** macOS / Linux / Windows (WSL recommended)

#### 2. Setup AGENTS.md Integration
Cline automatically detects \`AGENTS.md\` in the workspace root.
- **File Location:** Project root.
- **Configuration:** No extra config needed. Cline treats it as persistent context.
- **Verification:** Start a task; Cline will often mention "Read project context" in its thought process.

#### 3. First Prompt
Run this in your terminal or VS Code extension:
\`\`\`text
cline "Read AGENTS.md. Start Phase 1 of the build."
\`\`\`
- **Expect:** Cline will analyze the file and suggest terminal commands to run.

#### 4. Context & Workflow
- **Memory:** Cline manages 3 layers of context. \`AGENTS.md\` sits in the persistent layer.
- **Multi-file:** You can also use a \`.clinerules\` folder, but \`AGENTS.md\` is the Vibe-Coding standard.

#### 5. Links & Resources
- **Official Docs:** [docs.cline.dev](https://docs.cline.dev)
- **Troubleshooting:** GitHub Issues for Cline
`,

  [TOOL_IDS.AIDER]: `### Aider Quick Start Guide

**Time Estimate:** 10 minutes

#### 1. Installation
Install via pip (Python).
\`\`\`bash
python -m pip install aider-chat
\`\`\`
- **Requirements:** Python 3.8+, Git
- **Compatibility:** All major OS.

#### 2. Setup AGENTS.md Integration
Aider requires explicit file loading or configuration.
- **File Location:** Project root.
- **Configuration:** Create/Edit \`.aider.conf.yml\` and add:
  \`read: [AGENTS.md]\`
- **Verification:** Launch aider; it should list \`AGENTS.md\` in the "Read files:" section.

#### 3. First Prompt
Launch Aider with the file (if not in config):
\`\`\`bash
aider --read AGENTS.md
\`\`\`
Then in the chat:
\`\`\`text
Scaffold the project structure based on the documentation.
\`\`\`

#### 4. Context & Workflow
- **Commands:** Use \`/read AGENTS.md\` inside the chat if you forgot to load it.
- **Tip:** Aider is aggressive with code changes. Commit often (Aider does this automatically by default).

#### 5. Links & Resources
- **Official Docs:** [aider.chat](https://aider.chat)
- **Discord:** Aider Discord Community
`,

  [TOOL_IDS.WINDSURF]: `### Windsurf Quick Start Guide

**Time Estimate:** 10 minutes

#### 1. Installation
Download the installer from Codeium.
- **URL:** codeium.com/windsurf
- **Requirements:** Codeium Account
- **Compatibility:** macOS / Windows / Linux

#### 2. Setup AGENTS.md Integration
Windsurf's "Cascade" engine reads rule files automatically.
- **File Location:** Project root.
- **Configuration:** Recent updates (Oct 2025) added native support for \`AGENTS.md\`.
- **Legacy Fallback:** If it fails, copy content to \`.windsurf/rules/main.md\`.

#### 3. First Prompt
Open the Cascade panel (right sidebar) and type:
\`\`\`text
@AGENTS.md Initialize the project stack.
\`\`\`
- **Expect:** Cascade will index the file and propose code generation.

#### 4. Context & Workflow
- **Global Rules:** User-specific rules live in \`~/.codeium/windsurf/memories/\`.
- **Project Rules:** \`AGENTS.md\` is project-specific. Keep it in the root.

#### 5. Links & Resources
- **Official Docs:** [codeium.com/windsurf](https://codeium.com)
`,

  [TOOL_IDS.COPILOT]: `### GitHub Copilot Quick Start Guide

**Time Estimate:** 10 minutes

#### 1. Installation
Install the VS Code Extension and (optionally) the CLI.
\`\`\`bash
npm install -g @github/copilot
\`\`\`
- **Requirements:** GitHub Copilot Subscription
- **Compatibility:** VS Code, CLI

#### 2. Setup AGENTS.md Integration
Copilot requires linking or workspace context settings.
- **Configuration:** In VS Code settings, enable \`chat.useAgentsMdFile\` if available, or simply open \`AGENTS.md\` so it is in the active context.
- **Linking:** Create \`.github/copilot-instructions.md\` and reference \`../AGENTS.md\`.

#### 3. First Prompt
In VS Code Chat View:
\`\`\`text
@workspace Read AGENTS.md. Let's start the build.
\`\`\`
- **Expect:** Copilot will scan the workspace files. Using \`@workspace\` is critical.

#### 4. Context & Workflow
- **Context Window:** Copilot's context is smaller than Gemini/Claude. Keep \`AGENTS.md\` concise or use \`@workspace\` frequently.
- **CLI:** For CLI usage: \`copilot --context AGENTS.md "Explain this code"\`

#### 5. Links & Resources
- **Official Docs:** [docs.github.com/copilot](https://docs.github.com/en/copilot)
`,

  [TOOL_IDS.GEMINI_CLI]: `### Gemini CLI Quick Start Guide

**Time Estimate:** 5 minutes

#### 1. Installation
Install via npm.
\`\`\`bash
npm install -g @google/gemini-cli
\`\`\`
- **Requirements:** Node.js >= 18, Google API Key
- **Env Var:** Set \`GEMINI_API_KEY\` in your terminal.

#### 2. Setup Project Context
Gemini CLI uses \`GEMINI.md\` as its brain.
- **File Location:** Project root.
- **Action:** Place the generated \`GEMINI.md\` (and \`AGENTS.md\`) in your project root.
- **Verification:** Run \`gemini context\`; it should show the imported content.

#### 3. First Prompt
Run in terminal:
\`\`\`bash
gemini prompt "Read AGENTS.md. Generate the scaffold commands."
\`\`\`

#### 4. Context & Workflow
- **Imports:** The \`@filename\` syntax allows modular context.
- **Piping:** You can pipe file content too: \`cat AGENTS.md | gemini prompt "Summarize this"\`

#### 5. Links & Resources
- **GitHub:** [github.com/google/gemini-cli](https://github.com/google/gemini-cli)
`,

  [TOOL_IDS.CLAUDE]: `### Claude Code Quick Start Guide

**Time Estimate:** 10 minutes

#### 1. Installation
Install the official tool.
\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`
- **Requirements:** Node.js, Anthropic Account
- **Compatibility:** macOS/Linux (WSL for Windows)

#### 2. Setup Project Context
Claude Code looks for \`CLAUDE.md\`.
- **File Location:** Project root.
- **Action:** Place the generated \`CLAUDE.md\` (and \`AGENTS.md\`) in your project root.
- **Verification:** Claude will confirm context loading on startup.

#### 3. First Prompt
Start the REPL:
\`\`\`bash
claude
\`\`\`
Then type:
\`\`\`text
Read AGENTS.md. Scaffold the project.
\`\`\`

#### 4. Context & Workflow
- **Persistence:** Claude remembers context within a session nicely.
- **Cost:** Monitor token usage, as large contexts add up with Claude Opus/Sonnet.

#### 5. Links & Resources
- **Docs:** [claude.ai/docs](https://docs.anthropic.com)
`,

  [TOOL_IDS.ANTIGRAVITY]: `### Google Antigravity Quick Start Guide

**Time Estimate:** 15 minutes

#### 1. Installation
Install the desktop IDE or Linux package.
- **Linux:** \`sudo apt install anti-gravity\`
- **Mac/Win:** Download installer from Google.
- **Requirements:** Google Account, Vertex AI access.

#### 2. Setup Project Context
Google Antigravity uses \`GEMINI.md\` to understand your project.
- **File Location:** Project root.
- **Action:** Place the generated \`GEMINI.md\` (and \`AGENTS.md\`) in your project root.
- **Note:** Ensure the IDE is pointed to the folder containing these files.

#### 3. First Prompt
In the Agent panel:
\`\`\`text
Using the project knowledge base, implement the MVP scaffold.
\`\`\`

#### 4. Context & Workflow
- **Updates:** If you change \`AGENTS.md\` locally, Antigravity picks up changes via \`GEMINI.md\`.
- **Modes:** Use "Agent-Assisted" mode for the best balance of control.

#### 5. Links & Resources
- **Blog:** [developers.googleblog.com](https://developers.googleblog.com)
`,

  [TOOL_IDS.LOVABLE]: `### Lovable Quick Start Guide

**Time Estimate:** 2 minutes

#### 1. Installation
No installation required. Web-based builder.
- **URL:** [lovable.dev](https://lovable.dev)

#### 2. Setup AGENTS.md Integration
Use "Custom Knowledge" for project rules.
- **Steps:**
  1. Open your Lovable Project.
  2. Go to Settings -> Custom Knowledge.
  3. Paste the contents of \`AGENTS.md\` there.

#### 3. First Prompt
In the chat interface:
\`\`\`text
I have updated the custom knowledge with my Tech Design. Please rebuild the main layout to match those requirements.
\`\`\`

#### 4. Context & Workflow
- **Assets:** You can upload design screenshots along with text rules.
- **Sync:** Lovable is separate from your local files until you export code.

#### 5. Links & Resources
- **Docs:** [docs.lovable.dev](https://docs.lovable.dev)
`,

  [TOOL_IDS.V0]: `### v0 Quick Start Guide

**Time Estimate:** 2 minutes

#### 1. Installation
No installation required. Web-based builder by Vercel.
- **URL:** [v0.dev](https://v0.dev)

#### 2. Setup AGENTS.md Integration
Use "Project Instructions".
- **Steps:**
  1. Create a new chat/project.
  2. Click "Project Instructions" (or Settings).
  3. Paste \`AGENTS.md\` content or upload the file directly in the "Sources" tab.

#### 3. First Prompt
\`\`\`text
Based on the attached AGENTS.md, generate the dashboard UI.
\`\`\`

#### 4. Context & Workflow
- **Frameworks:** v0 defaults to Next.js/Tailwind/Shadcn. Ensure your \`AGENTS.md\` aligns with this stack for best results.

#### 5. Links & Resources
- **Docs:** [v0.app/docs](https://v0.app/docs)
`
};