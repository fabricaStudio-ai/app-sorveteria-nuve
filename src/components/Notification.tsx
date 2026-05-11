import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Notification({ message, isVisible, onHide }: { message: string, isVisible: boolean, onHide: () => void }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 glass-dark border-primary/20 rounded-2xl flex items-center gap-3 shadow-2xl"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
