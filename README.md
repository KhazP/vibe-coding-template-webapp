<div align="center">

# ⚡ Vibe-Coding Workflow

**The Automated Successor to the [Vibe-Coding Prompt Template](https://github.com/KhazP/vibe-coding-prompt-template).**

Transform any app idea into "Cursor-Ready" code through an automated, interactive UI pipeline powered by your choice of AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Successor](https://img.shields.io/badge/Successor%20to-Vibe%20Coding%20Template-blueviolet)](https://github.com/KhazP/vibe-coding-prompt-template)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

[Features](#-features) • [Getting Started](#-getting-started) • [The Workflow](#-the-5-step-workflow) • [AI Providers](#-supported-ai-providers) • [Agents](#-supported-ai-agents)

</div>

---

## 🎯 What This Does

This is the **Automated UI Version** of the original Vibe-Coding methodology. 

Instead of manually copy-pasting prompts into ChatGPT or Claude, this web app automates the entire "Context Stack" generation process. Connect to your preferred AI provider—**Gemini, OpenAI, Claude, or 200+ models via OpenRouter**—to conduct research, write specs, and configure your AI code editor in minutes.

| # | Stage | Goal | Automated Output |
|---|-------|------|------------------|
| 1️⃣ | **Deep Research** | Validate market & tech landscape | Live Web Search Report |
| 2️⃣ | **Define (PRD)** | Clarify product scope | Comprehensive PRD |
| 3️⃣ | **Tech Design** | Decide how to build | Architecture & Database Schema |
| 4️⃣ | **Agent Config** | Generate AI instructions | `AGENTS.md` + Tool Configs |
| 5️⃣ | **Build & Export** | Generate & test code | Downloadable `.zip` Kit |

---

## ✨ Features

### 🤖 Multi-Provider AI Support
- **Google Gemini** – Gemini 3 Pro, Gemini 2.5 Pro/Flash with thinking budgets
- **OpenAI** – GPT-5.2 Pro/Thinking/Instant, GPT-5 Mini/Nano with reasoning effort
- **Anthropic Claude** – Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
- **OpenRouter** – Access 200+ models from a single API key

### 🔬 Deep Research with Grounding
- Real-time web search using **Google Search Grounding** (Gemini) or **OpenAI Deep Research**
- Automatic source citation with clickable references
- Market validation and competitor analysis

### 🎭 3 Distinct Personas
| Persona | Best For |
|---------|----------|
| **Vibe-Coder** | Story-driven, simple explanations for non-technical founders |
| **Developer** | Concise, technical, architecture-focused specs |
| **Learner** | Educational approach, explaining the "why" behind choices |

### ⚙️ Advanced Settings
- **Easy Mode** – One-click presets (Fast, Balanced, Thorough)
- **Expert Mode** – Fine-tune temperature, top-k/p, max tokens, reasoning budgets
- **Custom Instructions** – Add global context to all generations
- **Cost Tracking** – Real-time token usage and estimated costs

### 📱 Progressive Web App
- Install on desktop or mobile
- Offline-capable with service worker caching
- Automatic update prompts

### 📦 One-Click Export
- Downloads a ready-to-use `.zip` containing your `docs/` folder
- Includes all agent configs and the universal `AGENTS.md`
- Launch protocol checklists for deployment

### 🔐 Privacy & Security
- **Your API keys stay with you** – stored only in your browser's [localStorage](utils/providerStorage.ts#L67-L83)
- **Zero backend** – all AI calls go directly from your browser to the provider
- **We never see your keys** – no server, no database, no tracking

### 🗄️ Admin Dashboard Data
The optional admin dashboard uses **Supabase** to store:
- Admin authentication credentials only
- Aggregate, anonymized usage metrics (e.g., total generations count)

**Never stored:** Your API keys, prompts, generated content, or any personal data.  
👉 [View the source code](context/ProjectContext.tsx#L765-L776) to verify exactly what data is sent.

---

##  The 5-Step Workflow

### 1️⃣ Deep Research 🔍
**Validate your idea with AI-powered market research.**
- Uses Gemini's Grounding or OpenAI Deep Research to browse the live web
- Analyzes competitors, validates feasibility, checks library compatibility
- Returns structured research with source citations

### 2️⃣ Product Requirements (PRD) 📝
**Define exactly what you're building.**
- Drafts a professional PRD using your research context
- Tailored output based on your chosen persona
- Covers user stories, features, constraints, and success metrics

### 3️⃣ Technical Design 🏗️
**Plan the technical architecture.**
- Recommends stack based on your skills and budget
- Generates database schemas and API endpoint designs
- Creates component hierarchies and state management plans

### 4️⃣ Generate AI Agent Instructions 🤖
**Create blueprints for your AI coding assistant.**
- Generates the universal **`AGENTS.md`** brain file
- Creates tool-specific configurations for your chosen editors
- Includes coding standards, file patterns, and project context

### 5️⃣ Build & Export 📦
**Package everything for your AI code editor.**
- Generates a Master Build Plan with file tree
- Provides copy-paste "Kickoff Prompts" for your specific tool
- **Download Kit** – Get a structured zip ready for `git init`

---

## 🔌 Supported AI Providers

| Provider | Models | Special Features |
|:---------|:-------|:-----------------|
| **Google Gemini** | Gemini 3 Pro, 2.5 Pro/Flash | Thinking budgets, Google Search grounding |
| **OpenAI** | GPT-5.2 Pro/Thinking, GPT-5 Mini/Nano | Reasoning effort, Deep Research |
| **Anthropic** | Claude Opus/Sonnet/Haiku 4.5 | Extended thinking |
| **OpenRouter** | 200+ models | Unified API, model routing |

---

## 🤖 Supported AI Agents

The tool generates optimized configuration files for the following editors:

| Tool | Support Level | File Generated |
|:-----|:--------------|:---------------|
| **Cursor** | ⭐ Native | `.cursor/rules/` |
| **Windsurf** | ⭐ Native | `.windsurfrules` |
| **Cline** | ⭐ Native | `.clinerules` |
| **Aider** | ⭐ Native | `.aider.conf.yml` |
| **GitHub Copilot** | 🔗 Linked | `.github/copilot-instructions.md` |
| **Claude Code** | 🔄 Adapter | `CLAUDE.md` |
| **Gemini CLI** | 🔄 Adapter | `GEMINI.md` |
| **Antigravity** | 🔄 Adapter | Agent workflows |

---

## 💻 Tech Stack

| Category | Technology |
|:---------|:-----------|
| **Framework** | React 18 + Vite 6 |
| **Language** | TypeScript 5.8 |
| **AI SDKs** | `@google/genai`, `openai`, `@anthropic-ai/sdk` |
| **Styling** | Vanilla CSS + Framer Motion |
| **PWA** | Vite PWA Plugin + Workbox |
| **Persistence** | LocalStorage (zero backend) |
| **Admin Dashboard** | [Supabase](#-admin-dashboard-data) (Auth, PostgreSQL, RLS) |
| **Deployment** | Vercel-ready with optimized caching |

---

## 🤝 Contributing

PRs & issues welcome! This is a community project evolved from the original [Vibe-Coding Prompt Template](https://github.com/KhazP/vibe-coding-prompt-template).

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Released under the [MIT License](LICENSE).

---

**The best time to build your idea was yesterday.**  
**The second best time is now.** 🚀

<div align="center">
  <p>Built with ❤️ by the Alp Yalay</p>
</div>
