import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, WifiOff, Check } from 'lucide-react';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

export const PWAUpdatePrompt: React.FC = () => {
    const [offlineReady, setOfflineReady] = useState(false);
    const [needRefresh, setNeedRefresh] = useState(false);
    const [updateFunction, setUpdateFunction] = useState<() => Promise<void> | undefined>();

    useEffect(() => {
        const updateSW = registerSW({
            onOfflineReady() {
                setOfflineReady(true);
            },
            onNeedRefresh() {
                setNeedRefresh(true);
            },
        });
        setUpdateFunction(() => updateSW);
    }, []);

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {(offlineReady || needRefresh) && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm md:max-w-md"
                >
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50 overflow-hidden relative">
                        {/* Background Glow */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-500/5 to-purple-500/5 pointer-events-none" />

                        {offlineReady ? (
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-emerald-500/10 rounded-xl shrink-0">
                                    <Check size={24} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white mb-1">Ready for Offline</h4>
                                    <p className="text-xs text-slate-400">App ready to work offline.</p>
                                </div>
                                <button
                                    onClick={close}
                                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative z-10">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-purple-500/10 rounded-xl shrink-0">
                                        <RefreshCw size={24} className="text-purple-400 animate-spin-slow" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white mb-1">Update Available</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            A new version of Vibe-Coding Workflow is available.
                                        </p>
                                    </div>
                                    <button
                                        onClick={close}
                                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => updateFunction?.()}
                                    className="w-full py-2.5 bg-white text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    Refresh to Update
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
