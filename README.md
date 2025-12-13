
<div align="center">

# ⚡ Vibe-Coding Workflow

**From Idea to "Cursor-Ready" Context in Minutes.**  
An automated pipeline for generating Deep Research, PRDs, Technical Architectures, and Agent Configurations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%203%20Pro-8E75B2?logo=google-gemini)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

[Features](#-features) • [Getting Started](#-getting-started) • [The Workflow](#-the-workflow) • [Supported Agents](#-supported-ai-agents) • [Tech Stack](#-tech-stack)

</div>

---

## 🚀 What is this?

**Vibe-Coding Workflow** is a specialized tool designed to solve the "Blank Canvas Paralysis" when working with AI coding agents (like Cursor, Windsurf, or Cline).

AI Agents are powerful, but they hallucinate when they lack context. This tool automates the creation of the **"Perfect Context Stack"**:
1.  **Deep Research**: Validates your idea against real-time data (Google Search Grounding).
2.  **Product Specs (PRD)**: Defines *what* to build based on your persona.
3.  **Tech Design**: Defines *how* to build it (Stack, DB Schema, API).
4.  **Agent Configuration**: Generates the **`AGENTS.md`** "Universal Brain" and tool-specific rules (e.g., `.cursorrules`).

Whether you are a **"Vibe Coder"** (Idea-first, low-code) or a **Senior Developer** (Architecture-first), this tool adapts the output to your style.

---

## ✨ Features

*   **🎭 3 Distinct Personas**:
    *   **Vibe-Coder**: Focuses on the "Story", user journey, and simplicity.
    *   **Developer**: Focuses on architecture, scalability, and edge cases.
    *   **Learner**: Focuses on educational breakdowns and "why" decisions are made.
*   **🧠 Deep Research Agent**: Uses Google Gemini 3 Pro with Search Grounding to analyze competitors, validate tech stacks, and find real-time libraries.
*   **📄 Artifact Generation**: automatically writes comprehensive Markdown files for PRDs and Technical Design Documents.
*   **🤖 Universal Agent Config**: Generates a standardized `AGENTS.md` file that serves as a single source of truth for any AI tool.
*   **🔌 Tool Adapters**: One-click generation of configuration files for:
    *   Cursor (`.cursorrules`)
    *   Windsurf (`.windsurfrules`)
    *   Cline (`.clinerules`)
    *   Aider (`.aider.conf.yml`)
    *   GitHub Copilot (`copilot-instructions.md`)
*   **⚡ Build Planner**: Breaks down the implementation into a step-by-step "Master Build Plan" with specific terminal commands for your agent.
*   **📦 One-Click Export**: Zips the entire documentation kit ready to be dropped into your IDE.

---

## 🛠 Getting Started

### Prerequisites
*   Node.js 18+
*   A **Google Gemini API Key** (Get one for free at [aistudio.google.com](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/vibe-coding-workflow.git
    cd vibe-coding-workflow
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Enter your API Key**
    The app will prompt you for your Gemini API Key on launch. This key is stored **locally** in your browser's LocalStorage.

---

## 🌊 The Workflow

The application guides you through a 5-step pipeline:

### 1. Research 🔍
We run a deep analysis of your idea. You choose between "Standard" (Gemini Pro + Search) or "Deep Research" (Autonomous Agent).
*   *Output*: Market analysis, competitor breakdown, and tech stack validation.

### 2. Define (PRD) 📝
We generate a Product Requirements Document.
*   *Output*: User Stories, Core Features (MVP), and Success Metrics.

### 3. Tech Design 🏗️
We architect the solution.
*   *Output*: Database Schema, API Endpoints, Component Structure, and Security protocols.

### 4. Agent Config 🤖
We generate the "Brain" for your AI code editor.
*   *Output*: `AGENTS.md` + Tool-specific config files (e.g., `.cursorrules`).

### 5. Build & Export 📦
We generate a step-by-step execution plan and zip it all up.
*   *Output*: A `.zip` file containing your documentation folder structure, ready for `git init`.

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

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS, Framer Motion (Animations)
*   **AI**: Google GenAI SDK (`@google/genai`)
    *   *Models*: Gemini 3 Pro Preview (Reasoning), Gemini 2.5 Flash (Speed)
    *   *Features*: Google Search Grounding, Thinking Budget
*   **Visualization**: P5.js (Flow field background)
*   **Icons**: Lucide React
*   **Storage**: LocalStorage + IndexedDB (via Context) / Supabase (Optional Analytics)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ for the Vibe Coding Community</p>
</div>
