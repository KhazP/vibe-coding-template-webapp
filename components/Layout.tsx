
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Zap, FileText, Cpu, Bot, Terminal, FolderOpen, Save, Loader2, CheckCircle, AlertCircle, Circle, PlayCircle, Settings, Key, Menu, X, Rocket, Github } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { useProject } from '../context/ProjectContext';
import SettingsModal from './SettingsModal';
import { Tooltip, Breadcrumbs, Button } from './UI';
import { ApiKeyGate } from './ApiKeyGate';
import FlowFieldBackground from './FlowFieldBackground';
import { BuyMeACoffee } from './BuyMeACoffee';

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
          onClick={onClick}
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
  const { state, saveProject, saveStatus, setIsSettingsOpen, setIsApiKeyModalOpen } = useProject();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Pipeline Progress Logic
  const pipelineSteps = [
    { label: 'Research', path: '/research', isComplete: !!state.researchOutput, isActive: location.pathname === '/research' },
    { label: 'PRD', path: '/prd', isComplete: !!state.prdOutput, isActive: location.pathname === '/prd' },
    { label: 'Tech', path: '/tech', isComplete: !!state.techOutput, isActive: location.pathname === '/tech' },
    { label: 'Agents', path: '/agent', isComplete: Object.keys(state.agentOutputs).length > 0, isActive: location.pathname === '/agent' },
    { label: 'Export', path: '/export', isComplete: false, isActive: location.pathname === '/export' }, // Always false as it's the end
  ];
  
  const showPipeline = ['/research', '/prd', '/tech', '/agent', '/export'].includes(location.pathname);

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

  const renderNavItems = () => (
    <>
      {!state.settings.defaultPersona && (
        <NavItem 
          to="/" 
          icon={<Terminal />} 
          label="Start" 
          isActive={location.pathname === '/'} 
          isHovered={hoveredPath === '/'}
          onHover={() => setHoveredPath('/')}
          onLeave={() => setHoveredPath(null)}
        />
      )}
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
        to="/export" 
        icon={<Rocket />} 
        label="5. Export & Deploy" 
        isActive={location.pathname === '/export'} 
        isComplete={false}
        isHovered={hoveredPath === '/export'}
        onHover={() => setHoveredPath('/export')}
        onLeave={() => setHoveredPath(null)}
      />
    </>
  );

  return (
    <div className="min-h-screen flex text-slate-200 overflow-hidden relative selection:bg-primary-500/30">
      <ApiKeyGate />
      <FlowFieldBackground />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-900 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-white/10 shrink-0">
                  <Zap className="text-white relative z-10" size={16} />
              </div>
              <span className="font-bold text-sm text-white leading-tight tracking-tight font-display">Vibe Workflow</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 top-[65px] z-30 bg-[#050505] p-4 overflow-y-auto md:hidden pb-24"
           >
              <div className="space-y-6">
                  {/* Projects Section */}
                  <div>
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

                  {/* Pipeline Section */}
                  <div>
                     <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3 px-6">Pipeline</div>
                     <nav className="space-y-1">
                        {renderNavItems()}
                     </nav>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="pt-6 border-t border-white/5 space-y-3">
                     <a 
                        href="https://github.com/KhazP/vibe-coding-prompt-template" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full"
                     >
                         <Button 
                            variant="secondary" 
                            className="w-full text-sm h-12 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-4 text-slate-400 hover:text-white"
                         >
                            <Github size={18} /> <span className="ml-2">Star on GitHub</span>
                         </Button>
                     </a>
                     <Button 
                        variant="secondary" 
                        onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                        className="w-full text-sm h-12 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-4 text-slate-400 hover:text-white"
                     >
                        <Settings size={18} /> <span className="ml-2">Settings</span>
                     </Button>
                     <Button 
                        variant="secondary" 
                        onClick={() => { setIsApiKeyModalOpen(true); setIsMobileMenuOpen(false); }}
                        className="w-full text-sm h-12 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-4 text-slate-400 hover:text-white"
                     >
                        <Key size={18} /> <span className="ml-2">API Key</span>
                     </Button>
                  </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Glass Sidebar (Desktop) */}
      <aside className="w-72 hidden md:flex flex-col fixed h-full z-30 border-r border-white/5 bg-[#050505]/60 backdrop-blur-2xl">
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
              {renderNavItems()}
            </nav>
          </LayoutGroup>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-gradient-to-t from-primary-900/5 to-transparent">
            {/* Action Bar */}
            <div className="flex flex-col gap-2 mb-4">
                <a 
                    href="https://github.com/KhazP/vibe-coding-prompt-template" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full"
                >
                    <Button 
                        variant="secondary" 
                        className="w-full text-xs h-10 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-3 text-slate-400 hover:text-white"
                    >
                        <Github size={16} /> <span className="ml-2">Star on GitHub</span>
                    </Button>
                </a>
                <Button 
                    variant="secondary" 
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full text-xs h-10 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-3 text-slate-400 hover:text-white"
                >
                    <Settings size={16} /> <span className="ml-2">Settings</span>
                </Button>
                <Button 
                    variant="secondary" 
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="w-full text-xs h-10 justify-start bg-white/5 border-white/10 hover:bg-white/10 px-3 text-slate-400 hover:text-white"
                >
                    <Key size={16} /> <span className="ml-2">API Key</span>
                </Button>
            </div>

            <div className="text-[10px] text-slate-600 mt-2 text-center font-mono opacity-50">
              Auto-save • v2.2.0
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-20 h-screen overflow-y-auto overflow-x-hidden scroll-smooth pt-20 md:pt-0 md:ml-72 transition-all duration-500 ease-in-out">
        <div className="max-w-6xl mx-auto p-4 md:p-12 pb-32">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="hidden md:block">
                <Breadcrumbs items={getBreadcrumbs()} />
            </div>
            {/* Mobile Breadcrumbs (Simplified) */}
            <div className="md:hidden text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                {showPipeline ? getCurrentStepLabel(location.pathname) : 'Workspace'}
            </div>

            <div className="flex items-center gap-4 justify-between md:justify-end">
                <div className="text-xs font-mono flex items-center gap-2 transition-all duration-300">
                    {saveStatus === 'saving' && (
                        <span className="text-slate-400 flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" /> Saving...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className="text-emerald-500/80 flex items-center gap-2">
                            <CheckCircle size={12} /> Saved
                        </span>
                    )}
                    {saveStatus === 'unsaved' && (
                        <span className="text-amber-500/80 flex items-center gap-2 animate-pulse">
                            <AlertCircle size={12} /> Unsaved
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-red-500 flex items-center gap-2 font-bold animate-pulse" title="Storage Full! Export or delete projects.">
                            <AlertCircle size={12} /> Storage Full
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={saveProject} 
                        className="h-8 text-xs px-3 bg-white/5 border-white/10 hover:bg-white/10"
                    >
                        <Save size={14} className="mr-1.5" /> Save
                    </Button>
                </div>
            </div>
          </div>

          {children}
        </div>
      </main>

      <SettingsModal />
      <BuyMeACoffee />
    </div>
  );
};
