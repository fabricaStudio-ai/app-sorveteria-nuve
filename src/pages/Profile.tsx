import { motion } from 'motion/react';
import { 
  LogOut, 
  User, 
  ShieldCheck, 
  ShoppingBag, 
  Mail, 
  Settings, 
  ChevronRight,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { logout } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, loading, setUserRole, userRole } = useApp();
  const navigate = useNavigate();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-8 pb-32"
    >
      <h1 className="text-3xl font-serif italic font-bold tracking-tighter mb-8">Meu Perfil</h1>

      <div className="space-y-8">
        {/* User Info Card */}
        <div className="glass rounded-[2.5rem] p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10 rounded-full" />
           
           <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full border-2 border-primary/30 p-1">
                 <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="Avatar"
                 />
              </div>
              <div className="flex-1 min-w-0">
                 <h2 className="text-2xl font-serif italic font-bold truncate">{user.displayName || 'Usuário'}</h2>
                 <div className="flex items-center gap-1.5 text-white/40 text-xs mt-1 truncate">
                    <Mail className="w-3 h-3" /> {user.email}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="glass-dark p-4 rounded-2xl flex flex-col items-center gap-2 border-white/5">
                 {userRole === 'admin' ? <ShieldCheck className="w-5 h-5 text-primary" /> : <ShoppingBag className="w-5 h-5 text-primary" />}
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{userRole === 'admin' ? 'Gestor' : 'Pedidos'}</span>
                 <span className="text-lg font-bold">{userRole === 'admin' ? 'Ativo' : '0'}</span>
              </div>
              <div className="glass-dark p-4 rounded-2xl flex flex-col items-center gap-2 border-white/5">
                 <User className="w-5 h-5 text-secondary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nível</span>
                 <span className="text-lg font-bold">Iniciante</span>
              </div>
           </div>
        </div>

        {/* Settings List */}
        <div className="space-y-3">
           {userRole === 'admin' && (
             <Link 
              to="/admin" 
              className="w-full glass rounded-2xl p-5 flex items-center justify-between group hover:border-primary/30 transition-all"
             >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                     <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm tracking-tight">Painel Administrativo</span>
                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Acesso Gestor</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
             </Link>
           )}

           <button className="w-full glass rounded-2xl p-5 flex items-center justify-between group hover:border-white/20 transition-all">
              <div className="flex items-center gap-4 text-white/60">
                 <div className="p-3 bg-white/5 rounded-xl">
                    <ShoppingBag className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-sm tracking-tight">Meus Pedidos</span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
           </button>

           <button className="w-full glass rounded-2xl p-5 flex items-center justify-between group hover:border-white/20 transition-all">
              <div className="flex items-center gap-4 text-white/60">
                 <div className="p-3 bg-white/5 rounded-xl">
                    <Settings className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-sm tracking-tight">Configurações</span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
           </button>

           <button 
            onClick={logout}
            className="w-full glass rounded-2xl p-5 flex items-center justify-between group hover:border-red-500/20 transition-all text-red-400"
           >
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-red-500/10 rounded-xl">
                    <LogOut className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-sm tracking-tight">Sair da Conta</span>
              </div>
           </button>
        </div>
      </div>
    </motion.div>
  );
}
