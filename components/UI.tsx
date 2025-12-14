

import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, Check, X, Info, ChevronDown, Sparkles, Send, Loader2, AlertCircle, Download, Printer, Edit2, Save, FileText, FileJson, Clock, ArrowLeft, ArrowRight, Minimize2, Maximize2, Type, AlignLeft, Keyboard, Columns, List, Hash, Scissors, Briefcase, Plus, Search, Replace, ArrowUp, ArrowDown, CaseSensitive, WholeWord, StopCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

export const GenerationLoader: React.FC<{ label?: string; onCancel?: () => void }> = ({ label = "AI is thinking...", onCancel }) => (
  <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface/30 border border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
    <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent animate-pulse"></div>

    {/* Sci-fi Spinner */}
    <div className="relative w-20 h-20 mb-6">
      <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
      <div className="absolute inset-2 border-2 border-t-primary-500 border-r-primary-500 border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
      <div className="absolute inset-5 bg-primary-500/10 rounded-full backdrop-blur-sm animate-pulse"></div>
      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-400" size={24} />
    </div>

    <h3 className="text-lg font-display font-bold text-white mb-2 tracking-wide animate-pulse text-center">{label}</h3>

    {/* Progress Dots */}
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

    {onCancel && (
      <button
        onClick={onCancel}
        className="mt-8 flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors z-10"
      >
        <StopCircle size={14} /> Cancel Generation
      </button>
    )}
  </div>
);

// --- Components ---

