
import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Check, X, Info, ChevronDown, Sparkles, Send, Loader2, AlertTriangle, AlertCircle, Download, Printer, Edit2, Save, FileText, FileJson, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Link } from 'react-router-dom';

// --- Animations ---
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -15, filter: 'blur(5px)' }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="h-full"
  >
    {children}
  </motion.div>
);

// --- Loading Components ---

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export const GenerationLoader: React.FC<{ label?: string }> = ({ label = "AI is thinking..." }) => (
  <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface/30 border border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
     <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent animate-pulse"></div>
     
     {/* Sci-fi Spinner */}
     <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute inset-2 border-2 border-t-primary-500 border-r-primary-500 border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
        <div className="absolute inset-5 bg-primary-500/10 rounded-full backdrop-blur-sm animate-pulse"></div>
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-400" size={24} />
     </div>

     <h3 className="text-lg font-display font-bold text-white mb-2 tracking-wide">{label}</h3>
     <div className="flex gap-1.5 mb-8">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
     </div>
     
     <div className="space-y-3 w-full max-w-sm opacity-30">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[95%]" />
        <Skeleton className="h-3 w-[80%]" />
     </div>
  </div>
);

// --- Components ---

export const Breadcrumbs: React.FC<{ items: { label: string; path?: string }[] }> = ({ items }) => (
  <nav className="flex items-center text-xs font-mono text-slate-500 mb-6 uppercase tracking-wider">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="mx-2 text-slate-700">/</span>}
        {item.path ? (
          <Link to={item.path} className="hover:text-primary-400 transition-colors">
            {item.label}
          </Link>
        ) : (
          <span className="text-slate-300">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const StepNavigation: React.FC<{
  prev?: { label: string; path: string };
  next?: { label: string; path: string; disabled?: boolean };
  onPrefetchNext?: () => void;
}> = ({ prev, next, onPrefetchNext }) => (
  <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/5">
    {prev ? (
      <Link to={prev.path}>
        <Button variant="secondary" className="group pl-3">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="ml-2">{prev.label}</span>
        </Button>
      </Link>
    ) : <div></div>}
    
    {next && (
      <Link 
        to={next.path} 
        className={next.disabled ? 'pointer-events-none' : ''}
        onMouseEnter={onPrefetchNext}
        onFocus={onPrefetchNext}
      >
         <Button variant="primary" className="group pr-3" disabled={next.disabled}>
           <span className="mr-2">{next.label}</span>
           <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
         </Button>
      </Link>
    )}
  </div>
);

export const PipelineProgress: React.FC<{ 
  steps: { label: string; path: string; isComplete: boolean; isActive: boolean }[] 
}> = ({ steps }) => {
  const completedCount = steps.filter(s => s.isComplete).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="w-full mb-8 px-2">
      <div className="flex justify-between text-xs font-mono text-slate-500 mb-2 uppercase tracking-widest">
        <span>Pipeline Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-slate-800 h-1 mb-6 rounded-full overflow-hidden">
        <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-primary-500"
        />
      </div>
      <div className="flex items-center justify-between relative max-w-4xl mx-auto">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10 rounded-full" />
        
        {steps.map((step, index) => (
          <Link to={step.path} key={index} className="group relative focus:outline-none">
             <div className={`
               flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 ease-out z-10 relative
               ${step.isActive 
                  ? 'bg-primary-950 border-primary-500 text-primary-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110' 
                  : step.isComplete 
                    ? 'bg-primary-900/20 border-primary-500/50 text-primary-500' 
                    : 'bg-slate-950 border-slate-800 text-slate-600 group-hover:border-slate-600'
               }
             `}>
               {step.isComplete && !step.isActive ? (
                  <Check size={18} strokeWidth={3} />
               ) : (
                  <span className="text-sm font-mono font-bold">{index + 1}</span>
               )}
             </div>
             
             {/* Label */}
             <div className={`
               absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest transition-all duration-300
               ${step.isActive ? 'text-primary-400 translate-y-0' : step.isComplete ? 'text-slate-400' : 'text-slate-700'}
             `}>
               {step.label}
             </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const Tooltip: React.FC<{ content: string; children: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right'; className?: string }> = ({ content, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getAnimationProps = () => {
    switch (position) {
      case 'top':
        return { initial: { opacity: 0, scale: 0.9, y: 5, x: "-50%" }, animate: { opacity: 1, scale: 1, y: 0, x: "-50%" } };
      case 'bottom':
        return { initial: { opacity: 0, scale: 0.9, y: -5, x: "-50%" }, animate: { opacity: 1, scale: 1, y: 0, x: "-50%" } };
      case 'left':
        return { initial: { opacity: 0, scale: 0.9, x: 5, y: "-50%" }, animate: { opacity: 1, scale: 1, x: 0, y: "-50%" } };
      case 'right':
        return { initial: { opacity: 0, scale: 0.9, x: -5, y: "-50%" }, animate: { opacity: 1, scale: 1, x: 0, y: "-50%" } };
      default:
        return { initial: { opacity: 0, scale: 0.9, y: 5 }, animate: { opacity: 1, scale: 1, y: 0 } };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return { bottom: '100%', left: '50%', marginBottom: '10px' };
      case 'bottom':
        return { top: '100%', left: '50%', marginTop: '10px' };
      case 'left':
        return { right: '100%', top: '50%', marginRight: '10px' };
      case 'right':
        return { left: '100%', top: '50%', marginLeft: '10px' };
      default:
        return {};
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top': return 'left-1/2 -translate-x-1/2 border-t-slate-800 -bottom-2 border-l-transparent border-r-transparent border-b-0';
      case 'bottom': return 'left-1/2 -translate-x-1/2 border-b-slate-800 -top-2 border-l-transparent border-r-transparent border-t-0';
      case 'left': return 'top-1/2 -translate-y-1/2 border-l-slate-800 -right-2 border-t-transparent border-b-transparent border-r-0';
      case 'right': return 'top-1/2 -translate-y-1/2 border-r-slate-800 -left-2 border-t-transparent border-b-transparent border-l-0';
      default: return '';
    }
  };

  const anim = getAnimationProps();

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.initial}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900/95 backdrop-blur border border-white/10 rounded-lg shadow-xl w-max max-w-[250px] whitespace-normal pointer-events-none"
            style={getPositionStyles()}
          >
            {content}
            <div 
              className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title?: string }> = ({ isOpen, onClose, children, title }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
        />
        <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-[#09090b] border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-10">
              <h3 className="text-xl font-bold text-white font-display">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 md:p-8">
              {children}
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; hoverEffect?: boolean }> = ({ 
  children, 
  className = '',
  hoverEffect = false
}) => (
  <motion.div 
    whileHover={hoverEffect ? { y: -4, boxShadow: "0 20px 40px -10px rgba(16, 185, 129, 0.1)" } : {}}
    initial={{ border: '1px solid rgba(255,255,255,0.05)' }}
    className={`bg-glass-100 backdrop-blur-xl border border-glass-border rounded-2xl p-6 relative overflow-hidden ${className}`}
  >
    {/* Subtle gradient sheen */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: 'primary' | 'secondary' | 'outline';
  tooltip?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  className = '', 
  variant = 'primary', 
  children, 
  tooltip,
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-white/10",
    secondary: "bg-surface/50 backdrop-blur-md text-slate-200 hover:bg-surface/80 border border-white/5 hover:border-white/10",
    outline: "border border-white/10 text-slate-400 hover:border-primary-500/50 hover:text-primary-400 bg-transparent"
  };

  const btn = (
    <motion.button 
      whileHover={props.disabled ? {} : { scale: 1.02 }}
      whileTap={props.disabled ? {} : { scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === 'primary' && !props.disabled && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip} className={className.includes('w-full') ? 'w-full' : 'w-fit'}>{btn}</Tooltip>;
  }
  return btn;
};

// --- Form Fields ---

export const FieldWrapper: React.FC<{
  label: string;
  tooltip?: string;
  error?: string;
  rightLabel?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ label, tooltip, error, rightLabel, children, className = '' }) => (
  <div className={`mb-5 group ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <label className={`block text-xs font-mono font-medium uppercase tracking-widest transition-colors ${error ? 'text-red-400' : 'text-slate-500 group-focus-within:text-primary-400'}`}>
          {label}
        </label>
        {tooltip && (
          <Tooltip content={tooltip}>
             <Info size={12} className="text-slate-600 hover:text-primary-400 cursor-help transition-colors" />
          </Tooltip>
        )}
      </div>
      {rightLabel}
    </div>
    <div className="relative">
      {children}
    </div>
    {error && (
      <motion.p 
        initial={{ opacity: 0, y: -5 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-red-400 text-[10px] mt-1.5 font-medium flex items-center gap-1"
      >
        {error}
      </motion.p>
    )}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tooltip?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, tooltip, error, className = '', ...props }) => (
  <FieldWrapper label={label} tooltip={tooltip} error={error}>
    <input 
      className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 ${
        error 
          ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]'
      } ${className}`}
      {...props}
    />
    {error && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
        <AlertCircle size={16} />
      </div>
    )}
  </FieldWrapper>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  tooltip?: string;
  error?: string;
  showCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({ 
  label, 
  tooltip, 
  error, 
  showCount = true,
  maxLength, 
  className = '', 
  value, 
  onChange,
  ...props 
}) => {
  // Rely on controlled updates from parent to avoid race conditions with validation on blur
  const currentLength = value ? String(value).length : 0;
  const isNearLimit = maxLength && currentLength > maxLength * 0.9;
  const isOverLimit = maxLength && currentLength > maxLength;

  const countLabel = showCount && maxLength ? (
    <span className={`text-[10px] font-mono transition-colors ${
      isOverLimit ? 'text-red-400 font-bold' : isNearLimit ? 'text-amber-400' : 'text-slate-600'
    }`}>
      {currentLength}/{maxLength}
    </span>
  ) : null;

  return (
    <FieldWrapper label={label} tooltip={tooltip} error={error} rightLabel={countLabel}>
      <textarea 
        className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 min-h-[120px] resize-y ${
          error || isOverLimit
            ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
            : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]'
        } ${className}`}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        {...props}
      />
    </FieldWrapper>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  tooltip?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, tooltip, error, children, className = '', ...props }) => (
  <FieldWrapper label={label} tooltip={tooltip} error={error}>
    <select 
      className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 appearance-none ${
         error 
          ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
       <ChevronDown size={14} />
    </div>
  </FieldWrapper>
);

export const CopyBlock: React.FC<{ 
    content: string; 
    label?: string; 
    isStreaming?: boolean;
    onEdit?: (newContent: string) => void;
    timestamp?: number;
    fileName?: string;
}> = ({ content, label, isStreaming, onEdit, timestamp, fileName = 'vibe-document' }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [showExport, setShowExport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local edit state with external content updates (e.g. streaming) if not currently editing
  useEffect(() => {
    if (!isEditing) {
        setEditValue(content);
    }
  }, [content, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
      if (onEdit) onEdit(editValue);
      setIsEditing(false);
  };

  const handleCancelEdit = () => {
      setEditValue(content);
      setIsEditing(false);
  };

  const downloadFile = (format: 'md' | 'json') => {
      let data = content;
      let type = 'text/markdown';
      let name = `${fileName}.md`;

      if (format === 'json') {
          data = JSON.stringify({ content, timestamp: timestamp || Date.now() }, null, 2);
          type = 'application/json';
          name = `${fileName}.json`;
      }

      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExport(false);
  };

  const printContent = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
                <head>
                    <title>${fileName} - Print View</title>
                    <style>
                        body { font-family: monospace; white-space: pre-wrap; padding: 20px; color: #000; }
                    </style>
                </head>
                <body>${content}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
      }
      setShowExport(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setShowExport(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current && !isEditing) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isStreaming, isEditing]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group mt-8"
    >
      <div className="flex items-center justify-between mb-2 pl-1">
         <div className="flex items-center gap-3">
            {label && <div className="text-xs font-mono text-primary-400 uppercase tracking-widest">{label}</div>}
            {timestamp && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} />
                    <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )}
         </div>
         
         <div className="flex items-center gap-1">
            {onEdit && !isEditing && (
                <button 
                    onClick={() => setIsEditing(true)} 
                    className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-white/5 rounded transition-colors"
                    title="Edit content"
                >
                    <Edit2 size={14} />
                </button>
            )}
            
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setShowExport(!showExport)}
                    className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-white/5 rounded transition-colors"
                    title="Export options"
                >
                    <Download size={14} />
                </button>
                {showExport && (
                    <div className="absolute right-0 top-full mt-2 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                        <button onClick={() => downloadFile('md')} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left">
                            <FileText size={12} /> Markdown
                        </button>
                        <button onClick={() => downloadFile('json')} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left">
                            <FileJson size={12} /> JSON
                        </button>
                        <button onClick={printContent} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left">
                            <Printer size={12} /> Print PDF
                        </button>
                    </div>
                )}
            </div>

            <button 
                onClick={handleCopy}
                className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-white/5 rounded transition-colors"
                title="Copy to clipboard"
            >
                {copied ? <Check size={14} className="text-emerald-400"/> : <Clipboard size={14} />}
            </button>
         </div>
      </div>

      {isEditing ? (
        <div className="bg-[#050505] border border-primary-500/30 rounded-xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-[400px] bg-transparent text-sm font-mono text-slate-300 focus:outline-none resize-none custom-scrollbar p-2"
                autoFocus
            />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
                <Button variant="secondary" onClick={handleCancelEdit} className="h-8 text-xs">Cancel</Button>
                <Button onClick={handleSaveEdit} className="h-8 text-xs bg-primary-600 hover:bg-primary-500"><Save size={14}/> Save Changes</Button>
            </div>
        </div>
      ) : (
        <div 
            ref={scrollRef}
            className="bg-[#050505] border border-white/10 rounded-xl p-6 font-mono text-sm text-slate-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner custom-scrollbar relative"
        >
            <div className="absolute top-0 right-0 p-4 bg-gradient-to-l from-[#050505] to-transparent w-20 h-full pointer-events-none" />
            {content || <span className="text-slate-700 italic">Generate content to view code...</span>}
            {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary-500 ml-1 animate-pulse align-middle shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            )}
        </div>
      )}
    </motion.div>
  );
};

export const RefinementControl: React.FC<{ 
  onRefine: (text: string) => void; 
  isRefining: boolean;
  placeholder?: string;
}> = ({ onRefine, isRefining, placeholder = "Suggest changes (e.g., 'Make it more detailed', 'Focus on mobile')" }) => {
  const [text, setText] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !isRefining && !isDebouncing) {
      setIsDebouncing(true);
      onRefine(text);
      setText('');
      // Reset debounce after a short delay to allow UI to catch up
      setTimeout(() => setIsDebouncing(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary-400" />
        <h4 className="text-sm font-semibold text-slate-200">Refine with AI</h4>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={isRefining || isDebouncing}
          className="flex-1 bg-[#050505]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all disabled:opacity-50"
        />
        <Button 
          type="submit" 
          disabled={!text.trim() || isRefining || isDebouncing}
          variant="secondary"
          className="h-auto py-0 px-4"
        >
          {isRefining || isDebouncing ? (
             <Loader2 size={18} className="animate-spin text-primary-400" />
          ) : (
             <Send size={18} />
          )}
        </Button>
      </form>
      <p className="text-[10px] text-slate-500 mt-2 pl-1">
        Use this to tweak the output without regenerating from scratch. Context is preserved.
      </p>
    </motion.div>
  );
};

export const PersonaError: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
    <div className="p-6 bg-slate-900/50 rounded-full border border-slate-800">
      <AlertTriangle size={48} className="text-amber-500" />
    </div>
    <h2 className="text-2xl font-bold text-slate-100">Persona Not Selected</h2>
    <p className="text-slate-400 max-w-md">
      To generate content, we need to know your vibe (Vibe-Coder vs Developer). Please go back to the home page.
    </p>
    <Link to="/">
      <Button variant="primary">Return Home</Button>
    </Link>
  </div>
);
