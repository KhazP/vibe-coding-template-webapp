
import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { GlassCard, Button, PersonaError, StepNavigation, Tooltip } from '../components/UI';
import { 
  Terminal, Download, FileText, Copy, FileJson, 
  Command, Package, CheckSquare, Square, 
  ExternalLink, Sparkles, AlertCircle, PlayCircle, FolderOpen,
  ArrowRight, Monitor, BookOpen, Check
} from 'lucide-react';
import { ModelStatus } from '../components/ModelStatus';
import { TOOL_IDS, FILE_NAMES, TOOLS } from '../utils/constants';
import { getLaunchProtocol, LAUNCH_PROTOCOL_INDEX } from '../utils/launchProtocols';
import JSZip from 'jszip';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Sub-Components ---

const ChecklistItem: React.FC<{ 
    id: string; 
    label: React.ReactNode; 
    isChecked: boolean; 
    toggle: (id: string) => void;
}> = ({ id, label, isChecked, toggle }) => (
    <div 
        onClick={() => toggle(id)}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none group ${
            isChecked 
                ? 'bg-emerald-950/20 border-emerald-500/20' 
                : 'bg-slate-900/50 border-white/5 hover:bg-slate-900 hover:border-white/10'
        }`}
    >
        <div className={`mt-0.5 transition-colors duration-300 ${isChecked ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-500'}`}>
            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
        </div>
        <div className={`text-sm leading-relaxed transition-opacity duration-300 ${isChecked ? 'text-emerald-100/50 line-through' : 'text-slate-300'}`}>
            {label}
        </div>
    </div>
);

const FileRow: React.FC<{
    name: string;
    desc: string;
    icon: React.ReactNode;
    content?: string;
    onCopy: (text: string) => void;
}> = ({ name, desc, icon, content, onCopy }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-white/5 group hover:border-primary-500/20 transition-all">
        <div className="text-slate-400 group-hover:text-primary-400 transition-colors">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">{name}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{desc}</div>
        </div>
        {content && (
            <button 
                onClick={() => onCopy(content)}
                className="p-2 text-slate-600 hover:text-white hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                title="Copy content"
                aria-label="Copy content"
            >
                <Copy size={14} />
            </button>
        )}
    </div>
);

const CodeBlock: React.FC<{ code: string; language?: string; onCopy: (text: string) => void }> = ({ code, language = 'text', onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        onCopy(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[#050505] rounded-lg border border-white/10 group relative my-2 overflow-hidden">
            <button 
                className="absolute top-2 right-2 z-10 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-all opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur cursor-pointer" 
                onClick={handleCopy} 
                title="Copy command"
                aria-label="Copy command"
            >
                 {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '12px' }}
                wrapLines={true}
                wrapLongLines={true}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

const MarkdownRenderer: React.FC<{ content: string; onCopy: (text: string) => void }> = ({ content, onCopy }) => {
    // Helper to render inline markdown (bold, code, links)
    const renderInline = (text: string) => {
        // First split by links [text](url)
        const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
        
        return parts.map((part, i) => {
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a 
                        key={i} 
                        href={linkMatch[2]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary-400 hover:underline"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            // Split by bold **text**
            const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
            return (
                <span key={i}>
                    {boldParts.map((subPart, j) => {
                        const boldMatch = subPart.match(/^\*\*([^*]+)\*\*$/);
                        if (boldMatch) {
                            return <strong key={j} className="text-slate-100 font-bold">{boldMatch[1]}</strong>;
                        }

                        // Split by inline code `text`
                        const codeParts = subPart.split(/(`[^`]+`)/g);
                        return (
                            <span key={j}>
                                {codeParts.map((codePart, k) => {
                                    const codeMatch = codePart.match(/^`([^`]+)`$/);
                                    if (codeMatch) {
                                        return <code key={k} className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">{codeMatch[1]}</code>;
                                    }
                                    return codePart;
                                })}
                            </span>
                        );
                    })}
                </span>
            );
        });
    };
    
    // Split by Header 4 (####)
    const sections = content.split('#### ');
    const headerSection = sections[0];
    const stepSections = sections.slice(1);
    
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header Area */}
            <div className="mb-6 border-b border-white/10 pb-4">
                {headerSection.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-white mb-2">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('**Time Estimate:**')) return <div key={i} className="text-xs font-mono text-primary-400 bg-primary-900/20 px-2 py-1 rounded w-fit">{line.replace(/\*\*/g, '')}</div>;
                    if (line.trim()) return <p key={i} className="text-sm text-slate-400 mt-1">{line}</p>;
                    return null;
                })}
            </div>

            {/* Steps */}
            {stepSections.map((section, idx) => {
                const lines = section.split('\n');
                const title = lines[0].trim();
                const bodyLines = lines.slice(1);
                
                // Helper to detect code blocks
                const renderBody = () => {
                    const elements: React.ReactNode[] = [];
                    let inCodeBlock = false;
                    let codeBuffer = '';
                    let currentLang = 'text';
                    
                    bodyLines.forEach((line, lineIdx) => {
                        if (line.trim().startsWith('```')) {
                            if (inCodeBlock) {
                                // End of block
                                elements.push(<CodeBlock key={`code-${idx}-${lineIdx}`} code={codeBuffer.trim()} language={currentLang} onCopy={onCopy} />);
                                codeBuffer = '';
                                inCodeBlock = false;
                            } else {
                                // Start of block - capture language
                                const match = line.trim().match(/^```(\w+)?/);
                                currentLang = match ? match[1] || 'text' : 'text';
                                inCodeBlock = true;
                            }
                        } else if (inCodeBlock) {
                            codeBuffer += line + '\n';
                        } else {
                            // Normal text
                            if (!line.trim()) return;
                            
                            // Simple List Item
                            if (line.trim().startsWith('- ')) {
                                elements.push(
                                    <div key={`list-${idx}-${lineIdx}`} className="flex items-start gap-2 mb-1 pl-2">
                                        <span className="text-slate-500 mt-1.5">•</span>
                                        <span className="text-slate-300 text-sm flex-1 leading-relaxed">
                                            {renderInline(line.replace('- ', ''))}
                                        </span>
                                    </div>
                                );
                            } else {
                                elements.push(
                                    <p key={`p-${idx}-${lineIdx}`} className="text-slate-400 text-sm mb-1 leading-relaxed">
                                        {renderInline(line)}
                                    </p>
                                );
                            }
                        }
                    });
                    return elements;
                };

                return (
                    <div key={idx} className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-white/10 transition-colors">
                        <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-xs text-slate-400">{idx + 1}</span>
                            {title}
                        </h4>
                        <div className="pl-7">
                            {renderBody()}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Page Component ---

const Part5Export: React.FC = React.memo(() => {
  const { state, currentProjectId, logEvent } = useProject();
  const { tools, answers, persona, prdOutput, techOutput, researchOutput, agentOutputs, settings } = state;
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('index');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Load checklist state from session storage to persist across navigation
  useEffect(() => {
    const saved = sessionStorage.getItem(`vibe_checklist_${currentProjectId}`);
    if (saved) {
        try {
            setCheckedItems(new Set(JSON.parse(saved)));
        } catch (e) {
            console.error("Failed to load checklist", e);
        }
    }
  }, [currentProjectId]);

  // Set default tab based on selected tools
  useEffect(() => {
    if (tools.length > 0) {
        // Prioritize specific tools if available, otherwise Index
        if (tools.includes(TOOL_IDS.CURSOR)) setActiveTab(TOOL_IDS.CURSOR);
        else if (tools.includes(TOOL_IDS.WINDSURF)) setActiveTab(TOOL_IDS.WINDSURF);
        else if (tools.includes(TOOL_IDS.CLINE)) setActiveTab(TOOL_IDS.CLINE);
        else setActiveTab('index'); 
    }
  }, [tools]);

  const toggleCheck = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCheckedItems(newSet);
    sessionStorage.setItem(`vibe_checklist_${currentProjectId}`, JSON.stringify(Array.from(newSet)));
  };

  if (!persona) return <PersonaError />;

  const projectName = answers['project_description'] 
    ? answers['project_description'].replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30) 
    : 'vibe_project';

  // Identify selected tools for the guide
  const selectedToolDefs = tools.map(tId => TOOLS.find(t => t.id === tId)).filter(Boolean);
  const hasAgentConfig = agentOutputs && Object.keys(agentOutputs).length > 0;

  // --- Actions ---

  const handleExport = async () => {
      // Check user preference
      const format = settings.defaultExportFormat || 'zip';
      
      if (format === 'markdown') {
          handleCopyAllMarkdown();
      } else {
          handleDownloadZip();
      }
  };

  const handleCopyAllMarkdown = () => {
      let combined = `# ${projectName.toUpperCase()} - PROJECT EXPORT\n\n`;
      
      if (researchOutput) combined += `## RESEARCH\n${researchOutput}\n\n---\n\n`;
      if (prdOutput) combined += `## PRD\n${prdOutput}\n\n---\n\n`;
      if (techOutput) combined += `## TECH DESIGN\n${techOutput}\n\n---\n\n`;
      if (hasAgentConfig) {
          Object.entries(agentOutputs).forEach(([filename, content]) => {
              combined += `## ${filename}\n\`\`\`markdown\n${content}\n\`\`\`\n\n---\n\n`;
          });
      }
      
      navigator.clipboard.writeText(combined);
      addToast('Full project markdown copied to clipboard!', 'success');
      logEvent('export_kit', { project: projectName, format: 'markdown' });
      toggleCheck('download');
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const root = zip.folder(projectName) || zip;

    // 1. Add Agent Configs to Root
    if (agentOutputs) {
        Object.entries(agentOutputs).forEach(([filename, content]) => {
            root.file(filename, content);
        });
    }

    // 2. Add Documentation folder
    const docs = root.folder("docs");
    if (docs) {
        if (researchOutput) docs.file(`research.md`, researchOutput);
        if (prdOutput) docs.file(`prd.md`, prdOutput);
        if (techOutput) docs.file(`tech_design.md`, techOutput);
        
        // Add Protocols
        const protocols = docs.folder("launch_protocols");
        if (protocols) {
            protocols.file("LAUNCH_PROTOCOLS_INDEX.md", LAUNCH_PROTOCOL_INDEX);
            // Include protocols for selected tools
            tools.forEach(tId => {
                const protocol = getLaunchProtocol(tId, state.toolSettings);
                if (protocol) {
                    protocols.file(`LAUNCH_PROTOCOL_${tId.toUpperCase()}.md`, protocol);
                }
            });
        }
    }

    // 3. Generate README
    const readmeContent = `# ${answers['project_description'] || 'Vibe Coding Project'}

Generated by Vibe-Coding Workflow.

## Quick Start
1. Install dependencies (see docs/tech_design.md)
2. Open in your AI Editor (Cursor, Windsurf, etc.)
3. Check \`docs/launch_protocols/LAUNCH_PROTOCOLS_INDEX.md\` for specific setup guides.
4. Start coding!

## Agent Setup
This project includes \`${FILE_NAMES.AGENTS_MD}\`. 
Your AI agent will use this as its primary context.
`;
    root.file("README.md", readmeContent);

    // Generate blob
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_kit.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Log Event
    logEvent('export_kit', { project: projectName, tools, format: 'zip' });

    addToast('Project kit downloaded!', 'success');
    toggleCheck('download'); // Auto-check download
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'info');
  };

  // --- Tab Content ---

  const renderToolGuide = () => {
     if (activeTab === 'index') {
         return (
             <div className="space-y-4 animate-fade-in">
                 <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                        <BookOpen size={14} className="text-primary-400"/> Protocol Index
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                        Quick reference for all supported AI coding tools. Select a tab above for detailed instructions.
                    </p>
                    {/* Render Index Markdown Table-ish */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead className="border-b border-white/10 text-slate-200">
                                <tr>
                                    <th className="pb-2 pr-4">Service</th>
                                    <th className="pb-2 pr-4">Time</th>
                                    <th className="pb-2">Integration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {TOOLS.map(t => (
                                    <tr key={t.id} className="group hover:bg-white/5 cursor-pointer" onClick={() => setActiveTab(t.id)}>
                                        <td className="py-2 pr-4 font-medium text-slate-300 group-hover:text-primary-400 transition-colors">{t.name}</td>
                                        <td className="py-2 pr-4">~5-10m</td>
                                        <td className="py-2">{t.supportLevel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
             </div>
         );
     }

     const protocolContent = getLaunchProtocol(activeTab, state.toolSettings);
     if (protocolContent) {
         return <MarkdownRenderer content={protocolContent} onCopy={copyToClipboard} />;
     }

     return <div className="text-slate-500 italic p-4">Protocol not available for this tool.</div>;
  };

  const isZipDefault = settings.defaultExportFormat === 'zip' || !settings.defaultExportFormat;

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Part V: Export & Deploy</h2>
        <p className="text-slate-400">Mission Control. Download your kit, follow the protocol, and launch.</p>
      </div>

      <ModelStatus />

      {/* Main Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: The Kit */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                     <Package size={18} className="text-primary-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-200">The Vibe Kit</h3>
             </div>
             
             <GlassCard className="h-full flex flex-col">
                 <div className="flex-1 space-y-4 mb-8">
                     <p className="text-sm text-slate-400 mb-4">
                         Everything you need to build <strong>{answers['project_description'] ? answers['project_description'].substring(0, 30) : 'your app'}</strong>.
                     </p>
                     
                     {/* File Manifest */}
                     <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                         {researchOutput && (
                             <FileRow 
                                name="research.md" 
                                desc="Market Analysis & Feasibility" 
                                icon={<FileText size={16} className="text-blue-400"/>} 
                                content={researchOutput}
                                onCopy={copyToClipboard}
                             />
                         )}
                         {prdOutput && (
                             <FileRow 
                                name="prd.md" 
                                desc="Product Specs & Requirements" 
                                icon={<FileText size={16} className="text-purple-400"/>} 
                                content={prdOutput}
                                onCopy={copyToClipboard}
                             />
                         )}
                         {techOutput && (
                             <FileRow 
                                name="tech_design.md" 
                                desc="Architecture & Stack" 
                                icon={<FileText size={16} className="text-emerald-400"/>} 
                                content={techOutput}
                                onCopy={copyToClipboard}
                             />
                         )}
                         {hasAgentConfig && (
                             <>
                                <div className="mt-4 mb-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold px-1">Agent Config</div>
                                <FileRow 
                                    name={FILE_NAMES.AGENTS_MD} 
                                    desc="Universal Agent Brain" 
                                    icon={<FileJson size={16} className="text-primary-400"/>} 
                                    content={agentOutputs[FILE_NAMES.AGENTS_MD]}
                                    onCopy={copyToClipboard}
                                />
                                {Object.keys(agentOutputs).filter(k => k !== FILE_NAMES.AGENTS_MD).map(filename => (
                                     <FileRow 
                                        key={filename}
                                        name={filename} 
                                        desc="Tool-Specific Config" 
                                        icon={<Monitor size={16} className="text-slate-400"/>} 
                                        content={agentOutputs[filename]}
                                        onCopy={copyToClipboard}
                                    />
                                ))}
                             </>
                         )}
                     </div>
                 </div>

                 <div className="flex gap-2">
                    <Button onClick={handleExport} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20 group">
                        {isZipDefault ? <Download size={18} className="group-hover:-translate-y-1 transition-transform" /> : <Copy size={18} />} 
                        {isZipDefault ? "Download Kit (.zip)" : "Copy Full Markdown"}
                    </Button>
                    
                    {/* Secondary Option Button */}
                    <Button onClick={isZipDefault ? handleCopyAllMarkdown : handleDownloadZip} variant="secondary" className="px-3" tooltip={isZipDefault ? "Copy as Markdown instead" : "Download as ZIP instead"}>
                        {isZipDefault ? <Copy size={18} /> : <Download size={18} />}
                    </Button>
                 </div>
             </GlassCard>
          </div>

          {/* Right Column: The Protocol */}
          <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                     <Command size={18} className="text-blue-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-200">Launch Protocol</h3>
             </div>

             <GlassCard className="h-full flex flex-col">
                 {/* Protocol Tabs */}
                 <div className="flex border-b border-white/10 mb-6 overflow-x-auto custom-scrollbar pb-1">
                     <button 
                        onClick={() => setActiveTab('index')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'index' ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                     >
                        Index
                     </button>
                     {selectedToolDefs.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-primary-400 text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.name}
                        </button>
                     ))}
                 </div>

                 <div className="flex-1">
                    {renderToolGuide()}
                 </div>

                 {/* Interactive Checklist */}
                 <div className="mt-8 pt-6 border-t border-white/10">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={12} className="text-primary-400" /> Next Steps Checklist
                     </h4>
                     <div className="space-y-1">
                        <ChecklistItem 
                            id="download" 
                            label="Download & Unzip Vibe Kit" 
                            isChecked={checkedItems.has('download')} 
                            toggle={toggleCheck} 
                        />
                        <ChecklistItem 
                            id="git" 
                            label={<span className="font-mono text-xs">git init</span>} 
                            isChecked={checkedItems.has('git')} 
                            toggle={toggleCheck} 
                        />
                         <ChecklistItem 
                            id="deps" 
                            label="Install Dependencies" 
                            isChecked={checkedItems.has('deps')} 
                            toggle={toggleCheck} 
                        />
                        <ChecklistItem 
                            id="config" 
                            label={`Verify ${FILE_NAMES.AGENTS_MD} is in root`} 
                            isChecked={checkedItems.has('config')} 
                            toggle={toggleCheck} 
                        />
                        <ChecklistItem 
                            id="prompt" 
                            label="Run First Agent Prompt" 
                            isChecked={checkedItems.has('prompt')} 
                            toggle={toggleCheck} 
                        />
                     </div>
                 </div>
             </GlassCard>
          </div>
      </div>

      <StepNavigation 
         prev={{ label: 'Agent Config', path: '/agent' }}
      />
    </div>
  );
});

export default Part5Export;
