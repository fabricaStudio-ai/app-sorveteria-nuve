import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, Star, Minus, Plus, Cloud, MessageCircle, Check, Edit } from 'lucide-react';
import { Product } from '../types';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FLAVORS, TOPPINGS } from '../constants';

export default function ProductModal({ product, isOpen, onClose }: { product: Product | null, isOpen: boolean, onClose: () => void }) {
  const { addToCart, profile } = useApp();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  const isAdmin = profile?.isAdmin;

  if (!product) return null;

  const handleAdd = () => {
    addToCart(product, quantity, notes, selectedFlavors, selectedToppings);
    onClose();
    setQuantity(1);
    setNotes('');
    setSelectedFlavors([]);
    setSelectedToppings([]);
  };

  const handleFlavorToggle = (flavor: string) => {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(prev => prev.filter(f => f !== flavor));
    } else {
      const actualMaxFlavors = Number(product.maxFlavors) || (['sorvetes', 'milkshakes'].includes(product.category) ? 2 : 0);
      if (actualMaxFlavors > 1 && selectedFlavors.length < actualMaxFlavors) {
        setSelectedFlavors(prev => [...prev, flavor]);
      } else if (actualMaxFlavors === 1) {
        setSelectedFlavors([flavor]);
      }
    }
  };

  const handleToppingToggle = (topping: string) => {
    if (selectedToppings.includes(topping)) {
      setSelectedToppings(prev => prev.filter(t => t !== topping));
    } else {
      setSelectedToppings(prev => [...prev, topping]);
    }
  };

  const handleWhatsAppOrder = () => {
    const customizations = [
      selectedFlavors.length > 0 ? `Sabores: ${selectedFlavors.join(', ')}` : '',
      selectedToppings.length > 0 ? `Coberturas: ${selectedToppings.join(', ')}` : '',
      notes ? `Obs: ${notes}` : ''
    ].filter(Boolean).join(' | ');

    const text = encodeURIComponent(`Olá! Gostaria de pedir ${quantity}x ${product.name} (R$ ${((product.price || 0) * quantity).toFixed(2)})${customizations ? ` - ${customizations}` : ''}`);
    window.open(`https://wa.me/5500000000000?text=${text}`, '_blank');
  };

  const showFlavors = (Number(product.maxFlavors) || 0) > 0 || ['sorvetes', 'milkshakes'].includes(product.category);
  const maxFlavors = Number(product.maxFlavors) || (['sorvetes', 'milkshakes'].includes(product.category) ? 2 : 0);
  const showToppings = ['sorvetes', 'acai', 'milkshakes'].includes(product.category);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[90] max-w-md mx-auto bg-dark flex flex-col md:rounded-[3rem] md:inset-4 md:h-fit md:max-h-[90vh] overflow-hidden shadow-2xl"
          >
            <div className="relative h-[40vh] flex-shrink-0">
              <img src={product.image} className="w-full h-full object-cover" alt={product.name} referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent" />
              <button onClick={onClose} className="absolute top-6 right-6 p-3 glass rounded-2xl">
                <X className="w-6 h-6" />
              </button>
              
              <div className="absolute bottom-8 left-8 right-8">
                 {product.category === 'sorvetes' && (
                  <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-primary/30 w-fit mb-4">
                    <Cloud className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Artesanal Nuvê</span>
                  </div>
                )}
                <h2 className="text-4xl font-serif italic font-bold tracking-tighter mb-2">{product.name}</h2>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="text-sm font-bold">{product.rating}</span>
                   </div>
                   <span className="text-white/20">|</span>
                   <span className="text-primary font-bold">R$ {(product.price || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-8">
              <div>
                <h3 className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-3">Sobre esta delícia</h3>
                <p className="text-white/70 leading-relaxed">{product.description}</p>
              </div>

              {showFlavors && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Escolha seus Sabores</h3>
                    <span className="text-[10px] text-primary/50 font-bold">{selectedFlavors.length}/{maxFlavors}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(product.availableFlavors && product.availableFlavors.length > 0 ? product.availableFlavors : FLAVORS).map(flavor => {
                      const isSelected = selectedFlavors.includes(flavor);
                      const isFull = selectedFlavors.length >= (maxFlavors || 0);
                      return (
                        <button
                          key={flavor}
                          disabled={!isSelected && isFull}
                          onClick={() => handleFlavorToggle(flavor)}
                          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-primary text-dark font-bold' 
                              : 'glass text-white/50 hover:text-white disabled:opacity-30'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {flavor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showToppings && (
                <div>
                  <h3 className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-4">Adicionais & Coberturas</h3>
                  <div className="flex flex-wrap gap-2">
                    {TOPPINGS.map(topping => {
                      const isSelected = selectedToppings.includes(topping);
                      return (
                        <button
                          key={topping}
                          onClick={() => handleToppingToggle(topping)}
                          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-secondary text-white font-bold' 
                              : 'glass text-white/50 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {topping}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-3">Observações (opcional)</h3>
                <textarea 
                  placeholder="Alguma restrição ou pedido especial?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full glass rounded-[1.5rem] p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 h-24 placeholder:text-white/10 resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                 <h3 className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Quantidade</h3>
                 <div className="flex items-center glass rounded-2xl px-3 py-2 gap-6">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 hover:text-primary transition-colors">
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-bold w-6 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="p-1 hover:text-primary transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                 </div>
              </div>
            </div>

            <div className="p-8 glass-dark border-t border-white/5 flex flex-col gap-3">
               <button
                 onClick={handleAdd}
                 className="w-full bg-white text-dark py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                 Adicionar (R$ ${((product.price || 0) * quantity).toFixed(2)})
               </button>
               
               {!isAdmin ? (
                 <button
                   onClick={handleWhatsAppOrder}
                   className="w-full glass border-primary/20 text-primary py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                 >
                   <MessageCircle className="w-5 h-5" /> Pedir no WhatsApp
                 </button>
               ) : (
                 <button
                   onClick={() => navigate(`/admin?tab=products&edit=${product.id}`)}
                   className="w-full glass border-primary/20 text-primary py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                 >
                   <Edit className="w-5 h-5" /> Editar Produto (Admin)
                 </button>
               )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
