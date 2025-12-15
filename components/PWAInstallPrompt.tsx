import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
        const weekInMs = 7 * 24 * 60 * 60 * 1000;

        // Don't show if dismissed within last week
        if (dismissedTime && Date.now() - dismissedTime < weekInMs) {
            return;
        }

        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Capture the install prompt event
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);

            // Check periodically for modals to be closed before showing
            const checkAndShow = () => {
                // Check if any modal is open (look for modal backdrop or specific modal elements)
                const hasOpenModal = document.querySelector('[role="dialog"]') !== null ||
                    document.querySelector('.api-key-modal') !== null ||
                    !localStorage.getItem('VIBE_API_KEYS'); // No API keys set yet

                if (hasOpenModal) {
                    // Check again in 2 seconds
                    setTimeout(checkAndShow, 2000);
                } else {
                    // No modal, safe to show
                    setIsVisible(true);
                }
            };

            // Start checking after initial delay
            setTimeout(checkAndShow, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Detect when app is installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setIsVisible(false);
            setInstallPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;

            if (choice.outcome === 'accepted') {
                setIsVisible(false);
                setInstallPrompt(null);
            }
        } catch (err) {
            console.error('Install prompt error:', err);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't render if installed or no prompt available
    if (isInstalled || !installPrompt) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-20 left-4 right-4 md:hidden z-[100]"
                >
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="p-2 bg-primary-500/20 rounded-xl shrink-0">
                                <Smartphone size={24} className="text-primary-400" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white mb-1">Add to Home Screen</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Install this app for quick access and offline use.
                                </p>
                            </div>

                            {/* Close */}
                            <button
                                onClick={handleDismiss}
                                className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
                                aria-label="Dismiss"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleInstall}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            <Download size={16} />
                            Install App
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
