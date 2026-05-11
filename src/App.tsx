import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
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

// Empty pages for routing demonstration
const Promos = () => <div className="p-8 text-center text-white/40">Promoções em breve...</div>;
const Orders = () => <div className="p-8 text-center text-white/40">Seus pedidos aparecerão aqui.</div>;

function AppContent() {
  const { isSplashVisible, cart, profile, loading } = useApp();
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [notification, setNotification] = React.useState({ show: false, message: '' });
  const location = useLocation();
  const navigate = useNavigate();
  const prevCartLength = React.useRef(cart.length);

  // Redirect admin to dashboard if they land on home
  React.useEffect(() => {
    if (profile?.isAdmin && location.pathname === '/') {
      navigate('/admin', { replace: true });
    }
  }, [profile, location.pathname, navigate]);

  // Watch for cart changes to show notification
  React.useEffect(() => {
     if (cart.length > prevCartLength.current) {
        setNotification({ show: true, message: 'Item adicionado à nuvem!' });
     }
     prevCartLength.current = cart.length;
  }, [cart]);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      <AnimatePresence mode="wait">
        {isSplashVisible && <Splash key="splash" />}
      </AnimatePresence>

      <main className="max-w-md mx-auto relative pb-32">
        <AnimatePresence mode="wait">
          <div key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={profile?.isAdmin ? <Admin /> : <Home />} />
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

