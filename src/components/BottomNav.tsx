import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Home, Search, Settings, ShoppingBag, User, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

export default function BottomNav({ onOpenCart }: { onOpenCart: () => void }) {
  const { cart, profile } = useApp();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (!profile?.isAdmin) return;
    
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [profile]);

  interface NavItem {
    icon: any;
    label: string;
    path?: string;
    onClick?: () => void;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { icon: Home, label: profile?.isAdmin ? 'Dashboard' : 'Home', path: '/' },
    { icon: Search, label: 'Cardápio', path: '/menu' },
    { 
      icon: ShoppingBag, 
      label: 'Pedidos', 
      path: profile?.isAdmin ? '/admin?tab=orders' : '/orders',
      badge: profile?.isAdmin ? pendingOrdersCount : 0
    },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  // For non-admins, insert the promo and handle cart
  if (!profile?.isAdmin) {
    navItems.splice(2, 0, { icon: Sparkles, label: 'Promos', path: '/promos' });
  } else {
    // For admins, replace profile with specific Admin tools if needed or just keep profile
    // Let's keep it simple and just ensure the pathing is right.
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark/80 backdrop-blur-2xl border-t border-white/5 pb-safe pt-2 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => (
          item.onClick ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center p-2 relative rounded-2xl transition-all duration-300 text-white/40 hover:text-white/60"
            >
              <div className="relative">
                <item.icon className="w-6 h-6 transition-transform duration-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-primary text-dark text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          ) : (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center p-2 relative rounded-2xl transition-all duration-300",
                isActive ? "text-primary bg-primary/5" : "text-white/40 hover:text-white/60"
              )}
             id={`nav-${item.label.toLowerCase()}`}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-2 bg-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-[0_0_10px_rgba(112,0,255,0.5)]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] mt-1 font-medium tracking-wide transition-all duration-300 opacity-0 scale-90 translate-y-1", isActive && "opacity-100 scale-100 translate-y-0")}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-primary/5 rounded-2xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}
