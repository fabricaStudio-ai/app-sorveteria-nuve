import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's already installed
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(Boolean(isPWA));

    // Check if and on iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('pwa_prompt_dismissed') && !isPWA) {
        setShowPrompt(true);
      }
    };

    const forceShowHandler = () => {
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('force-show-install-prompt', forceShowHandler);

    // If it's iOS and not already installed, show the prompt
    if (isIosDevice && !isPWA && !sessionStorage.getItem('pwa_prompt_dismissed')) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('force-show-install-prompt', forceShowHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS doesn't support the automatic prompt
      // The informative UI is enough. Just close it after they engage.
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] glass-dark p-6 rounded-[2.5rem] border border-primary/20 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)] shrink-0">
                <Download className="w-6 h-6 text-dark" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Instalar Nuvê App</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                  Acesso rápido & offline
                </p>
              </div>
            </div>
            <button
               onClick={handleDismiss}
               className="p-2 text-white/20 hover:text-white transition-colors"
            >
               <X className="w-5 h-5" />
            </button>
          </div>

          {isIOS ? (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2 mt-2">
               <p className="text-xs text-white/70">Para instalar no iOS:</p>
               <ol className="text-[11px] text-white/50 space-y-2 list-decimal list-inside">
                  <li>Toque no ícone de Compartilhar <Share className="inline w-3 h-3 mx-1" /> na barra inferior.</li>
                  <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
               </ol>
            </div>
          ) : !deferredPrompt ? (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2 mt-2">
               <p className="text-xs text-white/70">Para instalar:</p>
               <ol className="text-[11px] text-white/50 space-y-2 list-decimal list-inside">
                  <li>Toque no menu do seu navegador (três pontinhos).</li>
                  <li>Selecione <strong>"Adicionar à Tela Inicial"</strong> ou <strong>"Instalar Aplicativo"</strong>.</li>
               </ol>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="w-full bg-white text-dark px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all mt-2"
            >
              Instalar Agora
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
