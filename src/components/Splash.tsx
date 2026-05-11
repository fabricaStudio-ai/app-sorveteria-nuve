import { motion, AnimatePresence } from 'motion/react';
import { Cloud } from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Splash() {
  const { setSplashVisible } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [setSplashVisible]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            filter: ["drop-shadow(0 0 10px rgba(0,242,255,0.5))", "drop-shadow(0 0 20px rgba(0,242,255,0.8))", "drop-shadow(0 0 10px rgba(0,242,255,0.5))"]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Cloud className="w-24 h-24 text-primary" strokeWidth={1.5} />
        </motion.div>
        
        {/* Animated Background Glows */}
        <div className="absolute -inset-20 bg-primary/20 blur-[100px] rounded-full -z-10 animate-pulse" />
        <div className="absolute top-0 -inset-10 bg-secondary/10 blur-[80px] rounded-full -z-10" />
      </motion.div>

      <motion.div
        className="mt-8 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <h1 className="text-4xl font-serif italic font-bold tracking-tighter neon-glow">
          Sorveteria Nuvê
        </h1>
        <p className="mt-2 text-white/40 text-sm tracking-[0.2em] uppercase font-light">
          Artesanal & Premium
        </p>
      </motion.div>

      <motion.div 
        className="absolute bottom-12 w-48 h-[2px] bg-white/10 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.div 
          className="h-full bg-primary"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
