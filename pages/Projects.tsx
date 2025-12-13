
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { GlassCard, Button, PageTransition, Modal, Input } from '../components/UI';
import { Plus, Trash2, Calendar, FolderOpen, User, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Persona, ProjectState } from '../types';
import { useToast } from '../components/Toast';

const Projects: React.FC = () => {
  const { projects, currentProjectId, createProject, loadProject, deleteProject, importProjects } = useProject();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpen = (id: string) => {
    loadProject(id);
    navigate('/');
  };

  const openCreateModal = () => {
    setNewProjectName('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = () => {
    const name = newProjectName.trim() || "Untitled Project";
    const newId = createProject(name);
    if (newId) {
        setIsCreateOpen(false);
        navigate('/');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleExport = (e: React.MouseEvent, project: ProjectState) => {
    e.stopPropagation();
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_vibe.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      addToast('Project exported successfully', 'success');
    } catch (err) {
      addToast('Failed to export project', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Support importing a single project object or an array of them
        // Also possibly support the raw storage dump format { projects: {}, currentId: '' }
        
        let projectsToImport: ProjectState[] = [];
        
        if (Array.isArray(json)) {
            projectsToImport = json;
        } else if (json.id && json.name) {
            // Single project
            projectsToImport = [json];
        } else if (json.projects) {
            // Full storage dump
            projectsToImport = Object.values(json.projects);
        }

        const valid = projectsToImport.every((p: any) => p.id && p.name);
        
        if (valid && projectsToImport.length > 0) {
            importProjects(projectsToImport);
        } else {
             addToast('Invalid project file format', 'error');
        }
      } catch (err) {
        addToast('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteProject(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const getPersonaLabel = (p: Persona | null) => {
    switch (p) {
      case Persona.VibeCoder: return 'Vibe Coder';
      case Persona.Developer: return 'Developer';
      case Persona.InBetween: return 'Learner';
      default: return 'No Persona';
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-100 mb-2">My Projects</h2>
            <p className="text-slate-400">Manage your saved vibe-coding sessions.</p>
          </div>
          <div className="flex items-center gap-3">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
             <Button onClick={handleImportClick} variant="secondary" className="border-white/10 text-slate-300">
                <Upload size={18} className="mr-2"/> Import
             </Button>
             <Button onClick={openCreateModal} variant="primary">
                <Plus size={18} /> New Project
             </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <GlassCard 
              key={project.id} 
              className={`group cursor-pointer transition-all duration-300 ${
                project.id === currentProjectId ? 'border-primary-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'hover:border-white/20'
              }`}
            >
              <div onClick={() => handleOpen(project.id)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg bg-surface/80 border border-white/5 text-primary-400">
                    <FolderOpen size={20} />
                  </div>
                  {project.id === currentProjectId && (
                    <span className="px-2 py-1 rounded text-[10px] bg-primary-900/30 text-primary-400 border border-primary-500/30 font-mono uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white mb-2 truncate pr-8">{project.name}</h3>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{getPersonaLabel(project.persona)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatDate(project.lastModified)}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-auto pt-4 border-t border-white/5 items-center">
                   {/* Research Indicator */}
                   <div 
                     className={`h-2 w-2 rounded-full ${project.researchOutput ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-slate-800'}`} 
                     title={project.researchOutput ? "Research Complete" : "Research Pending"} 
                   />
                   {/* PRD Indicator */}
                   <div 
                     className={`h-2 w-2 rounded-full ${project.prdOutput ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' : 'bg-slate-800'}`} 
                     title={project.prdOutput ? "PRD Complete" : "PRD Pending"} 
                   />
                   {/* Tech Indicator */}
                   <div 
                     className={`h-2 w-2 rounded-full ${project.techOutput ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-800'}`} 
                     title={project.techOutput ? "Tech Design Complete" : "Tech Design Pending"} 
                   />
                   {/* Agent Indicator */}
                   <div 
                     className={`h-2 w-2 rounded-full ${Object.keys(project.agentOutputs).length > 0 ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]' : 'bg-slate-800'}`} 
                     title={Object.keys(project.agentOutputs).length > 0 ? "Agent Configured" : "Agent Config Pending"} 
                   />
                   
                   <div className="ml-auto flex items-center gap-1">
                        <button 
                          onClick={(e) => handleExport(e, project)}
                          className="p-2 text-slate-600 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Export Project JSON"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, project.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                   </div>
                </div>
              </div>
            </GlassCard>
          ))}
          
          {/* Create New Card (Empty State) */}
          <button 
             onClick={openCreateModal}
             className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary-500/30 text-slate-400 hover:text-white transition-all min-h-[200px] group"
          >
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} className="text-primary-400" />
             </div>
             <span className="font-medium">Create New Project</span>
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Project">
            <div className="space-y-4">
                <p className="text-slate-300">Are you sure you want to delete this project? This action cannot be undone and all generated research, PRDs, and configurations will be lost.</p>
                <div className="flex justify-end gap-3 pt-4">
                     <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                     <Button 
                        variant="primary" 
                        onClick={confirmDelete} 
                        className="bg-red-600/80 hover:bg-red-500 border-red-500/50 shadow-none hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                     >
                        Delete Project
                     </Button>
                </div>
            </div>
        </Modal>

        {/* Create Project Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project">
           <div className="space-y-6">
              <Input 
                 label="Project Name" 
                 placeholder="e.g., AI Travel Planner" 
                 value={newProjectName} 
                 onChange={(e) => setNewProjectName(e.target.value)}
                 autoFocus
              />
              <div className="flex justify-end gap-3">
                 <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                 <Button onClick={handleCreateSubmit}>Create Project</Button>
              </div>
           </div>
        </Modal>
      </div>
    </PageTransition>
  );
};

export default Projects;
