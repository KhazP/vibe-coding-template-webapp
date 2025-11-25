import React from 'react';
import { useProject } from '../context/ProjectContext';
import { CopyBlock, GenerationLoader, RefinementControl } from './UI';
import { Sparkles } from 'lucide-react';

interface ArtifactSectionProps {
  section: 'research' | 'prd' | 'tech' | 'build';
  loaderLabel: string;
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
}

export const ArtifactSection: React.FC<ArtifactSectionProps> = ({ 
  section, 
  loaderLabel, 
  placeholder,
  children 
}) => {
  const { state, performRefinement, setResearchOutput, setPrdOutput, setTechOutput, setBuildPlan } = useProject();
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
    return <GenerationLoader label={loaderLabel} />;
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
         <span>
            <strong>Status:</strong> {isGenerating ? 'Refining...' : 'Ready'}
         </span>
         {isGenerating && <span className={`flex h-2 w-2 rounded-full animate-pulse ${dotClass}`}></span>}
      </div>
      
      <CopyBlock 
          content={output} 
          label={label} 
          isStreaming={isGenerating} 
          onEdit={setter}
          timestamp={timestamp}
          fileName={`${section}-artifact`}
      />
      
      <RefinementControl 
         onRefine={handleRefine} 
         isRefining={isGenerating} 
         placeholder={`Refine ${section.toUpperCase()} (e.g., 'Add more detail', 'Simplify language')`}
      />
      
      {children}
    </>
  );
};