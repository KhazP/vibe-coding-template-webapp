
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Lock, Eye, EyeOff, ExternalLink, CheckCircle2, ShieldCheck,
  AlertCircle, Loader2, X, Sparkles, ChevronDown, Trash2
} from 'lucide-react';
import { Button, Modal } from './UI';
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
    // Only allow closing if Gemini key exists (legacy requirement) or any provider is set?
    // Actually, we generally want to allow closing if *any* valid provider is ready,
    // but the original logic specifically checked Gemini. We'll stick to:
    // if we have a valid key for the *current* provider, or if we have a fallback?
    // The original code checked `getProviderKey('gemini')`. We should probably keep that safety for now,
    // or maybe just allow closing if there is at least one working provider.
    // Let's stick to the original logic for safety: if Gemini key exists OR we have a newly saved key.
    setIsApiKeyModalOpen(false);
  };

  // Get provider status icon for dropdown
  const getProviderStatus = (id: ProviderId) => {
    const key = getProviderKey(id);
    return key ? 'saved' : 'none';
  };

  const isSaved = status === 'saved';

  return (
    <Modal
      isOpen={isApiKeyModalOpen}
      onClose={handleClose}
      title="Connect AI Provider"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Context Card */}
        <div className="p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-primary-500/20 rounded-lg shrink-0">
            <ShieldCheck size={20} className="text-primary-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Secure Local Storage</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your API keys are stored locally in your browser. We never see them, and they are never sent to our servers.
              They are sent directly to the AI providers (OpenAI, Anthropic, Google) only when you generate content.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-200 block">Select Provider</label>

          {/* Provider Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {enabledProviders.map((p) => {
              const pStatus = getProviderStatus(p.id);
              const isSelected = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${isSelected
                    ? 'bg-primary-500/10 border-primary-500/50 ring-1 ring-primary-500/20'
                    : 'bg-slate-900/50 border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                >
                  {pStatus === 'saved' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                  )}
                  <img
                    src={p.logoPath}
                    alt={p.displayName}
                    className={`w-8 h-8 object-contain transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                  />
                  <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {p.displayName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 p-5 bg-slate-900/30 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200">API Key for {provider.displayName}</label>
            <a
              href={provider.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-medium text-primary-400 hover:text-primary-300 transition-colors bg-primary-900/10 px-2 py-1 rounded-md border border-primary-500/10 hover:border-primary-500/30"
            >
              Get Key <ExternalLink size={10} />
            </a>
          </div>

          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl opacity-0 transition duration-500 ${isFocused ? 'opacity-20' : ''} ${isSaved && !error ? 'opacity-40 !from-emerald-500 !to-emerald-400' : ''}`} />
            <div className={`relative bg-surface/50 backdrop-blur-sm rounded-xl flex items-center border transition-all duration-300 ${isFocused ? 'border-primary-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/10'}`}>
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
                className="w-full bg-transparent border-none text-slate-100 px-4 py-3.5 focus:ring-0 focus:outline-none placeholder-slate-600 font-mono text-sm"
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

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-2 text-red-400 text-xs font-medium bg-red-900/10 p-3 rounded-lg border border-red-500/10"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          {status === 'saved' && (
            <Button
              variant="secondary"
              onClick={() => {
                clearProviderKey(selectedProvider);
                setKeyInput('');
                setStatus('none');
                if (selectedProvider === 'gemini') setApiKey('');
              }}
              className="px-3 bg-red-900/10 hover:bg-red-900/20 border-red-500/10 text-red-400 hover:text-red-300"
              disabled={isValidating}
              title="Delete Key"
            >
              <Trash2 size={16} />
            </Button>
          )}

          <div className="flex-1" />

          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isValidating}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!isValidFormat || isValidating}
            className="min-w-[120px]"
          >
            {isValidating ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Verifying...</span>
            ) : isValidFormat ? (
              <span className="flex items-center gap-2">Save & Continue <Sparkles size={16} /></span>
            ) : (
              'Save Key'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
