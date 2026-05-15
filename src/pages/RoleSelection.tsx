import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, ShoppingBag, LogOut } from 'lucide-react';
import { logout } from '../lib/firebase';

export default function RoleSelection() {
  const { profile, setUserRole, user } = useApp();

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-md text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-12"
        >
           <h1 className="text-4xl font-serif italic text-white mb-4">
             Bem-vindo{profile?.name ? `, ${profile.name}` : user?.displayName ? `, ${user.displayName}` : ''}
           </h1>
           <p className="text-white/40 text-sm font-medium">Como você deseja acessar o app nesta sessão?</p>
           <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest text-center">Atenção: Esta escolha não pode ser alterada posteriormente.</p>
           </div>
        </motion.div>

        <div className="grid gap-6">
           {profile?.isAdmin && (
             <motion.button
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
               onClick={() => setUserRole('admin')}
               className="glass-dark p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 hover:border-primary/50 transition-all group active:scale-95"
             >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                   <LayoutDashboard className="w-8 h-8" />
                </div>
                <div className="text-center">
                   <h3 className="text-lg font-bold text-white mb-1">Modo Gestor</h3>
                   <p className="text-xs text-white/30 uppercase font-black tracking-widest">Acesso total ao painel</p>
                </div>
             </motion.button>
           )}

           <motion.button
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             onClick={() => setUserRole('customer')}
             className="glass-dark p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 hover:border-secondary/50 transition-all group active:scale-95"
           >
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                 <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="text-center">
                 <h3 className="text-lg font-bold text-white mb-1">Modo Cliente</h3>
                 <p className="text-xs text-white/30 uppercase font-black tracking-widest">Fazer pedidos e ver menu</p>
              </div>
           </motion.button>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={logout}
          className="mt-12 flex items-center gap-2 text-white/20 hover:text-white/40 text-[10px] font-black uppercase tracking-[0.2em] transition-colors mx-auto"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </motion.button>
      </div>
    </div>
  );
}
