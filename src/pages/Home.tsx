import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, ShoppingBag, Bell, MessageCircle, ArrowRight } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';

export default function Home() {
  const { cart } = useApp();
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const q = query(collection(db, 'products'), limit(10));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        if (data.length > 0) {
          setDbProducts(data);
          setFeaturedProducts(data.filter(p => p.isBestSeller).slice(0, 3));
          setCombos(data.filter(p => p.category === 'combos'));
        } else {
          // Fallback to static if DB is empty
          setFeaturedProducts(PRODUCTS.filter(p => p.isBestSeller).slice(0, 3));
          setCombos(PRODUCTS.filter(p => p.category === 'combos'));
        }
      } catch (e) {
        console.error(e);
        // Fallback
        setFeaturedProducts(PRODUCTS.filter(p => p.isBestSeller).slice(0, 3));
        setCombos(PRODUCTS.filter(p => p.category === 'combos'));
      }
    };
    fetchHomeData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 py-8"
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em] mb-1">Bem-vindo à</h2>
          <h1 className="text-2xl font-serif italic font-bold tracking-tighter neon-glow flex items-center gap-2">
            Sorveteria Nuvê
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/60">
            <Bell className="w-5 h-5" />
          </button>
          <a 
            href="https://wa.me/5500000000000" 
            target="_blank" 
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-primary"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Promocional Banner */}
      <section className="mb-10 relative group">
        <div className="relative h-48 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,242,255,0.15)]">
          <img 
            src="https://images.unsplash.com/photo-1549395156-e0c1fe6fc7a5?q=80&w=1200&auto=format&fit=crop" 
            className="w-full h-full object-cover" 
            alt="Banner Promocional"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/40 to-transparent">
            <div className="p-8 flex flex-col justify-center h-full max-w-[60%]">
              <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-2 bg-primary/10 w-fit px-2 py-0.5 rounded">Oferta Especial</span>
              <h3 className="text-2xl font-serif italic leading-tight font-bold mb-4">Combo Astros por R$ 34,90</h3>
              <button className="bg-white text-dark px-5 py-2 rounded-xl text-xs font-bold w-fit flex items-center gap-2 hover:bg-primary transition-colors">
                Pedir Agora <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-10 overflow-hidden">
        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-5 px-1">Categorias</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-none">
          {CATEGORIES.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className="flex-shrink-0 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center group-active:scale-95 transition-transform duration-200 cursor-pointer shadow-lg border-white/5">
                <span className="text-2xl">{cat.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{cat.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Sabor que Alivia</h3>
          <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">Cardápio <ArrowRight className="w-3 h-3" /></button>
        </div>
        <div className="grid grid-cols-1 gap-8 pb-2">
          {featuredProducts.map((product, idx) => (
            <ProductCard key={`featured-${product.id}`} product={product} index={idx} />
          ))}
        </div>
      </section>

       {/* Combos */}
       <section className="mb-6">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6 px-1">Nossos Combos</h3>
        {combos.map((combo, idx) => (
          <motion.div 
            key={`combo-${combo.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-[2rem] p-6 mb-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden"
          >
            <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden shadow-xl">
              <img src={combo.image} className="w-full h-full object-cover" alt={combo.name} referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="text-xl font-serif italic font-bold mb-1">{combo.name}</h4>
              <p className="text-white/40 text-xs mb-4">{combo.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary tracking-tighter">R$ {(combo.price || 0).toFixed(2)}</span>
                <button className="glass border-primary/20 text-primary px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/10">Adicionar</button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </motion.div>
  );
}
