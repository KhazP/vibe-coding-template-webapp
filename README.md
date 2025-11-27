# 🚀 Vibe-Coding Workflow Webapp

<div align="center">

**The automated "Mission Control" for the Vibe-Coding methodology.** *Turn ideas into code with AI-powered Research, PRDs, Tech Designs, and Universal Agent Configurations.*

[![Website](https://img.shields.io/badge/Live_Demo-Vercel-black?logo=vercel)](https://vibe-coding-template-webapp.vercel.app/#/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built With: Gemini](https://img.shields.io/badge/AI-Gemini_3_Pro-blue)](https://ai.google.dev/)

</div>

---

## 📖 Overview

The **Vibe-Coding Webapp** is a modern, interactive studio that streamlines the software development lifecycle using generative AI. Instead of manually prompting LLMs, this app guides you through a structured **5-step pipeline** to transform a rough idea into a production-ready build plan.

It leverages **Google Gemini 3 Pro** (with Thinking & Search Grounding) to act as your Researcher, Product Manager, and Architect—generating deep context files that you can hand off to AI coding agents like Cursor, Windsurf, or Cline.

## ✨ Key Features

### 🧠 Automated 5-Step Pipeline
1.  **Deep Research:** Validates your idea using **Google Search Grounding** to find competitors and technical feasibility.
2.  **PRD Generator:** Drafts professional Product Requirements Documents tailored to your persona.
3.  **Tech Design:** Architects the stack, database schema, and API structure.
4.  **Agent Config:** Generates a universal `AGENTS.md` "brain" and tool-specific configuration files.
5.  **Build Execution:** Creates a master `BUILD_PLAN.md` and generates phase-by-phase prompts for your IDE.

### 🛠️ Universal Tool Support
Generate ready-to-use configuration files for the most popular AI coding tools:

| Category | Supported Tools | Generated Config |
| :--- | :--- | :--- |
| **Native Support** | Cursor, Windsurf, Cline, Aider, Copilot | `.cursorrules`, `.windsurfrules`, `.clinerules`, etc. |
| **Adapters** | Claude Code, Gemini CLI, Google Antigravity | `CLAUDE.md`, `GEMINI.md`, `ANTIGRAVITY.md` |
| **Generators** | Lovable, v0 | Prompt templates for web builders |

### 🎨 Cinematic Experience
* **3 Personas:** Vibe-Coder (No-code), Developer (Pro), and Learner modes.
* **Settings Control:** Configure Thinking Budget (Tokens), Temperature, and Presets (Fast/Balanced/Thorough).
* **Persistence:** Local auto-save with Undo/Redo history and project management.
* **Export:** One-click download of the entire "Vibe Kit" (Docs + Configs) as a ZIP file.

---

## 📦 Tech Stack

* **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Animation:** [Framer Motion](https://www.framer.com/motion/) + p5.js (Backgrounds)
* **AI SDK:** [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`gemini-2.5-flash` & `gemini-3-pro`)
* **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+ installed.
* A **Google Gemini API Key** (Free tier available at [aistudio.google.com](https://aistudio.google.com/app/apikey)).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/KhazP/vibe-coding-prompt-template.git](https://github.com/KhazP/vibe-coding-prompt-template.git)
    cd vibe-coding-template-webapp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Launch:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

5.  **Authenticate:**
    Enter your Google API Key in the secure modal (keys are stored locally in your browser and never sent to our servers).

---

## 🎮 How to Use

1.  **Select a Persona:** Choose between *Vibe-Coder*, *Developer*, or *Learner* to tune the AI's output style.
2.  **Run Deep Research:** Input your idea. The AI will browse the web to validate it.
3.  **Generate Specs:** Click through the **PRD** and **Tech Design** tabs to auto-draft your documentation.
4.  **Configure Agents:** Go to the **Agent** tab, select your preferred tools (e.g., Cursor, Windsurf), and generate the config files.
5.  **Export:** Go to **Export & Deploy** to download your project kit `.zip`.
6.  **Build:** Unzip the kit, open your IDE, and use the **Build** tab's prompts to start coding!

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built for the <b>Vibe-Coding Community</b>
</div>
