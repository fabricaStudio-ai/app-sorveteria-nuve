import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { THEME_PALETTES } from './constants';
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
import Settings from './pages/Settings';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';

// Empty pages for routing demonstration
const Promos = () => <div className="p-8 text-center text-white/40">Promoções em breve...</div>;

function AppContent() {
  const { isSplashVisible, cart, profile, loading, user, userRole } = useApp();
  
  React.useEffect(() => {
    if (profile?.themeColor === 'custom') {
      document.documentElement.style.setProperty('--primary', profile.themePrimary || '#00f2ff');
      document.documentElement.style.setProperty('--secondary', profile.themeSecondary || '#a855f7');
      document.documentElement.style.setProperty('--background', profile.themeBackground || '#050505');
    } else {
      // Find the selected palette and apply it if not custom
      const palette = THEME_PALETTES.find(p => p.id === (profile?.themeColor || 'default'));
      if (palette) {
        document.documentElement.style.setProperty('--primary', palette.primary);
        document.documentElement.style.setProperty('--secondary', palette.secondary);
        document.documentElement.style.setProperty('--background', palette.background || '#050505');
      }
    }
  }, [profile]);

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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <div className="w-full max-w-md h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
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
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex justify-center">
        <div className="w-full max-w-md shadow-2xl overflow-hidden">
          <Auth />
        </div>
      </div>
    );
  }

  // Role Guard
  if (user && !userRole) {
    return (
      <div className="min-h-screen bg-[#050505] flex justify-center">
        <div className="w-full max-w-md shadow-2xl overflow-hidden">
          <RoleSelection />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-[#050505] flex justify-center selection:bg-primary/30",
      userRole === 'admin' && location.pathname === '/admin' ? "block" : "flex"
    )}>
      <AnimatePresence mode="wait">
        {isSplashVisible && <Splash key="splash" />}
      </AnimatePresence>

      <main className={cn(
        "relative min-h-screen w-full bg-dark shadow-2xl pb-32",
        userRole === 'admin' && location.pathname === '/admin' ? "max-w-none" : "max-w-md"
      )}>
        <AnimatePresence mode="wait">
          <div key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={userRole === 'admin' ? <Navigate to="/admin" /> : <Home />} />
              <Route path="/menu" element={userRole === 'admin' ? <Navigate to="/admin?tab=products" /> : <Menu />} />
              <Route path="/promos" element={userRole === 'admin' ? <Navigate to="/admin?tab=promotions" /> : <Promos />} />
              <Route path="/orders" element={userRole === 'admin' ? <Navigate to="/admin?tab=orders" /> : <Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={userRole === 'admin' ? <Admin /> : <Navigate to="/" />} />
              <Route path="/tracking/:orderId" element={<OrderTracking />} />
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

      {userRole !== 'admin' && <WhatsAppFAB />}

      {!isSplashVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <BottomNav onOpenCart={() => setIsCartOpen(true)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
        <PWAInstallPrompt />
      </BrowserRouter>
    </AppProvider>
  );
}

