
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ArrowRight, Lock, Eye, EyeOff, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from './UI';

const STORAGE_KEY = 'VIBE_GEMINI_API_KEY';

export const ApiKeyGate: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true); // Controls mounting/unmounting
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey && storedKey.startsWith('AIza')) {
      setIsVisible(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKey(val);
    // Basic validation for Google Cloud API keys
    setIsValid(val.trim().startsWith('AIza') && val.length > 30);
  };

  const handleSave = () => {
    if (!isValid) return;
    localStorage.setItem(STORAGE_KEY, key.trim());
    
    // Animate out
    setIsVisible(false);
    
    // Optional: Reload to ensure clean state if context relies on init
    // window.location.reload(); 
    // For this app, the Context reads key on demand, so just hiding is enough visually.
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Frost Overlay Background */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-all duration-1000" />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            className="relative w-full max-w-md bg-[#09090b]/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md"
          >
            {/* Neon Border Glow */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isValid ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 rounded-2xl border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]" />
            </div>

            {/* Decorative Top Gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />

            <div className="p-8 relative z-10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-900/50 to-purple-900/50 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] group">
                  <Key size={32} className="text-white group-hover:scale-110 transition-transform duration-500" />
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
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl opacity-0 transition duration-500 ${isFocused ? 'opacity-30' : ''} ${isValid ? 'opacity-50 !from-emerald-500 !to-emerald-400' : ''}`}></div>
                    <div className="relative bg-[#050505] rounded-xl flex items-center border border-white/10 focus-within:border-white/20 transition-colors">
                        <div className="pl-4 text-slate-500">
                           {isValid ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Lock size={18} />}
                        </div>
                        <input 
                            type={showKey ? "text" : "password"}
                            value={key}
                            onChange={handleInput}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Paste key starting with AIza..."
                            className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 focus:outline-none placeholder-slate-600 font-mono text-sm"
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className="pr-4 text-slate-500 hover:text-white transition-colors focus:outline-none"
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
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors group"
                    >
                        Get a free key from Google AI Studio
                        <ExternalLink size={10} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                 </div>

                 {/* Action Button */}
                 <Button 
                    onClick={handleSave}
                    disabled={!isValid}
                    className={`w-full h-12 text-base font-bold shadow-lg transition-all duration-300 ${
                        isValid 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                    }`}
                 >
                    {isValid ? (
                        <span className="flex items-center gap-2">Ignite Engines <Sparkles size={18} /></span>
                    ) : (
                        <span className="flex items-center gap-2">Enter Key to Launch</span>
                    )}
                 </Button>
              </div>

              {/* Footer Trust Message */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-600">
                 <ShieldCheck size={12} />
                 <span>Key is stored locally on your device. We don't see it.</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
