

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Wand2, Box, Layers, Terminal, Github, Coffee, Settings, Key } from 'lucide-react';
import { Button, GlassCard, PageTransition, Tooltip } from '../components/UI';
import { useProject } from '../context/ProjectContext';
import { Persona } from '../types';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const { setPersona, setIsSettingsOpen, setIsApiKeyModalOpen } = useProject();

  const selectPersona = (p: Persona) => {
    setPersona(p);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 50 } }
  };

  const personas = [
    { 
      id: Persona.VibeCoder, 
      title: "Vibe-Coder", 
      desc: "Great ideas, limited coding experience. You direct the vision, AI handles the code.", 
      icon: <Sparkles size={28} className="text-fuchsia-400" />,
      color: "from-fuchsia-600/20 to-purple-600/10",
      border: "hover:border-fuchsia-500/50"
    },
    { 
      id: Persona.Developer, 
      title: "Developer", 
      desc: "Speed up architecture, boilerplate, and docs. Focus on the hard problems.", 
      icon: <Terminal size={28} className="text-emerald-400" />,
      customIcon: ( <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> ),
      color: "from-emerald-600/20 to-teal-600/10",
      border: "hover:border-emerald-500/50"
    },
    { 
      id: Persona.InBetween, 
      title: "In-Between", 
      desc: "Learning as you build. Understand the generated code while moving fast.", 
      icon: <Layers size={28} className="text-amber-400" />,
      color: "from-amber-600/20 to-orange-600/10",
      border: "hover:border-amber-500/50"
    }
  ];

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[85vh]">
        <motion.div 
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-20 text-center md:text-left pt-10"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface/80 border border-white/10 text-primary-300 text-xs font-mono tracking-widest uppercase mb-8 shadow-lg shadow-black/50">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"/>
            Vibe-Coding V2.1
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-[1.1] font-display tracking-tight">
            KhazP / <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-600 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              vibe-coding-prompt-template
            </span>
          </h1>
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed font-light">
              Automate the boring parts. Generate research, PRDs, and architecture in minutes with <span className="text-slate-200 font-medium">Gemini 3 Pro</span>.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-3 gap-6 mb-24"
        >
          {personas.map((p) => (
            <Link 
              key={p.id} 
              to="/research" 
              onClick={() => selectPersona(p.id)}
              className="block h-full"
            >
              <motion.div variants={item} className="h-full">
                <GlassCard className={`h-full group transition-all duration-500 ${p.border}`} hoverEffect={true}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl`} />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 p-4 bg-surface/80 w-fit rounded-2xl border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500">
                      {p.customIcon || p.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 font-display">{p.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">{p.desc}</p>
                    
                    <div className="flex items-center text-primary-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                      Select Path <ArrowRight size={16} className="ml-2" />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="border-t border-white/10 pt-12">
            <h3 className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest mb-10 font-mono">
              <Wand2 className="text-primary-500" size={16} />
              Automated Pipeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {[
                { 
                  step: "01", 
                  title: "Deep Research", 
                  desc: "Validate idea & tech stack with AI.", 
                  tooltip: "Uses Google Search Grounding to find real-time info on competitors and technical feasibility."
                },
                { 
                  step: "02", 
                  title: "Define PRD", 
                  desc: "Scope features & user stories.", 
                  tooltip: "Generates a comprehensive Product Requirements Document tailored to your persona."
                },
                { 
                  step: "03", 
                  title: "Tech Design", 
                  desc: "Architect stack & DB schema.", 
                  tooltip: "Creates a technical specification including database schema, API endpoints, and component architecture."
                },
                { 
                  step: "04", 
                  title: "Agent Config", 
                  desc: "Multi-tool support: Cursor, Windsurf, Cline & more.", 
                  tooltip: "Generates the 'Universal Brain' (AGENTS.md) and specific config files for Cursor, Windsurf, Aider, Copilot, and others."
                },
                { 
                  step: "05", 
                  title: "Export & Deploy", 
                  desc: "Download kit & launch.", 
                  tooltip: "One-click download of all artifacts with specific instructions for your IDE."
                }
              ].map((s, i) => (
                <Tooltip key={i} content={s.tooltip} className="h-full block">
                    <div className="group cursor-default h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-white/10 text-xs font-mono text-primary-500 group-hover:bg-primary-500 group-hover:text-black transition-colors duration-300 shrink-0">
                          {s.step}
                        </span>
                        <strong className="text-slate-200 font-display text-lg tracking-tight leading-tight">{s.title}</strong>
                      </div>
                      <p className="text-sm text-slate-500 pl-12 border-l border-white/5 group-hover:border-primary-500/30 transition-colors duration-300 flex-1 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-auto pt-24 pb-8 flex flex-col md:flex-row justify-end items-center gap-4"
        >
            <div className="flex items-center gap-3">
               <a 
                  href="https://github.com/KhazP/vibe-coding-prompt-template" 
                  target="_blank" 
                  rel="noopener noreferrer"
               >
                 <Button variant="secondary" className="text-xs h-10 border-white/10 bg-white/5 hover:bg-white/10">
                    <Github size={16} /> Star on GitHub
                 </Button>
               </a>
               <a 
                  href="https://buymeacoffee.com/alpyalayg" 
                  target="_blank" 
                  rel="noopener noreferrer"
               >
                 <Button variant="secondary" className="text-xs h-10 border-[#FFDD00]/20 bg-[#FFDD00]/10 hover:bg-[#FFDD00]/20 text-[#FFDD00]">
                    <Coffee size={16} /> Support
                 </Button>
               </a>
            </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Home;