export const Breadcrumbs: React.FC<{ items: { label: string; path?: string }[] }> = ({ items }) => (
  <nav className="flex items-center text-xs font-mono text-slate-400 mb-6 uppercase tracking-wider overflow-x-auto whitespace-nowrap pb-1">
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
  <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/5 flex-wrap gap-4">
    {prev ? (
      <Link to={prev.path} className="flex-1 md:flex-none">
        <Button variant="secondary" className="group pl-3 w-full md:w-auto">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="ml-2">{prev.label}</span>
        </Button>
      </Link>
    ) : <div className="flex-1 md:flex-none"></div>}

    {next && (
      <Link
        to={next.path}
        className={`flex-1 md:flex-none ${next.disabled ? 'pointer-events-none' : ''}`}
        onMouseEnter={onPrefetchNext}
        onFocus={onPrefetchNext}
      >
        <Button variant="primary" className="group pr-3 w-full md:w-auto" disabled={next.disabled}>
          <span className="mr-2">{next.label}</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </Link>
    )}
  </div>
);

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
            className="absolute z-[100] px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900/95 backdrop-blur border border-white/10 rounded-lg shadow-xl w-max max-w-[200px] md:max-w-[250px] whitespace-normal pointer-events-none hidden md:block"
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

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title?: string; maxWidth?: string }> = ({ isOpen, onClose, children, title, maxWidth = "max-w-2xl" }) => (
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
            className={`bg-[#09090b] border border-white/10 w-full ${maxWidth} max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto custom-scrollbar`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#09090b]/95 backdrop-blur-md z-10">
              <h3 className="text-lg md:text-xl font-bold text-white font-display">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 md:p-8">
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
    className={`bg-glass-100 backdrop-blur-xl border border-glass-border rounded-2xl p-5 md:p-6 relative overflow-hidden ${className}`}
  >
    {/* Subtle gradient sheen */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  tooltip?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'primary',
  children,
  tooltip,
  ...props
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base";

  const variants = {
    primary: "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] border border-white/10",
    secondary: "bg-surface/50 backdrop-blur-md text-slate-200 hover:bg-surface/80 border border-white/5 hover:border-white/10",
    outline: "border border-white/10 text-slate-400 hover:border-primary-500/50 hover:text-primary-400 bg-transparent",
    destructive: "bg-destructive-500/10 text-destructive-400 border border-destructive-500/50 hover:bg-destructive-500/20 hover:border-destructive-500 hover:text-destructive-300"
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
  required?: boolean;
}> = ({ label, tooltip, error, rightLabel, children, className = '', required }) => (
  <div className={`mb-5 group ${className}`}>
    <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
      <div className="flex items-center gap-2">
        <label className={`block text-xs font-mono font-medium uppercase tracking-widest transition-colors ${error ? 'text-destructive-400' : 'text-slate-400 group-focus-within:text-primary-400'}`}>
          {label} {required && <span className="text-destructive-400 ml-0.5">*</span>}
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
        className="text-destructive-400 text-[10px] mt-1.5 font-medium flex items-center gap-1"
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
  rightLabel?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, tooltip, error, rightLabel, className = '', ...props }) => (
  <FieldWrapper label={label} tooltip={tooltip} error={error} rightLabel={rightLabel} required={props.required}>
    <input
      className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-base md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 ${error
        ? 'border-destructive-500/50 focus:border-destructive-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]'
        : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.1)]'
        } ${className}`}
      {...props}
    />
    {error && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive-500 pointer-events-none">
        <AlertCircle size={16} />
      </div>
    )}
  </FieldWrapper>
);
// Alias for compatibility
export const TextInput = Input;

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  tooltip?: string;
  error?: string;
  showCount?: boolean;
  rightLabel?: React.ReactNode;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  tooltip,
  error,
  showCount = true,
  maxLength,
  rightLabel,
  className = '',
  value,
  onChange,
  ...props
}) => {
  const currentLength = value ? String(value).length : 0;
  const isNearLimit = maxLength && currentLength > maxLength * 0.9;
  const isOverLimit = maxLength && currentLength > maxLength;

  const countLabel = showCount && maxLength ? (
    <span className={`text-[10px] font-mono transition-colors ${isOverLimit ? 'text-destructive-400 font-bold' : isNearLimit ? 'text-amber-400' : 'text-slate-600'
      }`}>
      {currentLength}/{maxLength}
    </span>
  ) : null;

  const displayLabel = (rightLabel || countLabel) ? (
    <div className="flex items-center gap-2">
      {rightLabel}
      {countLabel}
    </div>
  ) : undefined;

  return (
    <FieldWrapper label={label} tooltip={tooltip} error={error} rightLabel={displayLabel} required={props.required}>
      <textarea
        className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-base md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 min-h-[120px] resize-y custom-scrollbar ${error || isOverLimit
          ? 'border-destructive-500/50 focus:border-destructive-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]'
          : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.1)]'
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
  rightLabel?: React.ReactNode;
  options?: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, tooltip, error, rightLabel, children, options, className = '', ...props }) => (
  <FieldWrapper label={label} tooltip={tooltip} error={error} rightLabel={rightLabel} required={props.required}>
    <div className="relative group">
      <select
        className={`w-full bg-surface/50 backdrop-blur-sm border rounded-xl px-4 py-3 text-base md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 transition-all duration-300 appearance-none cursor-pointer ${error
          ? 'border-destructive-500/50 focus:border-destructive-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]'
          : 'border-white/10 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.1)]'
          } ${className}`}
        {...props}
      >
        {children}
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-300 transition-colors">
        <ChevronDown size={14} />
      </div>
    </div>
  </FieldWrapper>
);

// --- Advanced Markdown Helpers ---

// Sanitize ID for anchors
const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// Markdown Preview Component
const MarkdownPreview: React.FC<{ content: string; scrollRef?: React.RefObject<HTMLDivElement> }> = ({ content, scrollRef }) => {

  const renderedContent = useMemo(() => {
    // Safe inline parser returning React Nodes instead of dangerouslySetInnerHTML
    const parseInline = (text: string): React.ReactNode[] => {
      const elements: React.ReactNode[] = [];
      let cursor = 0;

      // Match tokens: Code (`...`), Link ([...](...)), Bold (**...**)
      // We use a loop to find the earliest match
      while (cursor < text.length) {
        const remaining = text.slice(cursor);

        // Find first match of any type
        const codeMatch = remaining.match(/`([^`]+)`/);
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

        // Determine which match is earliest
        let firstMatch: { type: 'code' | 'link' | 'bold', index: number, length: number, match: RegExpMatchArray } | null = null;

        if (codeMatch && codeMatch.index !== undefined) {
          firstMatch = { type: 'code', index: codeMatch.index, length: codeMatch[0].length, match: codeMatch };
        }

        if (linkMatch && linkMatch.index !== undefined) {
          if (!firstMatch || linkMatch.index < firstMatch.index) {
            firstMatch = { type: 'link', index: linkMatch.index, length: linkMatch[0].length, match: linkMatch };
          }
        }

        if (boldMatch && boldMatch.index !== undefined) {
          if (!firstMatch || boldMatch.index < firstMatch.index) {
            firstMatch = { type: 'bold', index: boldMatch.index, length: boldMatch[0].length, match: boldMatch };
          }
        }

        if (!firstMatch) {
          // No more tokens, push remaining text
          elements.push(remaining);
          break;
        }

        // Push text before match
        if (firstMatch.index > 0) {
          elements.push(remaining.slice(0, firstMatch.index));
        }

        // Push Token
        if (firstMatch.type === 'code') {
          elements.push(
            <code key={`code-${cursor}-${firstMatch.index}`} className="bg-white/10 px-1 py-0.5 rounded text-emerald-300 font-mono text-sm">
              {firstMatch.match[1]}
            </code>
          );
        } else if (firstMatch.type === 'link') {
          elements.push(
            <a key={`link-${cursor}-${firstMatch.index}`} href={firstMatch.match[2]} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
              {parseInline(firstMatch.match[1])}
            </a>
          );
        } else if (firstMatch.type === 'bold') {
          elements.push(
            <strong key={`bold-${cursor}-${firstMatch.index}`} className="text-white font-bold">
              {parseInline(firstMatch.match[1])}
            </strong>
          );
        }

        // Advance cursor
        cursor += firstMatch.index + firstMatch.length;
      }

      return elements;
    };

    if (!content) return null;

    // Split by code blocks, handling potential unclosed blocks at the end (streaming safe)
    // Regex matches: ``` ... ``` OR ``` ... end-of-string
    const parts = content.split(/(```(?:[\s\S]*?```|[\s\S]*$))/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Render Code Block
        const lines = part.split('\n');
        // Extract language from first line (remove backticks)
        const langLine = lines[0];
        const language = langLine.replace(/`/g, '').trim() || 'text';

        // Code content is everything after first line
        let code = lines.slice(1).join('\n');

        // Remove closing backticks if they exist
        if (code.endsWith('```')) {
          code = code.slice(0, -3);
        } else if (code.endsWith('```\n')) { // Handle newline before backticks
          code = code.slice(0, -4);
        } else if (code.trim().endsWith('```')) { // Loose check
          const lastIndex = code.lastIndexOf('```');
          if (lastIndex !== -1) code = code.substring(0, lastIndex);
        }

        return (
          <div key={index} className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d0d]">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      } else {
        // Render Markdown Text
        return (
          <div key={index}>
            {part.split('\n').map((line, i) => {
              // Empty line
              if (!line.trim()) return <br key={i} />;

              // Headers
              if (line.startsWith('# ')) return <h1 id={slugify(line.replace('# ', ''))} key={i} className="text-3xl font-display font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">{line.replace('# ', '')}</h1>;
              if (line.startsWith('## ')) return <h2 id={slugify(line.replace('## ', ''))} key={i} className="text-2xl font-display font-bold text-primary-400 mt-6 mb-3">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 id={slugify(line.replace('### ', ''))} key={i} className="text-xl font-bold text-slate-200 mt-5 mb-2">{line.replace('### ', '')}</h3>;

              // Lists
              if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-300 mb-1 pl-1">{parseInline(line.replace(/^\s*-\s/, ''))}</li>;
              if (line.trim().match(/^\d+\. /)) return <li key={i} className="ml-4 list-decimal text-slate-300 mb-1 pl-1">{parseInline(line.replace(/^\s*\d+\.\s/, ''))}</li>;

              // Blockquotes
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-primary-500/50 pl-4 py-1 my-4 bg-primary-500/5 text-slate-400 italic">{parseInline(line.replace(/^>\s/, ''))}</blockquote>;

              // Paragraphs
              return <p key={i} className="text-slate-300 leading-relaxed mb-2">{parseInline(line)}</p>;
            })}
          </div>
        );
      }
    });
  }, [content]);

  return (
    <div
      ref={scrollRef}
      className="w-full h-full p-8 md:p-12 overflow-y-auto custom-scrollbar bg-[#050505] selection:bg-primary-500/30"
    >
      <div className="max-w-3xl mx-auto pb-32">
        {renderedContent}
      </div>
    </div>
  );
};

