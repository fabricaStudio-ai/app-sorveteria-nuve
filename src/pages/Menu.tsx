import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, Filter, X, Plus } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Menu() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(data);
      } catch (e) {
        console.error(e);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = activeCategory === 'todos' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
      className="px-6 py-8"
    >
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-serif italic font-bold tracking-tighter">Nosso Cardápio</h1>
          {profile?.isAdmin && (
            <button 
              onClick={() => navigate('/admin?tab=products&new=true')}
              className="bg-primary text-dark p-3 rounded-2xl shadow-[0_10px_20px_rgba(0,242,255,0.2)] active:scale-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Cadastrar</span>
            </button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="O que você deseja hoje?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
          <button
            onClick={() => setActiveCategory('todos')}
            className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-500 whitespace-nowrap ${
              activeCategory === 'todos' 
                ? 'bg-primary text-dark border-primary shadow-[0_10px_20px_rgba(0,242,255,0.2)]' 
                : 'glass border-white/5 text-white/30'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={`menu-cat-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-500 flex items-center gap-2 whitespace-nowrap ${
                activeCategory === cat.id 
                  ? 'bg-primary text-dark border-primary shadow-[0_10px_20px_rgba(0,242,255,0.2)]' 
                  : 'glass border-white/5 text-white/30'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-4xl mb-4 opacity-20">☁️</div>
              <p className="text-white/40 font-medium tracking-tight">Nenhuma nuvem encontrada por aqui...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer for Bottom Nav */}
      <div className="h-10" />
    </motion.div>
  );
}
