import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_PHONE } from '../constants';
import { useApp } from '../context/AppContext';

export default function WhatsAppFAB() {
  const { isSplashVisible } = useApp();

  return (
    <AnimatePresence>
      {!isSplashVisible && (
        <motion.a
          href={`https://wa.me/${WHATSAPP_PHONE}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-24 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] flex items-center justify-center border-2 border-white/20"
        >
          <MessageCircle className="w-7 h-7" fill="currentColor" />
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            whileHover={{ width: 'auto', opacity: 1, marginLeft: 8 }}
            className="overflow-hidden whitespace-nowrap text-sm font-bold uppercase tracking-wider"
          >
            Falar com a Nuvê
          </motion.div>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
