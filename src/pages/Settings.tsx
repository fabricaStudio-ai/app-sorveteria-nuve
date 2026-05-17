import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, User, Bell, Shield, Sun, CircleHelp, 
  CreditCard, ExternalLink, X, CheckCircle2, Lock,
  Plus, AlertCircle, ChevronRight, Zap, Palette, Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { doc, updateDoc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { THEME_PALETTES, THEME_STRUCTURES } from '../constants';
import { cn } from '../lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, userRole, setUserRole, user, setProfile, store, setStore, theme, toggleTheme } = useApp();

  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  const [mpForm, setMpForm] = useState({
    publicKey: profile?.mpPublicKey || '',
    accessToken: profile?.mpAccessToken || ''
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const [lalamoveForm, setLalamoveForm] = useState({
    apiKey: profile?.lalamoveApiKey || '',
    secret: profile?.lalamoveSecret || ''
  });

  const [showMPModal, setShowMPModal] = useState(false);
  const [showLalamoveModal, setShowLalamoveModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  const [savingLalamove, setSavingLalamove] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [profileName, setProfileName] = useState(profile?.name || '');
  const [imgbbConfig, setImgbbConfig] = useState(profile?.imgbbApiKey || '');
  
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [themeColor, setThemeColor] = useState('default');
  const [themeStructure, setThemeStructure] = useState('modern');
  const [themePrimary, setThemePrimary] = useState('#00f2ff');
  const [themeSecondary, setThemeSecondary] = useState('#a855f7');
  const [themeBackground, setThemeBackground] = useState('#050505');

  useEffect(() => {
    if (store) {
      setAppName(store.name || '');
      setAppLogo(store.logoUrl || '');
      setThemeColor(store.themeColor || 'default');
      setThemeStructure(store.themeStructure || 'modern');
      setThemePrimary(store.themePrimary || '#00f2ff');
      setThemeSecondary(store.themeSecondary || '#a855f7');
      setThemeBackground(store.themeBackground || '#050505');
      setImgbbConfig(store.imgbbApiKey || '');
      // ... keep other profile fields if still needed from profile
    }
    if (profile) {
      if (profile.name) setProfileName(profile.name);
      // ... keep existing profile-specific fields
    }
  }, [profile, store]);

  const handleUpdateBranding = async () => {
    if (!user) return;
    setSavingBranding(true);
    try {
      const updateData = {
        name: appName,
        logoUrl: appLogo,
        themeColor: themeColor,
        themeStructure: themeStructure,
        themePrimary: themePrimary,
        themeSecondary: themeSecondary,
        themeBackground: themeBackground,
        updatedAt: new Date().toISOString(),
        ownerId: user.uid // Ensure ownerId is set
      };

      // Ensure store document exists
      const storeRef = doc(db, 'stores', user.uid);
      await setDoc(storeRef, updateData, { merge: true });
      
      setStore(prev => prev ? { ...prev, ...updateData } : { id: user.uid, ...updateData, name: appName, ownerId: user.uid } as any);
      setShowBrandingModal(false);
    } catch (e) {
      console.error("Error saving branding:", e);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const apiKey = profile?.imgbbApiKey;
      if (!apiKey) {
        alert("Por favor, configure a API Key do ImgBB em 'Armazenamento' primeiro.");
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setAppLogo(data.data.url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Error uploading logo:", err);
      alert("Falha no upload do logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user || !profileName) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'profiles', user.uid), { name: profileName });
      setProfile(prev => prev ? { ...prev, name: profileName } : null);
      setShowProfileModal(false);
    } catch (e) {
      console.error("Error updating name:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectLalamove = async () => {
    if (!user) return;
    setSavingLalamove(true);
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const secretsRef = doc(db, 'profiles', user.uid, 'private', 'secrets');
      
      const updateData = {
        lalamoveConnected: !!(lalamoveForm.apiKey && lalamoveForm.secret)
      };
      
      const secretData = {
        lalamoveApiKey: lalamoveForm.apiKey,
        lalamoveSecret: lalamoveForm.secret,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(profileRef, updateData);
      await setDoc(secretsRef, secretData, { merge: true });
      
      setProfile(prev => prev ? { ...prev, ...updateData, ...secretData } : null);
      setShowLalamoveModal(false);
    } catch (e) {
      console.error("Error saving Lalamove config:", e);
    } finally {
      setSavingLalamove(false);
    }
  };

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
      const secretsRef = doc(db, 'profiles', user.uid, 'private', 'secrets');
      
      const updateData = {
        mpConnected: !!(mpForm.publicKey && mpForm.accessToken)
      };
      
      const secretData = {
        mpPublicKey: mpForm.publicKey,
        mpAccessToken: mpForm.accessToken,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(profileRef, updateData);
      await setDoc(secretsRef, secretData, { merge: true });
      
      setProfile(prev => prev ? { ...prev, ...updateData, ...secretData } : null);
      setShowMPModal(false);
    } catch (e) {
      console.error("Error saving MP config:", e);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: User, label: 'Editar Perfil', detail: profile?.name || 'Usuário', onClick: () => setShowProfileModal(true) },
    ...(userRole === 'admin' ? [
      { 
        icon: Zap, 
        label: 'Identidade Visual', 
        detail: profile?.appName || 'Padrão', 
        onClick: () => setShowBrandingModal(true) 
      },
      { 
        icon: ExternalLink, 
        label: 'Link da sua Loja', 
        detail: 'Compartilhar', 
        onClick: () => {
          const baseUrl = window.location.origin;
          const storeUrl = `${baseUrl}/?store=${user?.uid}&name=${encodeURIComponent(store?.name || 'loja')}`;
          console.log('Attempting to copy:', storeUrl);
          
          const textArea = document.createElement("textarea");
          textArea.value = storeUrl;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            setToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
          } catch (err) {
            setToast({ message: 'Falha ao copiar. Tente selecionar o texto manualmente.', type: 'error' });
            prompt('Copie o link abaixo:', storeUrl);
          }
          document.body.removeChild(textArea);
        } 
      }
    ] : []),
    { icon: Bell, label: 'Notificações', detail: 'Ativadas', onClick: () => setToast({ message: 'Notificações já estão ativas.', type: 'success' }) },
    { icon: Shield, label: 'Privacidade', detail: 'Seguro', onClick: () => setToast({ message: 'Seus dados estão protegidos.', type: 'success' }) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] p-6 pb-32"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-3 glass rounded-2xl">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-serif italic font-bold">Configurações</h1>
      </header>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-xl border flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Account Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-4">Conta</h3>
          <div className="glass rounded-[2rem] overflow-hidden">
             {menuItems.map((item, i) => (
               <button 
                key={i} 
                onClick={item.onClick}
                className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
               >
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
             {userRole !== 'admin' && (
                <button 
                  onClick={() => {
                    if (confirm("ATENÇÃO: Você está prestes a se tornar um Gestor de Loja. Esta ação é irreversível na plataforma e suas permissões serão alteradas. Deseja continuar?")) {
                      // Implementation: add to admins collection and update profile
                      const upgradeRole = async () => {
                        if (!user) return;
                        try {
                          await setDoc(doc(db, 'admins', user.uid), {
                            addedAt: new Date().toISOString(),
                          });
                          await updateDoc(doc(db, 'profiles', user.uid), {
                            isAdmin: true
                          });
                          setUserRole('admin');
                          setToast({ message: "Parabéns! Você agora é um Gestor de Loja.", type: 'success' });
                          setTimeout(() => window.location.reload(), 2000);
                        } catch (error) {
                          console.error("Failed to upgrade role:", error);
                          setToast({ message: "Ocorreu um erro ao atualizar sua permissão.", type: 'error' });
                        }
                      };
                      upgradeRole();
                    }
                  }}
                  className="w-full p-6 flex items-center justify-between hover:bg-primary/5 transition-colors border-t border-white/5 text-primary"
                >
                  <div className="flex items-center gap-4">
                     <Zap className="w-5 h-5" />
                     <span className="font-bold text-sm">Quero ser um Gestor</span>
                  </div>
                </button>
             )}
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
            
            {/* Lalamove Integration */}
            <div className="glass rounded-[3rem] p-8 border border-white/5 bg-gradient-to-br from-[#F37021]/5 to-transparent mt-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#F37021] rounded-2xl flex items-center justify-center p-2 shadow-lg shadow-[#F37021]/20">
                  <span className="text-white font-black text-xs uppercase tracking-widest">LALA</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">Lalamove Entregas</h4>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Integração Logística</p>
                </div>
              </div>

              {profile?.lalamoveConnected ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conectado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowLalamoveModal(true)}
                      className="py-4 glass border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white/40"
                    >
                      Editar Chaves
                    </button>
                    <a 
                      href="https://developers.lalamove.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="glass border-white/10 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#F37021]/50 hover:text-[#F37021] transition-all"
                    >
                      Portal <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-white/40 leading-relaxed font-medium">Automatize suas entregas chamando entregadores Lalamove diretamente do painel de pedidos. (Requer API Key e Secret).</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowLalamoveModal(true)}
                      className="flex-1 py-4 glass border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#F37021] hover:bg-[#F37021]/10 transition-all border-[#F37021]/20"
                    >
                      Configurar Integração
                    </button>
                    <a 
                      href="https://developers.lalamove.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-4 glass border-white/5 rounded-2xl flex items-center justify-center text-[#F37021]/60"
                      title="Obter chaves Lalamove"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* ImgBB Backup Section */}
            <div className="glass rounded-[3rem] p-8 mt-4 border border-white/5 bg-gradient-to-br from-purple-500/5 to-transparent">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                     <CircleHelp className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="font-bold">Armazenamento Grátis</h4>
               </div>
               <p className="text-xs text-white/40 leading-relaxed mb-4">
                  Se o Firebase Storage falhar, você pode usar o **ImgBB** (gratuito) como alternativa para suas fotos.
               </p>
               
               <div className="space-y-4">
                  <div className="flex gap-2">
                     <div className="relative flex-1">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="text"
                          placeholder="API Key do ImgBB (Opcional)"
                          value={imgbbConfig}
                          onChange={(e) => setImgbbConfig(e.target.value)}
                          className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-[10px] font-black tracking-widest focus:outline-none"
                        />
                     </div>
                     <button 
                       onClick={async () => {
                         if (!user) return;
                         setSaving(true);
                         try {
                           const secretsRef = doc(db, 'profiles', user.uid, 'private', 'secrets');
                           await updateDoc(doc(db, 'profiles', user.uid), { mpConnected: !!profile?.mpConnected }); // Keep it on main
                           await setDoc(secretsRef, { imgbbApiKey: imgbbConfig }, { merge: true });
                           setProfile(prev => prev ? { ...prev, imgbbApiKey: imgbbConfig } : null);
                         } catch (e) {
                           console.error("Error saving ImgBB:", e);
                         } finally {
                           setSaving(false);
                         }
                       }}
                       disabled={saving || imgbbConfig === profile?.imgbbApiKey}
                       className="px-6 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-0"
                     >
                        Salvar
                     </button>
                  </div>
                  <a 
                    href="https://api.imgbb.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] text-purple-400 font-bold flex items-center gap-1 uppercase tracking-widest"
                  >
                    Obter Chave Grátis no ImgBB <ExternalLink className="w-3 h-3" />
                  </a>
               </div>
            </div>
          </section>
        )}

        {/* Preferences Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-4">Preferências</h3>
          <div className="glass rounded-[2rem] overflow-hidden">
             {[
               { icon: Sun, label: theme === 'dark' ? 'Tema Light' : 'Tema Dark', detail: theme === 'dark' ? 'Ativar' : 'Ativar', onClick: toggleTheme },
               { icon: CircleHelp, label: 'Ajuda & Suporte', detail: '', onClick: () => window.open('https://api.whatsapp.com/send?phone=5548999999999', '_blank') },
             ].map((item, i) => (
               <button key={i} onClick={item.onClick} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
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

      {/* Lalamove Setup Modal */}
      <AnimatePresence>
        {showLalamoveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-dark/95 backdrop-blur-2xl" onClick={() => setShowLalamoveModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/5 space-y-8 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F37021]/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#F37021]" />
                  </div>
                  <h2 className="text-xl font-serif italic font-bold">Configurar Lalamove</h2>
                </div>
                <button onClick={() => setShowLalamoveModal(false)} className="p-3 glass rounded-2xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">API Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={lalamoveForm.apiKey}
                      onChange={(e) => setLalamoveForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="PK_..."
                      className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">API Secret</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="password" 
                      value={lalamoveForm.secret}
                      onChange={(e) => setLalamoveForm(prev => ({ ...prev, secret: e.target.value }))}
                      placeholder="SK_..."
                      className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F37021]/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-[#F37021]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold leading-relaxed text-white/60">Obtenha suas chaves de API:</p>
                    <a 
                      href="https://developers.lalamove.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-[#F37021] hover:underline flex items-center gap-1 font-black uppercase tracking-widest"
                    >
                      Portal Developer Lalamove <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleConnectLalamove}
                disabled={savingLalamove}
                className="w-full py-5 bg-[#F37021] text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 disabled:opacity-50 shadow-xl shadow-[#F37021]/20"
              >
                {savingLalamove ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-dark/95 backdrop-blur-2xl" onClick={() => setShowProfileModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/5 space-y-8 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-serif italic font-bold">Editar Perfil</h2>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="p-3 glass rounded-2xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nome de Exibição</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full glass bg-white/5 py-4 pl-12 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleUpdateName}
                disabled={saving || !profileName}
                className="w-full py-5 bg-primary text-dark rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 disabled:opacity-50 shadow-xl shadow-primary/20"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </motion.div>
          </motion.div>
        )}
       </AnimatePresence>

       {/* Branding Selection Modal */}
       <AnimatePresence>
         {showBrandingModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center p-6"
           >
             <div className="absolute inset-0 bg-dark/95 backdrop-blur-2xl" onClick={() => setShowBrandingModal(false)} />
             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative w-full max-w-md glass-dark p-8 rounded-[3rem] border border-white/5 space-y-8 overflow-hidden"
             >
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                     <Zap className="w-5 h-5 text-primary" />
                   </div>
                   <h2 className="text-xl font-serif italic font-bold">Identidade Visual</h2>
                 </div>
                 <button onClick={() => setShowBrandingModal(false)} className="p-3 glass rounded-2xl">
                   <X className="w-4 h-4" />
                 </button>
               </div>

               <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nome da Loja</label>
                   <input 
                     type="text" 
                     value={appName}
                     onChange={(e) => setAppName(e.target.value)}
                     placeholder="Ex: Seu Negócio"
                     className="w-full glass bg-white/5 py-4 px-6 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-primary/50"
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Logo da Loja (URL ou Upload)</label>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={appLogo}
                       onChange={(e) => setAppLogo(e.target.value)}
                       placeholder="https://..."
                       className="flex-1 glass bg-white/5 py-4 px-6 rounded-2xl text-sm font-medium focus:outline-none"
                     />
                     <label className="p-4 glass rounded-2xl cursor-pointer hover:bg-white/10 transition-all flex items-center justify-center">
                       {uploadingLogo ? (
                         <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                       ) : (
                         <Plus className="w-5 h-5 text-primary" />
                       )}
                       <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                     </label>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <div className="flex items-center gap-2 ml-4">
                     <Palette className="w-3 h-3 text-primary" />
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Paleta de Cores</label>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     {THEME_PALETTES.map((palette) => (
                       <button
                         key={palette.id}
                         onClick={() => setThemeColor(palette.id)}
                         className={cn(
                           "p-4 rounded-2xl border transition-all flex items-center gap-3 text-left",
                           themeColor === palette.id 
                             ? "glass border-primary bg-primary/5" 
                             : "glass-dark border-white/5 hover:border-white/10"
                         )}
                       >
                         <div className="flex shrink-0">
                           <div className="w-4 h-4 rounded-full -mr-1 shadow-lg" style={{ backgroundColor: palette.primary }} />
                           <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: palette.secondary }} />
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-wider truncate">{palette.label}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-4 pb-4">
                   <div className="flex items-center gap-2 ml-4">
                     <Layout className="w-3 h-3 text-primary" />
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Estrutura Visual</label>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     {THEME_STRUCTURES.map((struct) => (
                       <button
                         key={struct.id}
                         onClick={() => setThemeStructure(struct.id)}
                         className={cn(
                           "p-4 rounded-2xl border transition-all flex flex-col gap-1 items-start text-left",
                           themeStructure === struct.id 
                             ? "glass border-primary bg-primary/5" 
                             : "glass-dark border-white/5 hover:border-white/10"
                         )}
                       >
                         <span className="text-[10px] font-black uppercase tracking-widest">{struct.label}</span>
                         <div className="flex gap-1">
                           <div className="w-8 h-2 bg-white/10" style={{ borderRadius: struct.radius }} />
                           <div className="w-4 h-2 bg-primary/20" style={{ borderRadius: struct.radius }} />
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               </div>

               <button 
                 onClick={handleUpdateBranding}
                 disabled={savingBranding || !appName}
                 className="w-full py-5 bg-primary text-dark rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 disabled:opacity-50 shadow-xl shadow-primary/20"
               >
                 {savingBranding ? 'Salvando...' : 'Atualizar Identidade'}
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </motion.div>
  );
}

