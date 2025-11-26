
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Zap, FileText, Cpu, Bot, Terminal, Settings, PlayCircle, Github, Coffee, FolderOpen, Undo2, Redo2, Save, Loader2, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useProject } from '../context/ProjectContext';
import SettingsModal from './SettingsModal';
import { Tooltip, Breadcrumbs, Button } from './UI';
import { ApiKeyGate } from './ApiKeyGate';

const NavItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean;
  isComplete?: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ to, icon, label, isActive, isComplete, isHovered, onHover, onLeave, onClick }) => {
  
  const content = (
    <div className={`relative flex items-center justify-between px-6 py-3.5 transition-colors duration-300 z-10 ${
      isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-200'
    }`}>
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement<any>, { 
          size: 18, 
          className: `transition-colors duration-300 ${isActive ? 'text-primary-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'group-hover:text-primary-400'}` 
        })}
        <span className="font-medium tracking-wide text-sm">{label}</span>
      </div>
      
      {/* Completion Indicator */}
      {isComplete !== undefined && (
        <div className="flex items-center">
            {isComplete ? (
                 <CheckCircle size={14} className="text-emerald-500/80 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" />
            ) : (
                 <Circle size={8} className="text-slate-700 fill-slate-800/50" />
            )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative group mb-1">
      {to.startsWith('/') ? (
        <Link 
          to={to} 
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          className="block relative"
        >
          {/* Hover State Background */}
          {isHovered && !isActive && (
            <motion.div
              layoutId="nav-hover-bg"
              className="absolute inset-0 bg-white/[0.03] rounded-lg mx-2"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}

          {/* Active State Background & Indicator */}
          {isActive && (
             <motion.div
               layoutId="nav-active-bg"
               className="absolute inset-0 bg-primary-500/10 border-r-2 border-primary-500"
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
             />
          )}
          
          {content}
        </Link>
      ) : (
        <button 
          onClick={onClick}
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          className="block w-full text-left relative"
        >
          {isHovered && !isActive && (
            <motion.div
              layoutId="nav-hover-bg"
              className="absolute inset-0 bg-white/[0.03] rounded-lg mx-2"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {content}
        </button>
      )}
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { state, setIsSettingsOpen, undo, redo, canUndo, canRedo, saveProject, saveStatus } = useProject();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Pipeline Progress Logic
  const pipelineSteps = [
    { label: 'Research', path: '/research', isComplete: !!state.researchOutput, isActive: location.pathname === '/research' },
    { label: 'PRD', path: '/prd', isComplete: !!state.prdOutput, isActive: location.pathname === '/prd' },
    { label: 'Tech', path: '/tech', isComplete: !!state.techOutput, isActive: location.pathname === '/tech' },
    { label: 'Agents', path: '/agent', isComplete: Object.keys(state.agentOutputs).length > 0, isActive: location.pathname === '/agent' },
    { label: 'Build', path: '/build', isComplete: !!state.buildPlan, isActive: location.pathname === '/build' },
  ];
  
  const showPipeline = ['/research', '/prd', '/tech', '/agent', '/build'].includes(location.pathname);

  const getCurrentStepLabel = (path: string) => {
    const step = pipelineSteps.find(s => s.path === path);
    return step ? step.label : 'Home';
  };

  const getBreadcrumbs = () => {
    const items = [
      { label: 'Workspace', path: '/projects' },
      { label: state.name || 'Untitled Project', path: '/' }
    ];
    if (showPipeline) {
      items.push({ label: getCurrentStepLabel(location.pathname), path: location.pathname });
    }
    return items;
  };

  return (
    <div className="min-h-screen flex text-slate-200 overflow-hidden relative selection:bg-primary-500/30">
      <ApiKeyGate />
      
      {/* Ambient Background Effects (AMOLED Green) */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-background">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-900/10 rounded-full blur-[150px] animate-blob" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-secondary-900/10 rounded-full blur-[150px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-primary-900/5 rounded-full blur-[150px] animate-blob animation-delay-4000" />
      </div>

      {/* Glass Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-72 hidden md:flex flex-col fixed h-full z-30 border-r border-white/5 bg-[#020202]/50 backdrop-blur-2xl"
      >
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-12">
            <div className="relative w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-900 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-white/10 shrink-0">
              <Zap className="text-white relative z-10" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-white leading-tight tracking-tight font-display">Vibe Prompt Template</h1>
              <p className="text-[10px] text-primary-400/80 font-mono tracking-widest uppercase mt-1">Workflow 2025</p>
            </div>
          </div>

          <LayoutGroup id="sidebar">
            {/* Projects Section */}
            <div className="mb-8">
               <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3 px-6">Workspace</div>
               <nav className="space-y-1">
                  <NavItem 
                    to="/projects" 
                    icon={<FolderOpen />} 
                    label="My Projects" 
                    isActive={location.pathname === '/projects'}
                    isHovered={hoveredPath === '/projects'}
                    onHover={() => setHoveredPath('/projects')}
                    onLeave={() => setHoveredPath(null)}
                  />
               </nav>
            </div>

            <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3 px-6">Pipeline</div>
            
            <nav className="space-y-1">
              <NavItem 
                to="/" 
                icon={<Terminal />} 
                label="Start" 
                isActive={location.pathname === '/'} 
                isHovered={hoveredPath === '/'}
                onHover={() => setHoveredPath('/')}
                onLeave={() => setHoveredPath(null)}
              />
              <NavItem 
                to="/research" 
                icon={<Zap />} 
                label="1. Research" 
                isActive={location.pathname === '/research'} 
                isComplete={!!state.researchOutput}
                isHovered={hoveredPath === '/research'}
                onHover={() => setHoveredPath('/research')}
                onLeave={() => setHoveredPath(null)}
              />
              <NavItem 
                to="/prd" 
                icon={<FileText />} 
                label="2. Define (PRD)" 
                isActive={location.pathname === '/prd'} 
                isComplete={!!state.prdOutput}
                isHovered={hoveredPath === '/prd'}
                onHover={() => setHoveredPath('/prd')}
                onLeave={() => setHoveredPath(null)}
              />
              <NavItem 
                to="/tech" 
                icon={<Cpu />} 
                label="3. Tech Design" 
                isActive={location.pathname === '/tech'} 
                isComplete={!!state.techOutput}
                isHovered={hoveredPath === '/tech'}
                onHover={() => setHoveredPath('/tech')}
                onLeave={() => setHoveredPath(null)}
              />
              <NavItem 
                to="/agent" 
                icon={<Bot />} 
                label="4. Agent Config" 
                isActive={location.pathname === '/agent'} 
                isComplete={Object.keys(state.agentOutputs).length > 0}
                isHovered={hoveredPath === '/agent'}
                onHover={() => setHoveredPath('/agent')}
                onLeave={() => setHoveredPath(null)}
              />
              <NavItem 
                to="/build" 
                icon={<PlayCircle />} 
                label="5. Build" 
                isActive={location.pathname === '/build'} 
                isComplete={!!state.buildPlan}
                isHovered={hoveredPath === '/build'}
                onHover={() => setHoveredPath('/build')}
                onLeave={() => setHoveredPath(null)}
              />
            </nav>
          </LayoutGroup>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-gradient-to-t from-primary-900/5 to-transparent">
             
             {/* Action Bar */}
             <div className="grid grid-cols-4 gap-2 mb-4">
                 <div className="col-span-2 flex items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                     <Tooltip content="Undo (Ctrl+Z)" position="top">
                        <button 
                          onClick={undo} 
                          disabled={!canUndo} 
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <Undo2 size={16} />
                        </button>
                     </Tooltip>
                     <div className="w-px h-4 bg-white/10 mx-1" />
                     <Tooltip content="Redo (Ctrl+Shift+Z)" position="top">
                        <button 
                          onClick={redo} 
                          disabled={!canRedo} 
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <Redo2 size={16} />
                        </button>
                     </Tooltip>
                 </div>
                 
                 <a 
                  href="https://github.com/KhazP/vibe-coding-prompt-template" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all group"
                 >
                   <Github size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                 </a>
                 <a 
                  href="https://buymeacoffee.com/alpyalayg" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-lg bg-[#FFDD00]/10 hover:bg-[#FFDD00]/20 border border-[#FFDD00]/20 text-[#FFDD00]"
                 >
                   <Coffee size={16} />
                 </a>
             </div>

             <LayoutGroup id="sidebar-bottom">
               <NavItem 
                  to="settings-modal" 
                  icon={<Settings />} 
                  label="Settings" 
                  isActive={false}
                  isHovered={hoveredPath === 'settings'}
                  onHover={() => setHoveredPath('settings')}
                  onLeave={() => setHoveredPath(null)}
                  onClick={() => setIsSettingsOpen(true)}
               />
             </LayoutGroup>
             <div className="text-[10px] text-slate-600 mt-4 text-center font-mono opacity-50">
               Auto-save • v2.2.0
             </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 relative z-10 h-screen overflow-y-auto overflow-x-hidden scroll-smooth">
        <div className="max-w-6xl mx-auto p-8 md:p-12 pb-32">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
             <Breadcrumbs items={getBreadcrumbs()} />
             <div className="flex items-center gap-4">
                <div className="text-xs font-mono flex items-center gap-2 transition-all duration-300">
                    {saveStatus === 'saving' && (
                        <span className="text-slate-400 flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" /> Saving...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className="text-emerald-500/80 flex items-center gap-2">
                            <CheckCircle size={12} /> All changes saved
                        </span>
                    )}
                    {saveStatus === 'unsaved' && (
                        <span className="text-amber-500/80 flex items-center gap-2 animate-pulse">
                            <AlertCircle size={12} /> Unsaved changes
                        </span>
                    )}
                </div>
                <Button variant="secondary" onClick={saveProject} className="h-8 text-xs px-3 bg-white/5 border-white/10 hover:bg-white/10">
                    <Save size={14} className="mr-1.5" /> Save Project
                </Button>
             </div>
          </div>

          {children}
        </div>
      </main>

      <SettingsModal />
    </div>
  );
};
