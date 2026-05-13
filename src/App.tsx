import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { cn } from './lib/utils';
import Splash from './components/Splash';
import BottomNav from './components/BottomNav';
import CartDrawer from './components/CartDrawer';
import Notification from './components/Notification';
import WhatsAppFAB from './components/WhatsAppFAB';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import RoleSelection from './pages/RoleSelection';

// Empty pages for routing demonstration
const Promos = () => <div className="p-8 text-center text-white/40">Promoções em breve...</div>;
const Orders = () => <div className="p-8 text-center text-white/40">Seus pedidos aparecerão aqui.</div>;

function AppContent() {
  const { isSplashVisible, cart, profile, loading, user, userRole } = useApp();
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [notification, setNotification] = React.useState({ show: false, message: '' });
  const location = useLocation();
  const prevTotalItems = React.useRef(0);
  const currentTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Watch for cart changes to show notification
  React.useEffect(() => {
     if (currentTotalItems > prevTotalItems.current) {
        setNotification({ show: true, message: 'Item adicionado ao carrinho!' });
     }
     prevTotalItems.current = currentTotalItems;
  }, [currentTotalItems]);

  // Listen for custom event to open cart
  React.useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    document.addEventListener('open-cart', handleOpenCart);
    return () => document.removeEventListener('open-cart', handleOpenCart);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-6 p-6 text-center">
        {/* Minimal loading state that matches splash */}
        <div className="w-16 h-16 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/10 animate-pulse">
           <ShoppingBag className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
            <motion.div 
              className="h-full bg-primary"
              animate={{ x: [-128, 128] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">Carregando</p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Auth />;
  }

  // Role Guard
  if (profile?.isAdmin && !userRole) {
    return <RoleSelection />;
  }

  const isActuallyAdminRoute = location.pathname.startsWith('/admin') || userRole === 'admin';
  const isShowingAdminContent = profile?.isAdmin && (location.pathname === '/' || isActuallyAdminRoute);

  return (
    <div className="min-h-screen bg-dark">
      <AnimatePresence mode="wait">
        {isSplashVisible && <Splash key="splash" />}
      </AnimatePresence>

      <main className={cn(
        "relative min-h-screen",
        isActuallyAdminRoute ? "w-full" : "max-w-md mx-auto pb-32"
      )}>
        <AnimatePresence mode="wait">
          <div key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={userRole === 'admin' ? <Admin /> : <Home />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/promos" element={<Promos />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </AnimatePresence>
      </main>

      <Notification 
        isVisible={notification.show} 
        message={notification.message} 
        onHide={() => setNotification({ ...notification, show: false })} 
      />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <WhatsAppFAB />
      <PWAInstallPrompt />

      {!isSplashVisible && <BottomNav onOpenCart={() => setIsCartOpen(true)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

