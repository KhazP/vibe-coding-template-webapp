import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { CopyBlock, RefinementControl, ManualEntryControl } from './UI';
import { Sparkles, ChevronLeft, ChevronRight, History, Database, Search, Terminal, FileCode, Zap, Network, Cpu } from 'lucide-react';
import { ArtifactSectionName } from '../types';
import { generateInlineRefinePrompt } from '../utils/templates';

// --- Premium Loading / Thinking Component ---
export const GenerationVisualizer: React.FC<{ label: string; onCancel: () => void }> = ({ label, onCancel }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden rounded-xl border border-primary-500/30 bg-black/40 backdrop-blur-sm group">

      {/* Animated Scanline Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary-900/10 via-transparent to-primary-900/10 animate-pulse"></div>

      {/* Scanning Line */}
      <div className="absolute text-primary-500/50 w-full h-[2px] bg-primary-500/50 blur-[4px] animate-[scan_3s_ease-in-out_infinite] top-0 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-0"></div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
        {/* Central "Brain" Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-primary-500 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
          <div className="w-20 h-20 rounded-2xl bg-slate-950/50 border border-primary-500/30 flex items-center justify-center relative overflow-hidden backdrop-blur-md shadow-2xl">
            <Cpu size={32} className="text-primary-400 relative z-10 animate-pulse" />
            <div className="absolute inset-0 border-t border-primary-500/50 animate-[spin_4s_linear_infinite] rounded-2xl"></div>
          </div>

          {/* Orbiting Icons */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-dashed border-white/10 rounded-full animate-[spin_10s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-1 rounded-full border border-white/10">
              <Database size={10} className="text-slate-400" />
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-slate-900 p-1 rounded-full border border-white/10">
              <Network size={10} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2 w-full">
          <h3 className="text-xl font-display font-medium text-white tracking-wide">
            {label || 'Thinking'}{dots}
          </h3>
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-primary-500 to-transparent w-1/2 animate-[shimmer_2s_infinite]"></div>
          </div>
          <p className="text-xs font-mono text-primary-400/70 pt-2">
            <span className="opacity-50">SRV::GEN::</span>Wait for token stream...
          </p>
        </div>

        <button
          onClick={onCancel}
          className="mt-12 px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-xs font-medium transition-colors backdrop-blur-sm"
        >
          Cancel Generation
        </button>
      </div>
    </div>
  );
};

export const PremiumEmptyState: React.FC<{ placeholder?: string; icon?: React.ReactNode }> = ({ placeholder, icon }) => (
  <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-dashed border-white/5 relative overflow-hidden group">
    {/* Subtle Grid Background */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)]"></div>

    <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-2xl border border-white/5">
        {icon || <Sparkles size={24} className="text-white/30 group-hover:text-white/60 transition-colors" />}
      </div>
      <h4 className="text-lg font-medium text-slate-300 mb-2">Ready to Create</h4>
      <p className="text-sm text-slate-500 leading-relaxed max-w-[280px]">
        {placeholder || "Configure your settings on the left and click 'Generate' to start building."}
      </p>

      <div className="mt-8 flex gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
      </div>
    </div>
  </div>
);


interface ArtifactSectionProps {
  section: ArtifactSectionName;
  loaderLabel: string;
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
  mode?: 'ai' | 'manual';
  onManualUpdate?: (content: string) => void;
}

