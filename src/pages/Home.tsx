import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, ShoppingBag, Bell, MessageCircle, ArrowRight } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { useApp } from '../context/AppContext';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { Tag, Star, Gift } from 'lucide-react';

export default function Home() {
        const { cart, profile, addToCart, store, theme, toggleTheme } = useApp();
        const [dbProducts, setDbProducts] = useState<Product[]>([]);
        const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        let allProducts: Product[] = [];
        let allPromos: any[] = [];

        // If we have a specific store in context, ONLY load from that store
        const urlStoreId = new URLSearchParams(window.location.search).get('store');
        if (store?.id) {
          console.log("Loading home data for store:", store.id);
          const productsSnap = await getDocs(query(collection(db, 'stores', store.id, 'products'), limit(30)));
          allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId: store.id } as any as Product));
          
          const promoSnap = await getDocs(query(collection(db, 'stores', store.id, 'promotions'), where('isActive', '==', true), limit(5)));
          allPromos = promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId: store.id }));
        } else if (!urlStoreId) {
          // PORTAL MODE: Load from multiple stores or root (optional, for the main platform landing)
          const storesSnap = await getDocs(collection(db, 'stores'));
          if (!storesSnap.empty) {
            await Promise.all(storesSnap.docs.map(async (storeDoc) => {
              const snap = await getDocs(query(collection(db, 'stores', storeDoc.id, 'products'), limit(15)));
              const storeProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId: storeDoc.id } as any as Product));
              allProducts = [...allProducts, ...storeProducts];
              
              const promoSnap = await getDocs(query(collection(db, 'stores', storeDoc.id, 'promotions'), where('isActive', '==', true), limit(5)));
              allPromos = [...allPromos, ...promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), storeId: storeDoc.id }))];
            }));
          }
        }
        
        setDbProducts(allProducts);
        const filteredProducts = allProducts.filter(p => !store?.id || p.storeId === store.id);
        const bestSellers = filteredProducts.filter(p => p.isBestSeller).slice(0, 6);
        setFeaturedProducts(bestSellers.length > 0 ? bestSellers : filteredProducts.slice(0, 10));
        setPromoProducts(filteredProducts.filter(p => p.category === 'promocao' || p.category === 'combos')); 
        setCombos(filteredProducts.filter(p => p.category === 'combos'));
        setActiveOffers(allPromos.filter(p => !store?.id || p.storeId === store.id));

      } catch (e) {
        console.error("Error fetching home data:", e);
        setFeaturedProducts([]);
        setPromoProducts([]);
        setActiveOffers([]);
        setCombos([]);
      }
    };
    fetchHomeData();
  }, [store]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 py-8"
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {profile?.appLogo && (
            <div className="w-12 h-12 glass rounded-2xl p-2 border border-white/5 flex items-center justify-center">
              <img src={profile.appLogo} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
            </div>
          )}
          <div>
            <h2 className="opacity-40 text-[10px] uppercase font-bold tracking-[0.3em] mb-1">Bem-vindo à</h2>
            <h1 className="text-2xl font-serif italic font-bold tracking-tighter neon-glow">
              {store?.name || profile?.appName || 'App Delivery'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {profile && (
             <motion.div 
               whileHover={{ scale: 1.05 }}
               className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border-primary/20"
             >
               <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                 <Gift className="w-3 h-3 text-primary" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none">Pontos</span>
                 <span className="text-xs font-bold text-primary leading-tight">{profile.points || 0}</span>
               </div>
             </motion.div>
           )}
           <div className="flex gap-2">
             <button className="w-10 h-10 glass rounded-xl flex items-center justify-center opacity-60">
               <Bell className="w-5 h-5" />
             </button>
           </div>
        </div>
      </header>

      {/* Promotions Highlight */}
      {activeOffers.length > 0 && (
        <section className="mb-8 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-flash">Promoções em Destaque</h3>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-none">
            {activeOffers.map((promo) => (
              <div key={promo.id} className="min-w-[85%] sm:min-w-[70%] glass rounded-[2.5rem] p-1 border-primary/10 overflow-hidden relative group">
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-[2.3rem] flex items-center justify-between min-h-[140px]">
                  <div className="space-y-1 relative z-10 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Oferta {profile?.appName || 'do Dia'}</span>
                    </div>
                    <h4 className="text-lg font-serif italic font-bold leading-tight line-clamp-2">{promo.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-black text-foreground leading-none">{promo.discount}</p>
                      {promo.price && (
                        <>
                          <span className="w-1 h-1 bg-foreground/10 rounded-full" />
                          <p className="text-lg font-bold text-primary">R$ {parseFloat(promo.price).toFixed(2).replace('.', ',')}</p>
                        </>
                      )}
                    </div>
                    {promo.code && (
                      <p className="text-[10px] text-foreground opacity-40 font-bold uppercase tracking-widest leading-relaxed mt-2">Use: <span className="text-foreground bg-foreground/10 px-2 py-0.5 rounded-lg">{promo.code}</span></p>
                    )}
                    
                    {promo.price && (
                      <button 
                        onClick={() => addToCart({
                          id: promo.id,
                          name: promo.title,
                          description: promo.description,
                          price: parseFloat(promo.price),
                          image: promo.image || 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=600&auto=format&fit=crop',
                          category: 'promocao',
                          rating: 5,
                          stock: 99
                        } as Product, 1)}
                        className="mt-4 bg-primary text-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit hover:brightness-110 active:scale-95 transition-all shadow-lg"
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                  {promo.image ? (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-white/5 flex-shrink-0 animate-flash">
                      <img src={promo.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-flash scale-110 flex-shrink-0">
                      <Star className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-10 overflow-hidden">
        <h3 className="opacity-60 text-[10px] font-black uppercase tracking-[0.2em] mb-5 px-1">Categorias</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-none">
          {CATEGORIES.filter(cat => dbProducts.some(p => p.category === cat.id)).map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className="flex-shrink-0 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center group-active:scale-95 transition-transform duration-200 cursor-pointer shadow-lg bg-glass">
                <span className="text-2xl">{cat.icon}</span>
              </div>
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider">{cat.name}</span>
            </motion.div>
          ))}
          {/* Always add "Todos" category if not present */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="flex-shrink-0 flex flex-col items-center gap-3"
            onClick={() => {
              // Navigate to menu or scroll to Todos section
              const el = document.getElementById('all-products-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center bg-primary/20 text-primary border-primary/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Todos</span>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="opacity-60 text-[10px] font-black uppercase tracking-[0.2em]">Sabor que Alivia</h3>
          <button 
            onClick={() => {
               const el = document.getElementById('all-products-section');
               if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
          >
            Cardápio <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-8 pb-2">
          {featuredProducts.map((product, idx) => (
            <ProductCard key={`featured-${product.id}`} product={product} index={idx} />
          ))}
        </div>
      </section>

      {/* All Products Section */}
      <section id="all-products-section" className="mb-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="opacity-60 text-[10px] font-black uppercase tracking-[0.2em]">Todos os Produtos</h3>
          <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">{dbProducts.filter(p => !store?.id || p.storeId === store.id).length} itens</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
          {dbProducts.filter(p => !store?.id || p.storeId === store.id).map((product, idx) => (
            <ProductCard key={`all-${product.id}`} product={product} index={idx} />
          ))}
        </div>
      </section>

      {/* Promotions Section */}
      {promoProducts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 px-1">
            <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Super Ofertas</h3>
            <span className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 rounded-full animate-flash">OFERTAS ATIVAS</span>
          </div>
          <div className="grid grid-cols-1 gap-8 pb-2">
            {promoProducts.map((product, idx) => (
              <ProductCard key={`promo-${product.id}`} product={product} index={idx} />
            ))}
          </div>
        </section>
      )}

       {/* Combos */}
       <section className="mb-6">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6 px-1">Nossos Combos</h3>
        {combos.map((combo, idx) => (
          <motion.div 
            key={`combo-${combo.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => handleOpenProduct(combo)}
            className="glass rounded-[2rem] p-6 mb-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
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

      <ProductModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
}