// Floating Table of Contents
const TableOfContents: React.FC<{ content: string; onSelect: (id: string) => void }> = ({ content, onSelect }) => {
  const headers = useMemo(() => {
    const lines = content.split('\n');
    const extracted = [];
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        extracted.push({
          level: match[1].length,
          text: match[2],
          id: slugify(match[2])
        });
      }
    }
    return extracted;
  }, [content]);

  if (headers.length === 0) return null;

  return (
    <div className="absolute top-20 right-6 w-64 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl z-50 animate-fade-in hidden xl:block">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Hash size={12} /> Table of Contents
      </h4>
      <div className="space-y-1">
        {headers.map((h, i) => (
          <button
            key={i}
            onClick={() => onSelect(h.id)}
            className={`block w-full text-left text-xs truncate py-1 px-2 rounded hover:bg-white/5 transition-colors ${h.level === 1 ? 'font-bold text-white' :
              h.level === 2 ? 'pl-4 text-slate-300' : 'pl-6 text-slate-400'
              }`}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
};

interface MagicWandMenuProps {
  position: { x: number, y: number };
  onSelect: (option: string) => void;
  isLoading: boolean;
  onClose: () => void;
}

const MagicWandMenu: React.FC<MagicWandMenuProps> = ({ position, onSelect, isLoading, onClose }) => {
  if (isLoading) {
    return (
      <div
        className="fixed z-[9999] p-2 bg-slate-900 border border-primary-500/50 rounded-lg shadow-xl flex items-center gap-2 pointer-events-none"
        style={{ left: position.x, top: position.y }}
      >
        <Loader2 size={16} className="animate-spin text-primary-400" />
        <span className="text-xs text-white">Refining...</span>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[9999] bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-slate-800 px-3 py-2 flex justify-between items-center border-b border-white/5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={10} className="text-primary-400" /> Magic Wand
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close menu"><X size={12} /></button>
      </div>
      <div className="p-1 space-y-0.5">
        <button onClick={() => onSelect('Make shorter')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-primary-500/20 hover:text-primary-300 rounded flex items-center gap-2 transition-colors">
          <Scissors size={14} /> Make Shorter
        </button>
        <button onClick={() => onSelect('Make professional')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 rounded flex items-center gap-2 transition-colors">
          <Briefcase size={14} /> Make Professional
        </button>
        <button onClick={() => onSelect('Fix grammar')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 rounded flex items-center gap-2 transition-colors">
          <Check size={14} /> Fix Grammar
        </button>
        <button onClick={() => onSelect('Expand')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-500/20 hover:text-purple-300 rounded flex items-center gap-2 transition-colors">
          <Plus size={14} /> Expand
        </button>
      </div>
    </div>
  );
};

// Helper to render highlights behind textarea
const HighlightOverlay: React.FC<{
  content: string;
  matches: { start: number, end: number }[];
  currentMatchIdx: number;
  scrollRef: React.RefObject<HTMLDivElement>;
}> = ({ content, matches, currentMatchIdx, scrollRef }) => {
  if (matches.length === 0) return <div ref={scrollRef} className="absolute inset-0 p-8 md:p-12 font-mono text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-hidden">{content}</div>;

  const parts = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // Text before match
    if (match.start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.start)}</span>);
    }

    // Match text
    const isCurrent = i === currentMatchIdx;
    parts.push(
      <span
        key={`match-${i}`}
        className={`${isCurrent ? 'bg-amber-500/60 text-transparent' : 'bg-yellow-500/30 text-transparent'} rounded-[2px]`}
      >
        {content.substring(match.start, match.end)}
      </span>
    );

    lastIndex = match.end;
  });

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={`text-end`}>{content.substring(lastIndex)}</span>);
  }

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 p-8 md:p-12 font-mono text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {parts}
    </div>
  );
};

