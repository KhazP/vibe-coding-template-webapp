
import React from 'react';
import { useProject } from '../context/ProjectContext';
import { CopyBlock, GenerationLoader, RefinementControl, ManualEntryControl } from './UI';
import { Sparkles, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { ArtifactSectionName } from '../types';
import { generateInlineRefinePrompt } from '../utils/templates';

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
      // We use a specific system instruction for pure text editing to avoid chatty responses
      const systemInstruction = "You are a precise text editor. Return ONLY the rewritten text in valid Markdown format. Do not wrap the output in a markdown code block (```markdown) unless the original text was a code block.";
      return await queryGemini(prompt, systemInstruction);
  };

  if (isGenerating && !output) {
    return (
        <GenerationLoader 
            label={generationPhase || loaderLabel} 
            onCancel={cancelGeneration}
        />
    );
  }

  if (!output && !isGenerating) {
    return (
      <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30 text-slate-500 p-8 text-center">
        {placeholder || (
          <div className="max-w-xs">
            <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
            <p>Content will appear here after generation.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`p-3 rounded-lg text-sm flex justify-between items-center border ${colorClass}`}>
         <div className="flex items-center gap-3">
            <span className="font-semibold flex items-center gap-2">
                Status: {isGenerating ? (generationPhase || 'Refining...') : 'Ready'}
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