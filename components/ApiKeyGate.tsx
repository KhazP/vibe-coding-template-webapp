
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Lock, Eye, EyeOff, ExternalLink, CheckCircle2, ShieldCheck,
  AlertCircle, Loader2, X, Sparkles, ChevronDown, Trash2
} from 'lucide-react';
import { Button } from './UI';
import { useProject } from '../context/ProjectContext';
import {
  PROVIDERS,
  getEnabledProviders,
  validateKeyFormat,
  testProviderConnection,
  type ProviderId,
  type ProviderConfig
} from '../utils/providers';
import {
  getProviderKey,
  setProviderKey,
  clearProviderKey,
  getProviderSettings,
  setProviderSettings,
  getEffectiveDefaultProvider,
} from '../utils/providerStorage';

// ============================================================================
// Types
// ============================================================================

type ProviderKeyStatus = 'none' | 'saved' | 'invalid' | 'testing';

// ============================================================================
// Main ApiKeyGate Component
// ============================================================================

export const ApiKeyGate: React.FC = () => {
  const { apiKey, setApiKey, isApiKeyModalOpen, setIsApiKeyModalOpen } = useProject();

  // Current selected provider - defaults to provider with saved key, or from settings
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(() => getEffectiveDefaultProvider());
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Key input state
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [status, setStatus] = useState<ProviderKeyStatus>('none');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const provider = PROVIDERS[selectedProvider];
  const enabledProviders = getEnabledProviders();

  // Check if key format is valid
  const isValidFormat = keyInput.trim().length > 0 && validateKeyFormat(selectedProvider, keyInput);

  // Load saved key when provider changes
  useEffect(() => {
    const savedKey = getProviderKey(selectedProvider);
    if (savedKey) {
      setKeyInput(savedKey);
      setStatus('saved');
    } else {
      setKeyInput('');
      setStatus('none');
    }
    setError(null);
    setShowKey(false);
  }, [selectedProvider, isApiKeyModalOpen]);

  // Sync Gemini key with legacy apiKey context
  useEffect(() => {
    if (selectedProvider === 'gemini' && apiKey && !keyInput) {
      setKeyInput(apiKey);
      setStatus('saved');
    }
  }, [apiKey, selectedProvider]);

  // Prevent background scrolling
  useEffect(() => {
    if (isApiKeyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isApiKeyModalOpen]);

  // Handle input change
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyInput(val);
    if (status === 'saved') setStatus('none');
    if (error) setError(null);
  };

  // Handle save/test
  const handleSave = async () => {
    if (!isValidFormat) return;

    setIsValidating(true);
    setError(null);

    const result = await testProviderConnection(selectedProvider, keyInput.trim());

    if (result.success) {
      // Save key
      setProviderKey(selectedProvider, keyInput.trim());

      // Sync Gemini key with legacy context
      if (selectedProvider === 'gemini') {
        setApiKey(keyInput.trim());
      }

      // Update default provider to the one just saved
      setProviderSettings({ defaultProvider: selectedProvider });

      setStatus('saved');

      // Close modal after successful save for any provider
      setIsApiKeyModalOpen(false);
    } else {
      setStatus('invalid');
      setError(result.error || "That key didn't work. Please check it and try again.");
    }

    setIsValidating(false);
  };

  // Handle close
  const handleClose = () => {
    // Only allow closing if Gemini key exists
    const geminiKey = getProviderKey('gemini');
    if (geminiKey) {
      setIsApiKeyModalOpen(false);
    }
  };

  // Get provider status icon for dropdown
  const getProviderStatus = (id: ProviderId) => {
    const key = getProviderKey(id);
    return key ? 'saved' : 'none';
  };

  const geminiSaved = getProviderKey('gemini') !== null;
  const isSaved = status === 'saved';
  const isInvalid = status === 'invalid';

  return (
    <AnimatePresence>
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
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
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isSaved && !error ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-0 rounded-2xl border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]" />
            </div>

            {/* Top Gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />

            {/* Close Button (if Gemini key exists) */}
            {geminiSaved && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors z-20"
              >
                <X size={18} />
              </button>
            )}

            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                {/* Provider Logo */}
                <div className="w-16 h-16 bg-gradient-to-br from-primary-900/50 to-purple-900/50 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative group">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img
                    src={provider.logoPath}
                    alt={provider.displayName}
                    className="w-8 h-8 object-contain relative z-10"
                  />
                </div>

                <h2 className="text-3xl font-bold text-white mb-2 font-display tracking-tight">
                  Power up the AI
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[280px]">
                  Enter your {provider.displayName} API key to unlock the workflow.
                </p>
              </div>

              <div className="space-y-6">
                {/* Provider Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={provider.logoPath}
                        alt={provider.displayName}
                        className="w-5 h-5 object-contain"
                      />
                      <span className="text-white font-medium">{provider.displayName}</span>
                      {status === 'saved' && (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      )}
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showProviderDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0b] border border-white/10 rounded-xl overflow-hidden z-30 shadow-xl"
                      >
                        {enabledProviders.map((p) => {
                          const pStatus = getProviderStatus(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProvider(p.id);
                                setShowProviderDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${selectedProvider === p.id ? 'bg-white/5' : ''
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.logoPath}
                                  alt={p.displayName}
                                  className="w-5 h-5 object-contain"
                                />
                                <span className="text-white text-sm">{p.displayName}</span>
                              </div>
                              {pStatus === 'saved' && (
                                <CheckCircle2 size={14} className="text-emerald-500" />
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input Group */}
                <div className="relative group">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl opacity-0 transition duration-500 ${isFocused ? 'opacity-30' : ''} ${isSaved && !error ? 'opacity-50 !from-emerald-500 !to-emerald-400' : ''}`} />

                  <div className="relative bg-[#050505] rounded-xl flex items-center border border-white/10 focus-within:border-white/20 transition-colors">
                    <div className="pl-4 text-slate-500">
                      {isSaved && !error ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Lock size={18} />}
                    </div>
                    <input
                      type={showKey ? "text" : "password"}
                      value={keyInput}
                      onChange={handleInput}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder={provider.keyPlaceholder}
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
                    href={provider.getKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors group px-3 py-1 rounded-full hover:bg-primary-900/20"
                  >
                    Get a free key from {provider.displayName}
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

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Delete Key Button - Only show if current provider has a saved key */}
                  {status === 'saved' && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        clearProviderKey(selectedProvider);
                        setKeyInput('');
                        setStatus('none');
                        // Clear legacy Gemini key if needed
                        if (selectedProvider === 'gemini') {
                          setApiKey('');
                        }
                      }}
                      className="px-3 bg-red-900/20 hover:bg-red-900/40 border-red-500/20 text-red-400"
                      disabled={isValidating}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                  {geminiSaved && (
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
                    disabled={!isValidFormat || isValidating}
                    className={`flex-1 h-12 text-base font-bold shadow-lg transition-all duration-300 ${isValidFormat && !isValidating
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                      }`}
                  >
                    {isValidating ? (
                      <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Verifying...</span>
                    ) : isValidFormat ? (
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
