
import React from 'react';
import { useProject } from '../context/ProjectContext';
import { CopyBlock, GenerationLoader, RefinementControl, ManualEntryControl } from './UI';
import { Sparkles } from 'lucide-react';

interface ArtifactSectionProps {
  section: 'research' | 'prd' | 'tech' | 'build';
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
  const { state, performRefinement, setResearchOutput, setPrdOutput, setTechOutput, setBuildPlan, generationPhase, cancelGeneration } = useProject();
  const { isGenerating, sectionTimestamps } = state;

  let output = '';
  let setter: (val: string) => void = () => {};
  let timestamp: number | undefined;
  let label = '';
  let colorClass = 'text-blue-200 bg-blue-900/20 border-blue-500/30';
  let dotClass = 'bg-blue-400';

  switch (section) {
    case 'research':
      output = state.researchOutput;
      setter = setResearchOutput;
      timestamp = sectionTimestamps?.research;
      label = 'Gemini Research Results';
      break;
    case 'prd':
      output = state.prdOutput;
      setter = setPrdOutput;
      timestamp = sectionTimestamps?.prd;
      label = 'Generated PRD';
      colorClass = 'text-green-200 bg-green-900/20 border-green-500/30';
      dotClass = 'bg-green-400';
      break;
    case 'tech':
      output = state.techOutput;
      setter = setTechOutput;
      timestamp = sectionTimestamps?.tech;
      label = 'Generated Tech Design';
      colorClass = 'text-green-200 bg-green-900/20 border-green-500/30'; // Reusing green/teal for tech per original
      dotClass = 'bg-green-400';
      break;
    case 'build':
      output = state.buildPlan;
      setter = setBuildPlan;
      timestamp = sectionTimestamps?.build;
      label = 'BUILD_PLAN.md';
      colorClass = 'text-blue-200 bg-blue-900/20 border-blue-500/30';
      dotClass = 'bg-blue-400';
      break;
  }

  const handleRefine = (instruction: string) => {
    performRefinement(section, instruction);
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
      <div className={`p-4 rounded-lg text-sm flex justify-between items-center border ${colorClass}`}>
         <div className="flex items-center gap-2">
            <span><strong>Status:</strong> {isGenerating ? (generationPhase || 'Refining...') : 'Ready'}</span>
         </div>
         {isGenerating ? (
            <div className="flex items-center gap-2">
                <span className={`flex h-2 w-2 rounded-full animate-pulse ${dotClass}`}></span>
                <button 
                    onClick={cancelGeneration}
                    className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded"
                >
                    Cancel
                </button>
            </div>
         ) : null}
      </div>
      
      <CopyBlock 
          content={output} 
          label={label} 
          isStreaming={isGenerating} 
          onEdit={setter}
          timestamp={timestamp}
          fileName={`${section}-artifact`}
      />
      
      {mode === 'ai' ? (
        <RefinementControl 
           onRefine={handleRefine} 
           isRefining={isGenerating} 
           placeholder={`Refine ${section.toUpperCase()} (e.g., 'Add more detail', 'Simplify language')`}
        />
      ) : (
        <ManualEntryControl 
           onUpdate={(val) => {
             setter(val);
             if (onManualUpdate) onManualUpdate(val);
           }} 
        />
      )}
      
      {children}
    </>
  );
};
