import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, User, Bell, Shield, Moon, CircleHelp, 
  CreditCard, ExternalLink, X, CheckCircle2, Lock,
  Plus, AlertCircle, ChevronRight, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, userRole, user, setProfile } = useApp();
  const [showMPModal, setShowMPModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  const [mpForm, setMpForm] = useState({
    publicKey: profile?.mpPublicKey || '',
    accessToken: profile?.mpAccessToken || ''
  });

  // Handle OAuth message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'MP_AUTH_SUCCESS') {
        // Refresh profile data from Firestore
        if (user) {
          const profileRef = doc(db, 'profiles', user.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setProfile(snap.data() as any);
          }
        }
        setConnecting(false);
      } else if (event.data?.type === 'MP_AUTH_ERROR') {
        console.error("MP Auth Error:", event.data.error);
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, setProfile]);

  const handleConnectAutomatic = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const response = await fetch(`/api/auth/mp/url?userId=${user.uid}`);
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'mp_auth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (e) {
      console.error("Error starting MP OAuth:", e);
      setConnecting(false);
    }
  };

  const handleConnectMP = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const updateData = {
        mpPublicKey: mpForm.publicKey,
        mpAccessToken: mpForm.accessToken,
        mpConnected: !!(mpForm.publicKey && mpForm.accessToken)
      };
      await updateDoc(profileRef, updateData);
      setProfile(prev => prev ? { ...prev, ...updateData } : null);
      setShowMPModal(false);
    } catch (e) {
      console.error("Error saving MP config:", e);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: User, label: 'Editar Perfil', detail: profile?.name || 'Usuário' },
    { icon: Bell, label: 'Notificações', detail: 'Ativadas' },
    { icon: Shield, label: 'Privacidade', detail: 'Seguro' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-dark text-white p-6 pb-32"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-3 glass rounded-2xl">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-serif italic font-bold">Configurações</h1>
      </header>

      <div className="space-y-8">
        {/* Account Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-4">Conta</h3>
          <div className="glass rounded-[2rem] overflow-hidden">
             {menuItems.map((item, i) => (
               <button key={i} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                 <div className="flex items-center gap-4">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="font-bold text-sm">{item.label}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{item.detail}</span>
                    <ChevronRight className="w-4 h-4 text-white/10" />
                 </div>
               </button>
             ))}
          </div>
        </section>

        {/* Payment Integration Section (Admin Only) */}
        {userRole === 'admin' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Pagamento Gestor</h3>
              <Lock className="w-3 h-3 text-white/10" />
            </div>
            <div className="glass rounded-[3rem] p-8 border border-white/5 bg-gradient-to-br from-[#009EE3]/5 to-transparent">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#009EE3] rounded-2xl flex items-center justify-center p-2 shadow-lg shadow-[#009EE3]/20">
                  <img src="https://www.mercadopago.com/instore/merchant/bundle/mptools/assets/mp-logo.png" className="w-full h-auto brightness-0 invert" alt="MP" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">Mercado Pago</h4>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Checkout Transparente</p>
                </div>
              </div>

              {profile?.mpConnected ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conectado e Operacional</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleConnectAutomatic}
                      disabled={connecting}
                      className="py-4 glass border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3 h-3" /> {connecting ? '...' : 'Reconectar'}
                    </button>
                    <button 
                      onClick={() => setShowMPModal(true)}
                      className="py-4 glass border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white/40"
                    >
                      Editar Chaves
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-white/40 leading-relaxed font-medium">Libere pagamentos via PIX e Cartão para seus clientes. O dinheiro cai instantaneamente na sua conta.</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleConnectAutomatic}
                      disabled={connecting}
                      className="w-full py-5 bg-[#009EE3] hover:brightness-110 text-white shadow-xl shadow-[#009EE3]/20 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                    >
                      {connecting ? (
                        <>Iniciando Conexão...</>
                      ) : (
                        <><Zap className="w-4 h-4 fill-current" /> Conectar Automaticamente</>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => setShowMPModal(true)}
                      className="w-full py-4 glass border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-all"
                    >
                      Configurar Manualmente (Avançado)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Preferences Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-4">Preferências</h3>
          <div className="glass rounded-[2rem] overflow-hidden">
             {[
               { icon: Moon, label: 'Tema Escuro', detail: 'Sempre' },
               { icon: CircleHelp, label: 'Ajuda & Suporte', detail: '' },
             ].map((item, i) => (
               <button key={i} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                 <div className="flex items-center gap-4">
                    <item.icon className="w-5 h-5 text-secondary" />
                    <span className="font-bold text-sm">{item.label}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{item.detail}</span>
                    <ChevronRight className="w-4 h-4 text-white/10" />
                 </div>
               </button>
             ))}
          </div>
        </section>

        <div className="p-8 text-center opacity-20">
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nuvê Sorvetes v1.0.6</p>
           <p className="text-[8px] mt-1 font-medium italic">Gestão Inteligente & Pagamentos</p>
        </div>
      </div>

      {/* Mercado Pago Setup Modal */}
      <AnimatePresence>
        {showMPModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-dark/95 backdrop-blur-2xl" onClick={() => setShowMPModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/5 space-y-8 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#009EE3]/10 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#009EE3]" />
                  </div>
                  <h2 className="text-xl font-serif italic font-bold">Configurar MP</h2>
                </div>
                <button onClick={() => setShowMPModal(false)} className="p-3 glass rounded-2xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Public Key (Frontend)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={mpForm.publicKey}
                      onChange={(e) => setMpForm(prev => ({ ...prev, publicKey: e.target.value }))}
                      placeholder="Ex: APP_USR-..."
                      className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Access Token (Backend)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="password" 
                      value={mpForm.accessToken}
                      onChange={(e) => setMpForm(prev => ({ ...prev, accessToken: e.target.value }))}
                      placeholder="Ex: APP_USR-..."
                      className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold leading-relaxed text-white/60">Onde encontro minhas chaves?</p>
                    <a 
                      href="https://www.mercadopago.com.br/developers/panel/credentials" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-primary hover:underline flex items-center gap-1 font-black uppercase tracking-widest"
                    >
                      Painel do Desenvolvedor MP <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleConnectMP}
                disabled={saving}
                className="w-full py-5 bg-primary text-dark rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 disabled:opacity-50 shadow-xl shadow-primary/20"
              >
                {saving ? 'Validando & Salvando...' : 'Salvar Credenciais'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
