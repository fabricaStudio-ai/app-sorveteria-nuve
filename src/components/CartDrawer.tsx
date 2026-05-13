import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight, MessageCircle, CreditCard, Loader2, User as UserIcon, MapPin, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import { WHATSAPP_PHONE } from '../constants';
import { createCheckoutSession } from '../lib/stripe';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { cart, updateQuantity, removeFromCart, clearCart, profile, user: authUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const getCustomerName = () => profile?.name || customerNameInput || 'Cliente Anônimo';

  const createOrderInFirestore = async () => {
    try {
      const orderNumber = Math.floor(1000 + Math.random() * 9000).toString();
      const orderData = {
        userId: authUser?.uid || null,
        customerName: getCustomerName(),
        customerEmail: authUser?.email || '',
        items: cart,
        total: total,
        deliveryType: deliveryType,
        address: deliveryType === 'delivery' ? address : 'Retirada na Loja',
        status: 'pending',
        createdAt: new Date().toISOString(),
        orderNumber: orderNumber
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      return { id: docRef.id, orderNumber };
    } catch (e) {
      console.error("Error creating order:", e);
      return null;
    }
  };

  const handleOnlinePayment = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    if (!profile && !customerNameInput) {
      setError("Por favor, informe seu nome para o pedido.");
      return;
    }

    if (deliveryType === 'delivery' && !address.trim()) {
      setError("Por favor, informe seu endereço para entrega.");
      return;
    }

    setError(null);
    
    // Check if Stripe key is configured - use VITE_ prefix for client side
    if (!stripeKey || stripeKey === 'pk_test_...') {
      setError("Configuração pendente: Por favor, configure a chave da Stripe no painel de Segredos (VITE_STRIPE_PUBLISHABLE_KEY).");
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Create order first
      const orderInfo = await createOrderInFirestore();
      if (!orderInfo) {
        throw new Error("Não foi possível registrar o pedido no banco de dados. Verifique a conexão.");
      }

      const checkoutResponse = await createCheckoutSession(cart);
      const url = checkoutResponse.url;
      
      if (url) {
        // Redirect in the same window for better mobile experience
        window.location.assign(url);
      } else {
        throw new Error("A sessão do Stripe não retornou uma URL de pagamento válida.");
      }
    } catch (error: any) {
      console.error("Checkout Error:", error);
      setError(error.message || "Erro ao processar pagamento. Verifique as chaves da Stripe.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsAppCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;

    if (!profile && !customerNameInput) {
      setError("Por favor, informe seu nome para o pedido.");
      return;
    }

    if (deliveryType === 'delivery' && !address.trim()) {
      setError("Por favor, informe seu endereço para entrega.");
      return;
    }

    setIsProcessing(true);
    const orderInfo = await createOrderInFirestore();
    setIsProcessing(false);

    let message = `🍦 *NOVO PEDIDO - SORVETERIA NUVÊ*\n`;
    message += `🔢 *Pedido #${orderInfo?.orderNumber}*\n`;
    message += `👤 *Cliente: ${getCustomerName()}*\n`;
    message += `🚚 *Método: ${deliveryType === 'delivery' ? 'Entrega' : 'Retirada na Loja'}*\n`;
    if (deliveryType === 'delivery') {
      message += `📍 *Endereço: ${address}*\n`;
    }
    message += `\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    cart.forEach((item, index) => {
      message += `*${item.quantity}x ${item.name}*\n`;
      if (item.flavors && item.flavors.length > 0) message += `🍦 Sabores: ${item.flavors.join(', ')}\n`;
      if (item.toppings && item.toppings.length > 0) message += `✨ Coberturas: ${item.toppings.join(', ')}\n`;
      if (item.notes) message += `📝 Obs: ${item.notes}\n`;
      message += `💰 Subtotal: R$ ${((item.price || 0) * item.quantity).toFixed(2)}\n`;
      message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⭐ *TOTAL: R$ ${(total || 0).toFixed(2)}*\n\n`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-dark z-[100] rounded-t-[3rem] max-w-md mx-auto h-[92vh] flex flex-col border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Grabber */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2" />

            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-serif italic font-bold">Seu Carrinho</h2>
              </div>
              <button onClick={onClose} className="p-2 glass rounded-full">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 pb-32">
              <div className="flex flex-col gap-6">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div key={item.cartItemId} className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden glass-dark flex-shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-serif italic font-bold text-lg leading-tight">{item.name}</h4>
                          <p className="text-primary font-bold text-sm">R$ {(item.price || 0).toFixed(2)}</p>
                          
                          {/* Customizations display */}
                          <div className="mt-2 space-y-1">
                            {item.flavors && item.flavors.length > 0 && (
                              <p className="text-[10px] text-white/50 leading-tight">
                                <span className="text-primary/70 font-bold uppercase tracking-tighter mr-1">Sabores:</span>
                                {item.flavors.join(', ')}
                              </p>
                            )}
                            {item.toppings && item.toppings.length > 0 && (
                              <p className="text-[10px] text-white/50 leading-tight">
                                <span className="text-secondary font-bold uppercase tracking-tighter mr-1">Coberturas:</span>
                                {item.toppings.join(', ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-white/30 italic">"{item.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center glass rounded-xl px-2 py-1 gap-3">
                            <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="p-1 hover:text-primary transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="p-1 hover:text-primary transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.cartItemId)} className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center opacity-30 py-20 gap-4">
                    <ShoppingBag className="w-16 h-16" strokeWidth={1} />
                    <p className="font-bold uppercase tracking-widest text-sm">Carrinho Vazio</p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="space-y-6 pt-4 border-t border-white/5">
                  {/* Delivery Type Selector */}
                  <div className="flex gap-2 p-1 glass rounded-2xl">
                    <button
                      onClick={() => setDeliveryType('delivery')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] transition-all",
                        deliveryType === 'delivery' ? "bg-white text-dark shadow-lg" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      <MapPin className="w-4 h-4" /> Entrega
                    </button>
                    <button
                      onClick={() => setDeliveryType('pickup')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] transition-all",
                        deliveryType === 'pickup' ? "bg-white text-dark shadow-lg" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      <Store className="w-4 h-4" /> Retirada
                    </button>
                  </div>

                  {!profile && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Seu Nome</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="text" 
                          placeholder="Como podemos te chamar?"
                          value={customerNameInput}
                          onChange={(e) => setCustomerNameInput(e.target.value)}
                          className="w-full glass bg-white/5 p-4 pl-12 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                        />
                      </div>
                    </div>
                  )}

                  {deliveryType === 'delivery' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Endereço de Entrega</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-5 w-4 h-4 text-white/20" />
                        <textarea 
                          placeholder="Rua, número, bairro e complemento..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full glass bg-white/5 p-4 pl-12 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10 min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Fixed at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 glass-dark border-t border-white/10 shadow-[0_-15px_30px_rgba(0,0,0,0.5)] bg-dark/95 backdrop-blur-xl">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-red-400 font-bold leading-tight">{error}</p>
                </div>
              )}
              
              <div className="flex items-end justify-between mb-4">
                <span className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] pb-1">Total do Pedido</span>
                <span className="text-3xl font-black tracking-tighter text-primary leading-none">R$ {(total || 0).toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={cart.length === 0 || isProcessing}
                  onClick={handleOnlinePayment}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50",
                    (!stripeKey || stripeKey === 'pk_test_...') 
                      ? "glass text-white/30 border-white/5" 
                      : "bg-primary text-dark shadow-[0_15px_30px_rgba(0,242,255,0.2)] hover:brightness-110"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Pagar Online <CreditCard className="w-4 h-4" /></>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={cart.length === 0 || isProcessing}
                  onClick={handleWhatsAppCheckout}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50",
                     (!stripeKey || stripeKey === 'pk_test_...')
                      ? "bg-primary text-dark shadow-[0_15px_30px_rgba(0,242,255,0.2)] hover:brightness-110"
                      : "glass text-white/50 hover:text-white"
                  )}
                >
                  Pedir via WhatsApp <MessageCircle className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
