
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Lock, Eye, EyeOff, ExternalLink, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './UI';
import { useProject } from '../context/ProjectContext';

export const ApiKeyGate: React.FC = () => {
  const { apiKey, setApiKey, isApiKeyModalOpen, setIsApiKeyModalOpen } = useProject();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with context
  useEffect(() => {
    if (apiKey) {
      setKeyInput(apiKey);
      setIsValid(true);
    } else {
      setKeyInput('');
      setIsValid(false);
    }
  }, [apiKey, isApiKeyModalOpen]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyInput(val);
    // Basic syntax check: Starts with AIza and has reasonable length
    setIsValid(val.trim().startsWith('AIza') && val.length > 35);
    if (error) setError(null);
  };

  const handleSave = async () => {
    if (!isValid) return;
    
    setIsValidating(true);
    setError(null);

    try {
      // Test the key against gemini-2.5-flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyInput.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test" }] }],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error('Key rejected by Google.');
      }

      setApiKey(keyInput.trim());
    } catch (err) {
      console.error(err);
      setError("That key didn't work. Please check it and try again.");
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleClose = () => {
      // Only allow closing if a key already exists (Escape hatch mode)
      if (apiKey) {
          setIsApiKeyModalOpen(false);
      }
  };

  // Prevent background scrolling when modal is open
  // Fix: Use '' instead of 'unset' to correctly remove inline styles and prevent stuck locks
  useEffect(() => {
    if (isApiKeyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isApiKeyModalOpen]);

  return (
    <AnimatePresence>
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Frost Overlay - Blocks interaction */}
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.5 }}
             className="absolute inset-0 bg-black/60 backdrop-blur-xl"
             onClick={handleClose} 
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
            className="relative w-full max-w-md bg-[#09090b]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Neon Border Glow */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isValid && !error ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 rounded-2xl border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]" />
            </div>

            {/* Top Gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />

            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-900/50 to-purple-900/50 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative group">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Key size={32} className="text-white relative z-10" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2 font-display tracking-tight">
                  Power up the AI
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[280px]">
                  Enter your Google Gemini API key to unlock the workflow.
                </p>
              </div>

              <div className="space-y-6">
                 {/* Input Group */}
                 <div className="relative group">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl opacity-0 transition duration-500 ${isFocused ? 'opacity-30' : ''} ${isValid && !error ? 'opacity-50 !from-emerald-500 !to-emerald-400' : ''}`} />
                    
                    <div className="relative bg-[#050505] rounded-xl flex items-center border border-white/10 focus-within:border-white/20 transition-colors">
                        <div className="pl-4 text-slate-500">
                           {isValid && !error ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Lock size={18} />}
                        </div>
                        <input 
                            type={showKey ? "text" : "password"}
                            value={keyInput}
                            onChange={handleInput}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Paste key (starts with AIza...)"
                            className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 focus:outline-none placeholder-slate-600 font-mono text-sm"
                            autoFocus
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className="pr-4 text-slate-500 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                 </div>

                 {/* Get Key Link */}
                 <div className="flex justify-center">
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors group px-3 py-1 rounded-full hover:bg-primary-900/20"
                    >
                        Get a free key from Google AI Studio
                        <ExternalLink size={10} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                 </div>

                 {/* Error Message */}
                 {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-red-400 text-xs font-medium bg-red-900/20 p-3 rounded-lg border border-red-500/20"
                    >
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </motion.div>
                 )}

                 {/* Action Button */}
                 <div className="flex gap-3">
                     {apiKey && (
                         <Button 
                            variant="secondary"
                            onClick={handleClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 border-white/5"
                            disabled={isValidating}
                         >
                            Cancel
                         </Button>
                     )}
                     <Button 
                        onClick={handleSave}
                        disabled={!isValid || isValidating}
                        className={`flex-1 h-12 text-base font-bold shadow-lg transition-all duration-300 ${
                            isValid && !isValidating
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                        }`}
                     >
                        {isValidating ? (
                            <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Verifying...</span>
                        ) : isValid ? (
                            <span className="flex items-center gap-2">Ignite <Sparkles size={18} className="animate-pulse" /></span>
                        ) : (
                            <span className="flex items-center gap-2">Launch</span>
                        )}
                     </Button>
                 </div>
              </div>

              {/* Footer Trust Message */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
                 <ShieldCheck size={12} className="text-emerald-500/50" />
                 <span>Key is stored locally. We don't see it.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
