import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Github, 
  Chrome, 
  AlertCircle,
  Eye,
  EyeOff,
  ShoppingBag,
  Smartphone
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export default function Auth() {
  const [step, setStep] = useState<'intro' | 'auth'>('intro');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-dark flex flex-col justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[60%] bg-primary/20 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[50%] bg-secondary/10 blur-[120px] rounded-full" />

        <div className="relative z-10 w-full max-w-md mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-white/10"
          >
             <ShoppingBag className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-serif italic text-white font-bold leading-tight mb-4"
          >
            Seu Negócio
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg mb-12 font-medium"
          >
            A melhor experiência de gelateria artesanal, agora no seu bolso.
          </motion.p>

          <div className="space-y-4">
             <motion.button
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.3 }}
               onClick={() => {
                 window.dispatchEvent(new Event('force-show-install-prompt'));
               }}
               className="w-full bg-primary text-dark py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_20px_40px_rgba(0,242,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                <Smartphone className="w-5 h-5" /> Baixar App
             </motion.button>

             <motion.button
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
               onClick={() => setStep('auth')}
               className="w-full glass py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
             >
                Entrar via Navegador <ArrowRight className="w-5 h-5" />
             </motion.button>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-6 glass rounded-3xl border-white/5"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Instalação Rápida</p>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              Abra em "Adicionar à Tela de Início" no seu navegador <br /> para ter a experiência completa de APP sem baixar nada.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao autenticar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[60%] bg-primary/20 blur-[140px] rounded-full animate-pulse capitalize" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[50%] bg-secondary/10 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/10">
             <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-serif italic text-white font-bold leading-tight">
            {mode === 'login' ? 'Bom te ver de volta.' : 'Crie sua conta.'}
          </h1>
          <p className="text-white/40 text-sm mt-3 font-medium">
            {mode === 'login' 
              ? 'Entre para continuar seu pedido.' 
              : 'Junte-se à nossa comunidade de amantes de sorvete.'}
          </p>
        </motion.div>

        <motion.div
           layout
           className="glass-dark p-8 rounded-[2.5rem] border border-white/5 shadow-2xl"
        >
           <form onSubmit={handleEmailAuth} className="space-y-5">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="João Silva"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-white/10 focus:border-primary/50 transition-all text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-white/10 focus:border-primary/50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-14 text-white placeholder:text-white/10 focus:border-primary/50 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-4 rounded-xl border border-red-400/10">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-dark py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
           </form>

           <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                 <span className="bg-[#0A0A0A] px-4 text-white/20">Ou continue com</span>
              </div>
           </div>

           <button
             onClick={handleGoogleLogin}
             disabled={loading}
             className="w-full bg-white/5 border border-white/10 text-white/60 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
           >
              <Chrome className="w-5 h-5 text-primary" /> Google
           </button>
        </motion.div>

        <div className="text-center mt-8">
           <button
             onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
             className="text-white/30 text-xs font-medium hover:text-white/60 transition-colors"
           >
              {mode === 'login' 
                ? 'Novo por aqui? Crie uma conta agora' 
                : 'Já tem uma conta? Faça login'}
           </button>
        </div>
      </div>
    </div>
  );
}