export const ArtifactSection: React.FC<ArtifactSectionProps> = ({
  section,
  loaderLabel,
  placeholder,
  children,
  mode = 'ai',
  onManualUpdate
}) => {
  const { state, performRefinement, commitArtifact, cycleArtifactVersion, generationPhase, cancelGeneration, queryGemini } = useProject();
  const { isGenerating, artifactVersions, artifactIndices } = state;

  // Version History Data
  const versions = artifactVersions[section] || [];
  const currentIndex = artifactIndices[section] || 0;
  const totalVersions = versions.length;
  const hasHistory = totalVersions > 1;
  const currentVersion = totalVersions > 0 ? versions[currentIndex] : null;

  // Derive Display Data from Current Version Object
  let output = '';
  let timestamp: number | undefined;

  if (currentVersion) {
    output = currentVersion.content;
    timestamp = currentVersion.timestamp;
  } else {
    // Fallback for empty state or during generation before commit
    switch (section) {
      case 'research': output = state.researchOutput; break;
      case 'prd': output = state.prdOutput; break;
      case 'tech': output = state.techOutput; break;
      case 'build': output = state.buildPlan; break;
    }
  }

  // Define Icon based on section
  const getSectionIcon = () => {
    switch (section) {
      case 'research': return <Search size={24} className="text-blue-400" />;
      case 'prd': return <FileCode size={24} className="text-emerald-400" />;
      case 'tech': return <Database size={24} className="text-amber-400" />;
      case 'build': return <Terminal size={24} className="text-purple-400" />;
      default: return <Sparkles size={24} className="text-white/40" />;
    }
  };

  let label = '';
  let colorClass = 'text-blue-200 bg-blue-900/20 border-blue-500/30';
  let dotClass = 'bg-blue-400';

  switch (section) {
    case 'research':
      label = 'Gemini Research Results';
      break;
    case 'prd':
      label = 'Generated PRD';
      colorClass = 'text-green-200 bg-green-900/20 border-green-500/30';
      dotClass = 'bg-green-400';
      break;
    case 'tech':
      label = 'Generated Tech Design';
      colorClass = 'text-green-200 bg-green-900/20 border-green-500/30';
      dotClass = 'bg-green-400';
      break;
    case 'build':
      label = 'BUILD_PLAN.md';
      colorClass = 'text-blue-200 bg-blue-900/20 border-blue-500/30';
      dotClass = 'bg-blue-400';
      break;
  }

  const handleRefine = (instruction: string) => {
    performRefinement(section, instruction);
  };

  const handleManualUpdate = (val: string) => {
    commitArtifact(section, val);
    if (onManualUpdate) onManualUpdate(val);
  };

  const handleInlineRefine = async (selection: string, instruction: string): Promise<string> => {
    const prompt = generateInlineRefinePrompt(selection, instruction);
    const systemInstruction = "You are a precise text editor. Return ONLY the rewritten text in valid Markdown format. Do not wrap the output in a markdown code block (```markdown) unless the original text was a code block.";
    return await queryGemini(prompt, systemInstruction);
  };

  if (isGenerating && !output) {
    return <GenerationVisualizer label={generationPhase || loaderLabel} onCancel={cancelGeneration} />;
  }

  if (!output && !isGenerating) {
    return (
      <PremiumEmptyState
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        icon={getSectionIcon()}
      />
    );
  }

  return (
    <>
      <div className={`p-3 rounded-lg text-sm flex justify-between items-center border ${colorClass} mb-4`}>
        <div className="flex items-center gap-3">
          <span className="font-semibold flex items-center gap-2">
            Status: {isGenerating ? (generationPhase || 'Streaming...') : 'Ready'}
            {isGenerating && <span className={`flex h-2 w-2 rounded-full animate-pulse ${dotClass}`}></span>}
          </span>

          {/* Version Controls */}
          {hasHistory && !isGenerating && (
            <div className="flex items-center gap-1 bg-black/20 rounded-md px-1 py-0.5 border border-white/5 ml-2">
              <button
                onClick={() => cycleArtifactVersion(section, -1)}
                disabled={currentIndex <= 0}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
                title="Previous Version"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-mono px-1 min-w-[50px] text-center flex items-center justify-center gap-1">
                <History size={10} className="opacity-70" /> {currentIndex + 1}/{totalVersions}
              </span>
              <button
                onClick={() => cycleArtifactVersion(section, 1)}
                disabled={currentIndex >= totalVersions - 1}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
                title="Next Version"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {isGenerating && (
          <button
            onClick={cancelGeneration}
            className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <CopyBlock
        content={output}
        label={label}
        isStreaming={isGenerating}
        onEdit={handleManualUpdate}
        timestamp={timestamp}
        fileName={`${section}-artifact-v${currentIndex + 1}`}
        onInlineRefine={handleInlineRefine}
      />

      {mode === 'ai' ? (
        <RefinementControl
          onRefine={handleRefine}
          isRefining={isGenerating}
          placeholder={`Refine ${section.toUpperCase()} (e.g., 'Add more detail', 'Simplify language')`}
        />
      ) : (
        <ManualEntryControl
          onUpdate={handleManualUpdate}
        />
      )}

      {children}
    </>
  );
};