import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
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
  loading: boolean;
  userRole: 'admin' | 'customer' | null;
  setUserRole: (role: 'admin' | 'customer' | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSplashVisible, setSplashVisible] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const profileRef = doc(db, 'profiles', currentUser.uid);
        let profileSnap;
        try {
          profileSnap = await getDoc(profileRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `profiles/${currentUser.uid}`);
          return;
        }
                if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile;
          
          // Check for admin status via 'admins' collection
          const adminRef = doc(db, 'admins', currentUser.uid);
          let adminSnap;
          try {
            adminSnap = await getDoc(adminRef);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `admins/${currentUser.uid}`);
            return;
          }
          
          // Safety fallback for the bootstrap admin email
          const isBootstrapAdmin = currentUser.email?.toLowerCase().trim() === 'fabricasoftwareai@gmail.com';
          const isActuallyAdmin = adminSnap.exists() || isBootstrapAdmin;
          
          const updatedProfile = {
            ...profileData,
            isAdmin: isActuallyAdmin
          };
          
          setProfile(updatedProfile);
          
          if (userRole === null) {
            // All users need to select role
            // For now, leave as null to trigger role selection screen
          }
          
          // Update profile if state changed (for local caching consistency)
          if (profileData.isAdmin !== isActuallyAdmin) {
            updateDoc(profileRef, { isAdmin: isActuallyAdmin }).catch(e => {
              console.error("Failed to sync admin status:", e);
            });
          }
        } else {
          // New profile: check admin status first
          const adminRef = doc(db, 'admins', currentUser.uid);
          let adminSnap;
          try {
            adminSnap = await getDoc(adminRef);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `admins/${currentUser.uid}`);
            return;
          }
          const isBootstrapAdmin = currentUser.email?.toLowerCase().trim() === 'fabricasoftwareai@gmail.com';
          const isActuallyAdmin = adminSnap.exists() || isBootstrapAdmin;
          
          const newProfile: UserProfile = {
            userId: currentUser.uid,
            name: currentUser.displayName || '',
            email: currentUser.email || '',
            isAdmin: isActuallyAdmin,
          };
          try {
            await setDoc(profileRef, newProfile);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `profiles/${currentUser.uid}`);
          }
          setProfile(newProfile);
          if (userRole === null) {
            // All users need to selection
          }
        }
      } else {
        setProfile(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product, quantity: number, notes?: string, flavors: string[] = [], toppings: string[] = []) => {
    // Normalize optional fields to avoid ID mismatches (e.g. undefined vs "")
    const normalizedNotes = notes?.trim() || "";
    const sortedFlavors = [...flavors].sort();
    const sortedToppings = [...toppings].sort();
    
    // Generate a unique ID for this specific combination
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
    
    // Trigger global event or custom state to open cart automatically
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
      loading,
      userRole,
      setUserRole
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