export const CopyBlock: React.FC<{
  content: string;
  label?: string;
  isStreaming?: boolean;
  onEdit?: (newContent: string) => void;
  timestamp?: number;
  fileName?: string;
  onInlineRefine?: (selection: string, instruction: string) => Promise<string>;
}> = ({ content, label, isStreaming, onEdit, timestamp, fileName = 'vibe-document', onInlineRefine }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [showExport, setShowExport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline Refinement State
  const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Advanced Editor States
  const [splitView, setSplitView] = useState(false);
  const [showTOC, setShowTOC] = useState(true);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null); // Ref for highlighter overlay
  const previewRef = useRef<HTMLDivElement>(null);

  // New Hint State
  const [showHint, setShowHint] = useState(false);

  // Smart Search States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({ caseSensitive: false, wholeWord: false });
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);
  const [matches, setMatches] = useState<{ start: number, end: number }[]>([]);
  const [showReplace, setShowReplace] = useState(false);

  // Hint Logic
  useEffect(() => {
    if ((isFullscreen) && onInlineRefine) {
      const seen = localStorage.getItem('VIBE_WAND_HINT_SEEN');
      if (!seen) setShowHint(true);
    } else {
      setShowHint(false);
    }
  }, [isFullscreen, onInlineRefine]);

  // Sync local edit state with external content updates
  useEffect(() => {
    if (!isEditing && !isFullscreen) {
      setEditValue(content);
    }
  }, [content, isEditing, isFullscreen]);

  // Handle Ctrl+F for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        // Search input autofocus is handled by the input element itself
      }

      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        setMatches([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showSearch]);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Search Logic
  useEffect(() => {
    if (!searchQuery) {
      setMatches([]);
      setCurrentMatchIdx(-1);
      return;
    }

    try {
      const flags = searchOptions.caseSensitive ? 'g' : 'gi';
      const pattern = searchOptions.wholeWord ? `\\b${escapeRegExp(searchQuery)}\\b` : escapeRegExp(searchQuery);
      const regex = new RegExp(pattern, flags);

      const newMatches = [];
      let match;
      while ((match = regex.exec(editValue)) !== null) {
        newMatches.push({ start: match.index, end: match.index + match[0].length });
      }
      setMatches(newMatches);
      if (newMatches.length > 0) {
        setCurrentMatchIdx(0); // Reset to first match
      } else {
        setCurrentMatchIdx(-1);
      }
    } catch (e) {
      console.warn("Invalid regex", e);
    }
  }, [searchQuery, editValue, searchOptions]);

  const navigateMatch = (direction: 1 | -1) => {
    if (matches.length === 0) return;
    let nextIdx = currentMatchIdx + direction;
    if (nextIdx >= matches.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = matches.length - 1;

    setCurrentMatchIdx(nextIdx);

    // Scroll to match
    const match = matches[nextIdx];
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.setSelectionRange(match.start, match.end);

      // Auto-scroll calculation
      // We can use blur/focus hack or calculate coordinates. 
      // Simple blur/focus forces scroll on most browsers.
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      if (!isFirefox) {
        editorRef.current.blur();
        editorRef.current.focus();
      } else {
        // Firefox doesn't always scroll on focus, but setSelectionRange usually does if input.
      }
    }
  };

  const handleReplace = () => {
    if (currentMatchIdx === -1 || matches.length === 0) return;
    const match = matches[currentMatchIdx];
    const before = editValue.substring(0, match.start);
    const after = editValue.substring(match.end);
    const newValue = before + replaceQuery + after;
    setEditValue(newValue);
    // Logic to keep index or find next will naturally happen via useEffect dependency on editValue
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const flags = searchOptions.caseSensitive ? 'g' : 'gi';
    const pattern = searchOptions.wholeWord ? `\\b${escapeRegExp(searchQuery)}\\b` : escapeRegExp(searchQuery);
    const regex = new RegExp(pattern, flags);
    const newValue = editValue.replace(regex, replaceQuery);
    setEditValue(newValue);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit) onEdit(editValue);
    setIsEditing(false);
    setIsFullscreen(false);
  };

  const handleCancelEdit = () => {
    setEditValue(content);
    setIsEditing(false);
    setIsFullscreen(false);
  };

  // Fix: Use useLayoutEffect to attach direct DOM event listener for synchronous updates
  useLayoutEffect(() => {
    const textarea = editorRef.current;
    const overlay = overlayRef.current;
    const preview = previewRef.current;

    if (!textarea) return;

    const handleScroll = () => {
      // Sync Highlight Overlay
      if (overlay) {
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
      }

      // Sync Preview Pane (Split View)
      if (splitView && preview) {
        const scrollableHeight = textarea.scrollHeight - textarea.clientHeight;
        if (scrollableHeight > 0) {
          const percentage = textarea.scrollTop / scrollableHeight;
          preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
        }
      }
    };

    textarea.addEventListener('scroll', handleScroll, { passive: true });
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [splitView]);

  // NEW: handleMouseUp replaces handleSelect logic
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.button !== 0) return; // Only left click

    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (start !== end) {
      const selectedText = target.value.substring(start, end);
      if (selectedText.trim().length > 0 && onInlineRefine) {
        setSelection({ start, end, text: selectedText });
        setMenuPos({ x: e.clientX, y: e.clientY + 15 });

        if (showHint) {
          setShowHint(false);
          localStorage.setItem('VIBE_WAND_HINT_SEEN', 'true');
        }
      } else {
        setSelection(null);
        setMenuPos(null);
      }
    } else {
      setSelection(null);
      setMenuPos(null);
    }
  };

  const handleMouseDown = () => {
    setMenuPos(null);
  };

  const executeInlineRefinement = async (instruction: string) => {
    if (!selection || !onInlineRefine) return;

    setIsRefining(true);
    try {
      const refinedText = await onInlineRefine(selection.text, instruction);

      // Replace text
      const before = editValue.substring(0, selection.start);
      const after = editValue.substring(selection.end);
      const newValue = before + refinedText + after;

      setEditValue(newValue);

      // Clear selection
      setSelection(null);
      setMenuPos(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
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
      // Also close menu if clicking outside
      if (menuPos && !(event.target as HTMLElement).closest('button')) {
        if (!isRefining) setMenuPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPos, isRefining]);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current && !isEditing) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isStreaming, isEditing]);

  const handleTOCNavigation = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Guess Language for Highlighter
  const language = fileName?.endsWith('.json') ? 'json' : fileName?.endsWith('.md') ? 'markdown' : 'markdown';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group mt-8"
      >
        <div className="flex items-center justify-between mb-2 pl-1">
          <div className="flex items-center gap-3">
            {label && <div className="text-xs font-mono text-primary-400 uppercase tracking-widest">{label}</div>}
            {timestamp && (
              <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400">
                <Clock size={10} />
                <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Fullscreen Editor"
              aria-label="Enter fullscreen"
            >
              <Maximize2 size={14} />
            </button>

            {onEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-white/10 rounded transition-colors"
                title="Edit content"
                aria-label="Edit content"
              >
                <Edit2 size={14} />
              </button>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowExport(!showExport)}
                className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-white/10 rounded transition-colors"
                title="Export options"
                aria-label="Export options"
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
              className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-white/10 rounded transition-colors"
              title="Copy to clipboard"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-[#050505] border border-primary-500/30 rounded-xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onMouseUp={handleMouseUp}
              onMouseDown={handleMouseDown}
              className="w-full h-[400px] bg-transparent text-sm font-mono text-slate-300 focus:outline-none resize-none custom-scrollbar p-2"
              autoFocus
            />

            {/* Inline Magic Wand Menu */}
            {menuPos && onInlineRefine && (
              <MagicWandMenu
                position={menuPos}
                onSelect={executeInlineRefinement}
                isLoading={isRefining}
                onClose={() => setMenuPos(null)}
              />
            )}

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={handleCancelEdit} className="h-8 text-xs">Cancel</Button>
              <Button onClick={handleSaveEdit} className="h-8 text-xs bg-primary-600 hover:bg-primary-500"><Save size={14} /> Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl border border-white/10 bg-[#050505] shadow-inner group-hover:border-white/20 transition-colors overflow-hidden">
            {/* Scrollable Content */}
            <div
              ref={scrollRef}
              className="font-mono text-sm max-h-[500px] overflow-y-auto custom-scrollbar relative p-0"
            >
              {content ? (
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px', lineHeight: '1.5' }}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {content}
                </SyntaxHighlighter>
              ) : (
                <div className="p-6 text-slate-700 italic">Generate content to view code...</div>
              )}
            </div>

            {/* Fixed Overlay Elements (Gradient + Streaming Indicator) */}
            <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-[#050505] to-transparent pointer-events-none z-10" />

            {isStreaming && (
              <div className="absolute bottom-4 left-4 z-20">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-primary-500/20 shadow-lg shadow-black/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-primary-200 tracking-widest uppercase">Streaming</span>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Fullscreen Editor Overlay - Portal to Body */}
      {createPortal(
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col"
            >
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#09090b] relative z-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <Type size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{fileName}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span>{editValue.length} chars</span>
                      <span>•</span>
                      <span>{Math.ceil(editValue.length / 4)} tokens</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`p-2 rounded-lg border transition-colors flex items-center gap-2 ${showSearch ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'}`}
                    title="Find (Ctrl+F)"
                    aria-label="Find"
                  >
                    <Search size={14} />
                  </button>

                  {/* Split Screen Toggle */}
                  <div className="hidden md:flex bg-slate-800 rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => setSplitView(false)}
                      className={`p-1.5 rounded transition-colors ${!splitView ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Code View"
                      aria-label="Code View"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setSplitView(true)}
                      className={`p-1.5 rounded transition-colors ${splitView ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Split Preview"
                      aria-label="Split Preview"
                    >
                      <Columns size={14} />
                    </button>
                  </div>

                  {splitView && (
                    <button
                      onClick={() => setShowTOC(!showTOC)}
                      className={`hidden xl:flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs font-medium ${showTOC ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-white/10 text-slate-400'
                        }`}
                      title="Toggle Table of Contents"
                      aria-label={showTOC ? "Hide Table of Contents" : "Show Table of Contents"}
                    >
                      <List size={14} /> {showTOC ? 'Hide TOC' : 'Show TOC'}
                    </button>
                  )}

                  {onEdit && (
                    <div className="flex items-center gap-2 mx-4 border-l border-white/10 pl-4">
                      <Button variant="secondary" onClick={handleCancelEdit} className="h-8 text-xs bg-white/5 hover:bg-white/10">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit} className="h-8 text-xs bg-primary-600 hover:bg-primary-500 text-white">
                        <Save size={14} className="mr-1.5" /> Save
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleCopy} className="h-8 w-8 p-0 flex items-center justify-center bg-white/5 hover:bg-white/10" aria-label="Copy to clipboard">
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsFullscreen(false)} className="h-8 w-8 p-0 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white" aria-label="Exit fullscreen">
                      <Minimize2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 relative flex overflow-hidden">
                {/* Left Pane: Raw Editor */}
                <div className={`h-full flex flex-col relative transition-all duration-300 ${splitView ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>

                  {/* Search Panel Overlay */}
                  <AnimatePresence>
                    {showSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, x: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-4 right-8 z-50 w-80 bg-[#0a0a0c]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-3 flex flex-col gap-2"
                      >
                        {/* Search Input Row */}
                        <div className="flex items-center gap-2 bg-[#1a1a1c] border border-white/5 rounded-lg px-2 py-1.5 focus-within:border-primary-500/50 transition-colors">
                          <Search size={14} className="text-slate-400 shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Find"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                navigateMatch(e.shiftKey ? -1 : 1);
                              }
                            }}
                            className="bg-transparent border-none outline-none text-xs text-slate-200 w-full placeholder-slate-600"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSearchOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
                              className={`p-1 rounded hover:bg-white/10 ${searchOptions.caseSensitive ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400'}`}
                              title="Match Case"
                              aria-label="Match Case"
                            >
                              <CaseSensitive size={14} />
                            </button>
                            <button
                              onClick={() => setSearchOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
                              className={`p-1 rounded hover:bg-white/10 ${searchOptions.wholeWord ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400'}`}
                              title="Match Whole Word"
                              aria-label="Match Whole Word"
                            >
                              <WholeWord size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Replace Input Row */}
                        <AnimatePresence>
                          {showReplace && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 bg-[#1a1a1c] border border-white/5 rounded-lg px-2 py-1.5 focus-within:border-primary-500/50 transition-colors mb-2">
                                <Replace size={14} className="text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Replace"
                                  value={replaceQuery}
                                  onChange={(e) => setReplaceQuery(e.target.value)}
                                  className="bg-transparent border-none outline-none text-xs text-slate-200 w-full placeholder-slate-600"
                                />
                                <div className="flex gap-1">
                                  <button onClick={handleReplace} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Replace One" aria-label="Replace One"><Check size={12} /></button>
                                  <button onClick={handleReplaceAll} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Replace All" aria-label="Replace All"><List size={12} /></button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-slate-400 font-mono pl-1">
                            {matches.length > 0 ? `${currentMatchIdx + 1} of ${matches.length}` : 'No results'}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setShowReplace(!showReplace)} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${showReplace ? 'text-slate-200' : 'text-slate-400'}`} title="Toggle Replace" aria-label="Toggle Replace">
                              <ChevronDown size={14} className={`transition-transform ${showReplace ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="w-px h-3 bg-white/10 mx-1"></div>
                            <button onClick={() => navigateMatch(-1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded" title="Previous Match" aria-label="Previous Match">
                              <ArrowUp size={14} />
                            </button>
                            <button onClick={() => navigateMatch(1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded" title="Next Match" aria-label="Next Match">
                              <ArrowDown size={14} />
                            </button>
                            <button onClick={() => setShowSearch(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded ml-1" title="Close" aria-label="Close Search">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Editor Stack: Overlay + Textarea */}
                  <div className="relative w-full h-full bg-[#050505] overflow-hidden">
                    <HighlightOverlay
                      content={editValue}
                      matches={matches}
                      currentMatchIdx={currentMatchIdx}
                      scrollRef={overlayRef}
                    />
                    <textarea
                      ref={editorRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onMouseUp={handleMouseUp}
                      onMouseDown={handleMouseDown}
                      className="absolute inset-0 w-full h-full p-8 md:p-12 bg-transparent text-slate-200 font-mono text-sm md:text-base resize-none focus:outline-none leading-relaxed custom-scrollbar selection:bg-primary-500/30 z-10"
                      spellCheck={false}
                      placeholder="Start typing..."
                      readOnly={!onEdit}
                    />
                  </div>

                  {/* Scrollbar Minimap - Visual Indicators for Matches */}
                  {matches.length > 0 && (
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-transparent z-20 pointer-events-none">
                      {matches.map((m, i) => (
                        <div
                          key={i}
                          className={`absolute w-full h-[2px] right-0 ${i === currentMatchIdx ? 'bg-primary-400' : 'bg-yellow-500/50'}`}
                          style={{ top: `${(m.start / editValue.length) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Fullscreen Magic Wand Menu */}
                  {menuPos && onInlineRefine && (
                    <MagicWandMenu
                      position={menuPos}
                      onSelect={executeInlineRefinement}
                      isLoading={isRefining}
                      onClose={() => setMenuPos(null)}
                    />
                  )}

                  {/* Hint Overlay */}
                  <AnimatePresence>
                    {showHint && isFullscreen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary-600/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm pointer-events-none flex items-center gap-2 border border-white/20"
                      >
                        <Sparkles size={14} className="animate-pulse text-yellow-300" />
                        <span>Select words to use Magic Wand</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!splitView && (
                    <div className="absolute bottom-6 right-8 pointer-events-none opacity-50 z-30">
                      <div className="flex flex-col items-end gap-1 text-[10px] font-mono text-slate-600">
                        <div className="flex items-center gap-1"><AlignLeft size={10} /> {editValue.split('\n').length} lines</div>
                        <div className="flex items-center gap-1"><Keyboard size={10} /> UTF-8</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Pane: Live Preview */}
                <AnimatePresence>
                  {splitView && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="w-1/2 h-full bg-[#080808] relative border-l border-white/10"
                    >
                      {/* Floating TOC */}
                      {showTOC && <TableOfContents content={editValue} onSelect={handleTOCNavigation} />}

                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-blue-500 opacity-30 z-10" />
                      <MarkdownPreview content={editValue} scrollRef={previewRef} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export const PersonaError: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
      <AlertTriangle size={32} className="text-red-400" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-white mb-2">Persona Not Selected</h2>
      <p className="text-slate-400 max-w-md mx-auto">
        Please return to the home page and select a persona (Vibe-Coder, Developer, or Learner) to continue.
      </p>
    </div>
    <Link to="/">
      <Button variant="primary">Select Persona</Button>
    </Link>
  </div>
);

export const RefinementControl: React.FC<{
  onRefine: (instruction: string) => void;
  isRefining: boolean;
  placeholder?: string
}> = ({ onRefine, isRefining, placeholder }) => {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = () => {
    if (!instruction.trim()) return;
    onRefine(instruction);
    setInstruction('');
  };

  return (
    <div className="mt-4 flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder || "Refine this output..."}
          className="w-full bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:bg-surface/80 focus:border-primary-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300 pr-10"
          disabled={isRefining}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Sparkles size={16} className="text-slate-600" />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isRefining || !instruction.trim()}
        className="h-auto"
      >
        {isRefining ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </Button>
    </div>
  );
};

export const ManualEntryControl: React.FC<{
  onUpdate: (content: string) => void;
}> = () => {
  return (
    <div className="mt-4 p-3 bg-slate-900/50 border border-white/10 rounded-xl flex items-center justify-between text-sm text-slate-400">
      <span className="flex items-center gap-2">
        <Edit2 size={16} />
        <span>You are in Manual Mode. Edit the text above directly or paste external results.</span>
      </span>
    </div>
  );
};