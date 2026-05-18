import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { THEME_PALETTES, THEME_STRUCTURES } from '../constants';

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  storeId?: string; // Optional storeId linking
  preferredRole?: 'admin' | 'customer';
  mpConnected?: boolean;
  mpPublicKey?: string;
  mpAccessToken?: string;
  lalamoveConnected?: boolean;
  lalamoveApiKey?: string;
  lalamoveSecret?: string;
  imgbbApiKey?: string;
  appName?: string;
  appLogo?: string;
  themeColor?: string;
  themeStructure?: string;
  points?: number;
}

interface Store {
  id: string;
  slug?: string;
  name: string;
  ownerId: string;
  logoUrl?: string;
  appName?: string;
  appLogo?: string;
  themeColor?: string;
  themeStructure?: string;
  themePrimary?: string;
  themeSecondary?: string;
  themeBackground?: string;
  mpPublicKey?: string;
  mpAccessToken?: string;
  lalamoveApiKey?: string;
  lalamoveSecret?: string;
  imgbbApiKey?: string;
}

interface AppContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, notes?: string, flavors?: string[], toppings?: string[]) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  isSplashVisible: boolean;
  setSplashVisible: (visible: boolean) => void;
  user: User | null;
  profile: UserProfile | null;
  store: Store | null;
  loading: boolean;
  userRole: 'admin' | 'customer' | null;
  setUserRole: (role: 'admin' | 'customer' | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSplashVisible, setSplashVisible] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, _setUserRole] = useState<'admin' | 'customer' | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const setUserRole = (role: 'admin' | 'customer' | null) => {
    _setUserRole(role);
    if (user && role) {
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, { preferredRole: role }).then(() => {
        setProfile(prev => prev ? { ...prev, preferredRole: role } : null);
      }).catch(e => {
        console.error("Failed to save preferred role:", e);
      });
    }
  };

  useEffect(() => {
    if (store) {
      // Apply theme colors
      const palette = THEME_PALETTES.find(p => p.id === (store.themeColor || 'default')) || THEME_PALETTES[0];
      document.documentElement.style.setProperty('--primary', palette.primary);
      document.documentElement.style.setProperty('--secondary', palette.secondary);
      document.documentElement.style.setProperty('--background', store.themeBackground || '#050505');
      
      // Apply theme structure
      const structure = THEME_STRUCTURES.find(s => s.id === (store.themeStructure || 'modern')) || THEME_STRUCTURES[0];
      document.documentElement.style.setProperty('--radius-factor', structure.radius);
      
      if (structure.font === 'font-serif') {
        document.body.classList.add('font-serif');
        document.body.classList.remove('font-sans');
      } else {
        document.body.classList.add('font-sans');
        document.body.classList.remove('font-serif');
      }
    }
  }, [store]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Check for store in URL
      const urlParams = new URLSearchParams(window.location.search);
      const storeIdFromUrl = urlParams.get('store');
      const nameParam = urlParams.get('name');
      let storeNameFromUrl = null;
      if (nameParam) {
          try {
              storeNameFromUrl = decodeURIComponent(nameParam);
          } catch (e) {
              storeNameFromUrl = nameParam; // If it fails, keep raw
          }
      }
      console.log("Decoded name param:", storeNameFromUrl);

      if (storeIdFromUrl) {
         setStore(prev => {
            const base = (prev && prev.id === storeIdFromUrl) ? prev : { id: storeIdFromUrl, ownerId: storeIdFromUrl } as Store;
            const updatedName = storeNameFromUrl || base.name || '';
            if (base.name !== updatedName) {
                return { ...base, name: updatedName };
            }
            return base;
         });
      }

      if (currentUser) {
        // Auto-admin for bootstrap emails
        const isBootstrapEmail = ['fabricasoftwareai@gmail.com', 'animesgospelas1@gmail.com'].includes(currentUser.email?.toLowerCase().trim() || '');
        if (isBootstrapEmail) {
          _setUserRole('admin');
        }

        // Fetch or create profile
        const profileRef = doc(db, 'profiles', currentUser.uid);
        let profileSnap;
        try {
          profileSnap = await getDoc(profileRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `profiles/${currentUser.uid}`);
          return;
        }

        // Fetch user's own store if it exists
        const storeRef = doc(db, 'stores', currentUser.uid);
        let storeSnap;
        try {
          storeSnap = await getDoc(storeRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `stores/${currentUser.uid}`);
          return;
        }
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile;
          setProfile(profileData);
          if (profileData.preferredRole) {
            _setUserRole(profileData.preferredRole);
          }
        }
        
        // If we have a storeId in URL, prioritize that branding/view for the user
        // unless they are an admin looking at their own store.
        if (storeIdFromUrl) {
          try {
            const urlStoreRef = doc(db, 'stores', storeIdFromUrl);
            const urlStoreSnap = await getDoc(urlStoreRef);
            if (urlStoreSnap.exists()) {
              const urlStoreData = urlStoreSnap.data() as Store;
              setStore({ 
                id: urlStoreSnap.id, 
                ...urlStoreData,
                name: storeNameFromUrl || urlStoreData.name
              });
            }
          } catch (e) {
            console.error("Error fetching store from URL:", e);
          }
        } else if (storeSnap.exists()) {
          setStore({ id: storeSnap.id, ...storeSnap.data() } as Store);
        }

      } else {
        setProfile(null);
        setUserRole(null);
        
        // If guest has storeId in URL, load it
        if (storeIdFromUrl) {
          try {
            const urlStoreRef = doc(db, 'stores', storeIdFromUrl);
            const urlStoreSnap = await getDoc(urlStoreRef);
            if (urlStoreSnap.exists()) {
              setStore({ id: urlStoreSnap.id, ...urlStoreSnap.data() } as Store);
            }
          } catch (e) {
            console.error("Error fetching store from URL for guest:", e);
          }
        } else {
          setStore(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product, quantity: number, notes?: string, flavors: string[] = [], toppings: string[] = []) => {
    const normalizedNotes = notes?.trim() || "";
    const sortedFlavors = [...flavors].sort();
    const sortedToppings = [...toppings].sort();
    const cartItemId = `${product.id}-${sortedFlavors.join(',')}-${sortedToppings.join(',')}-${normalizedNotes}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, cartItemId, quantity, notes: normalizedNotes, flavors: sortedFlavors, toppings: sortedToppings }];
    });
    document.dispatchEvent(new CustomEvent('open-cart'));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      isSplashVisible,
      setSplashVisible,
      user,
      profile,
      store,
      loading,
      userRole,
      setUserRole,
      theme,
      toggleTheme,
      setProfile,
      setStore
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
