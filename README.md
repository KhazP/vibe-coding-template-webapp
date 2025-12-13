<div align="center">

# ⚡ Vibe-Coding Workflow (Web App)

**The Automated Successor to the [Vibe-Coding Prompt Template](https://github.com/KhazP/vibe-coding-prompt-template).**

Transform any app idea into "Cursor-Ready" code through an automated, interactive UI pipeline powered by Gemini 3 Pro.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Successor](https://img.shields.io/badge/Successor%20to-Vibe%20Coding%20Template-blueviolet)](https://github.com/KhazP/vibe-coding-prompt-template)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%203%20Pro-8E75B2?logo=google-gemini)](https://ai.google.dev/)

[Features](#-features) • [Getting Started](#-getting-started) • [The Workflow](#-the-5-step-workflow) • [Supported Agents](#-supported-ai-agents) • [Tech Stack](#-tech-stack)

</div>

---

## 🎯 What This Does

This is the **Automatic UI Version** of the original Vibe-Coding methodology. 

Instead of manually copy-pasting prompts into ChatGPT or Claude, this web app automates the entire "Context Stack" generation process. It connects directly to Google's Gemini 3 Pro API to conduct research, write specs, and configure your AI code editor in minutes.

| # | Stage | Goal | Automated Output |
|---|-------|------|--------|
| 1️⃣ | **Deep Research** | Validate market & tech landscape | Live Google Search Report |
| 2️⃣ | **Define (PRD)** | Clarify product scope | Comprehensive PRD |
| 3️⃣ | **Tech Design** | Decide how to build | Architecture & Database Schema |
| 4️⃣ | **Agent Config** | Generate AI instructions | `AGENTS.md` + Tool Configs |
| 5️⃣ | **Build & Export** | Generate & test code | Downloadable `.zip` Kit |

---

## ✨ Features

*   **⚡ Automated Pipeline**: No more context switching. The app passes context from Research → PRD → Tech Design automatically.
*   **🧠 Deep Research Agent**: Uses **Gemini 3 Pro + Google Search Grounding** to validate ideas against real-time data.
*   **🎭 3 Distinct Personas**:
    *   **Vibe-Coder**: Story-driven, simple, for non-technical founders.
    *   **Developer**: Concise, technical, architecture-focused.
    *   **Learner**: Educational, explaining the "why" behind technical choices.
*   **🔌 Universal Adapters**: Generates config files for **Cursor, Windsurf, Cline, Aider**, and more.
*   **📦 One-Click Export**: Downloads a ready-to-use `.zip` containing your `docs/` folder and `AGENTS.md`.

---

## 🛠 Getting Started

### Prerequisites
*   Node.js 18+
*   A **Google Gemini API Key** (Get one for free at [aistudio.google.com](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/vibe-coding-webapp.git
    cd vibe-coding-webapp
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Launch & Configure**
    Open `http://localhost:5173`. You will be prompted to enter your Gemini API Key (stored locally in your browser).

---

## 📋 The 5-Step Workflow

### 1️⃣ Deep Research 🔍
**Validate your idea with AI-powered market research.**
*   **Manual way:** Copy prompts, search Google manually, paste results.
*   **Automated way:** Click "Run Research". The app uses Gemini's Grounding tool to browse the live web, analyze competitors, and check library feasibility instantly.

### 2️⃣ Product Requirements (PRD) 📝
**Define exactly what you're building.**
*   The app uses your Research context to draft a professional PRD.
*   Selects features based on your chosen persona (e.g., "MVP-focused" for Vibe Coders).

### 3️⃣ Technical Design 🏗️
**Plan the technical architecture.**
*   Architects the stack (e.g., Next.js vs. Python) based on your budget and skills.
*   Generates database schemas and API endpoints.

### 4️⃣ Generate AI Agent Instructions 🤖
**Create blueprints for your AI coding assistant.**
*   Generates the all-important **`AGENTS.md`** (The Universal Brain).
*   Automatically creates tool-specific rules:
    *   `.cursorrules` (for Cursor)
    *   `.windsurfrules` (for Windsurf)
    *   `.clinerules` (for Cline)
    *   `.aider.conf.yml` (for Aider)

### 5️⃣ Build & Export 📦
**Let AI build your MVP.**
*   Generates a Master Build Plan (`BUILD_PLAN.md`) with a file tree.
*   Provides copy-paste "Kickoff Prompts" for your specific tool.
*   **Download Kit**: Get a zip file with everything structured perfectly for `git init`.

---

## 🤖 Supported AI Agents

The tool generates optimized configuration files for the following tools:

| Tool | Support Level | File Generated |
| :--- | :--- | :--- |
| **Cursor** | ⭐ Native | `.cursorrules` |
| **Windsurf** | ⭐ Native | `.windsurfrules` |
| **Cline** | ⭐ Native | `.clinerules` |
| **Aider** | ⭐ Native | `.aider.conf.yml` |
| **GitHub Copilot** | 🔗 Linked | `.github/copilot-instructions.md` |
| **Claude Code** | 🔄 Adapter | `CLAUDE.md` |
| **Gemini CLI** | 🔄 Adapter | `GEMINI.md` |

---

## 💻 Tech Stack

This web application is built with:

*   **Framework**: React 19 + Vite
*   **Language**: TypeScript
*   **AI Engine**: Google GenAI SDK (`@google/genai`)
*   **Styling**: Tailwind CSS + Framer Motion
*   **Persistence**: LocalStorage (Zero backend required)

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
  <p>Built with ❤️ by the Vibe Coding Community</p>
</div>
