import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const BuyMeACoffee: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed bottom-6 right-6 z-[60]"
      >
        <div className="relative group">
           {/* Close Button - positioned top right of the pill */}
           <button
             onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
             }}
             className="absolute -top-2 -right-2 z-20 p-1 bg-slate-900 text-slate-400 hover:text-white border border-white/10 rounded-full shadow-md transition-colors hover:bg-slate-800 flex items-center justify-center"
             aria-label="Dismiss"
             title="Dismiss"
           >
             <X size={12} strokeWidth={3} />
           </button>
           
           {/* Main Button */}
           <a
             href="https://www.buymeacoffee.com/alpyalayg"
             target="_blank"
             rel="noopener noreferrer"
             className="flex items-center gap-3 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 hover:brightness-110 active:scale-95 border border-white/5"
             style={{ backgroundColor: '#0d4921' }}
           >
             <span className="text-xl animate-bounce" style={{ animationDuration: '3s' }}>☕</span>
             <span className="text-white font-medium text-sm tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>Buy me a coffee</span>
           </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
