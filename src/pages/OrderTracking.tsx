import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { 
  ShoppingBag, 
  Clock, 
  ChefHat, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft,
  Phone,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { WHATSAPP_PHONE } from '../constants';

const STATUS_STEPS = [
  { id: 'pending_payment', label: 'Pagamento', icon: Clock, description: 'Aguardando confirmação' },
  { id: 'received', label: 'Recebido', icon: ShoppingBag, description: 'Pedido aceito pela loja' },
  { id: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Seu sorvete está sendo montado' },
  { id: 'shipped', label: 'A caminho', icon: Truck, description: 'O entregador está indo até você', method: 'delivery' },
  { id: 'ready_for_pickup', label: 'Pronto', icon: MapPin, description: 'Pode vir buscar seu sorvete!', method: 'pickup' },
  { id: 'completed', label: 'Entregue', icon: CheckCircle2, description: 'Aproveite seu sorvete!' }
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest animate-pulse">Localizando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
          <HelpCircle className="w-10 h-10 text-white/20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-serif italic font-bold">Pedido não encontrado</h1>
          <p className="text-white/40 text-sm">Não conseguimos localizar este pedido em nossa nuvem.</p>
        </div>
        <button 
          onClick={() => navigate('/orders')}
          className="bg-primary text-dark px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
        >
          Ver meus pedidos
        </button>
      </div>
    );
  }

  const relevantSteps = STATUS_STEPS.filter(s => !s.method || s.method === order.deliveryMethod);
  const currentStep = relevantSteps.find(s => s.id === order.status);
  const StatusIcon = currentStep?.icon || Clock;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-dark/80 backdrop-blur-xl z-50 border-b border-white/5">
        <button onClick={() => navigate('/orders')} className="p-2 glass rounded-xl active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Pedido</p>
          <p className="text-sm font-mono font-bold text-primary">#{order.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <main className="p-6 max-w-md mx-auto space-y-8">
        {/* Status Highlight */}
        <section className="text-center space-y-4 py-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 mx-auto relative"
          >
            <div className="absolute inset-0 bg-primary/40 blur-[40px] opacity-20 rounded-full" />
            <StatusIcon className="w-10 h-10 text-primary relative z-10" />
          </motion.div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-serif italic font-bold">
              {currentStep?.label || 'Aguardando'}
            </h2>
            <p className="text-white/40 text-sm">
              {currentStep?.description || 'Seu pedido está sendo processado.'}
            </p>
          </div>
        </section>

        {/* Real-time Progress Stepper */}
        <section className="glass rounded-[2.5rem] p-8 border-white/5 space-y-8 relative overflow-hidden">
          <div className="relative space-y-8">
            {relevantSteps.map((step, index) => {
              const isCompleted = relevantSteps.findIndex(s => s.id === order.status) >= index;
              const isCurrent = order.status === step.id;
              
              return (
                <div key={step.id} className="flex gap-6 relative">
                  {/* Vertical Line */}
                  {index < relevantSteps.length - 1 && (
                    <div className={cn(
                      "absolute left-6 top-10 w-0.5 h-10 -ml-px transition-colors duration-500",
                      relevantSteps.findIndex(s => s.id === order.status) > index ? "bg-primary" : "bg-white/5"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 flex-shrink-0 relative z-10",
                    isCompleted ? "bg-primary border-primary shadow-[0_0_20px_rgba(0,242,255,0.3)]" : "bg-white/5 border-white/10"
                  )}>
                    <step.icon className={cn("w-5 h-5", isCompleted ? "text-dark" : "text-white/20")} />
                  </div>
                  
                  <div className="flex-1 py-1">
                    <h4 className={cn(
                      "font-bold text-sm transition-colors duration-500",
                      isCompleted ? "text-white" : "text-white/20"
                    )}>
                      {step.label}
                    </h4>
                    <p className={cn(
                      "text-[10px] transition-colors duration-500",
                      isCompleted ? "text-white/40" : "text-white/10"
                    )}>
                      {step.description}
                    </p>
                  </div>

                  {isCurrent && (
                    <motion.div 
                      layoutId="current-marker"
                      className="w-2 h-2 bg-primary rounded-full absolute -left-1 top-5 shadow-[0_0_10px_rgba(0,242,255,0.8)]"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Order Details Summary */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Detalhes da Entrega</h3>
          <div className="glass rounded-[2rem] p-6 border-white/5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                {order.deliveryMethod === 'delivery' ? <Truck className="w-5 h-5 text-white/40" /> : <MapPin className="w-5 h-5 text-white/40" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Método</p>
                <p className="text-sm font-bold">{order.deliveryMethod === 'delivery' ? 'Delivery' : 'Retirada na Loja'}</p>
                {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
                  <p className="text-xs text-white/40 mt-1">
                    {order.deliveryAddress.street}, {order.deliveryAddress.number}
                    {order.deliveryAddress.complement ? ` - ${order.deliveryAddress.complement}` : ''}
                    <br />
                    {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => window.open(`https://wa.me/${WHATSAPP_PHONE}`, '_blank')}
            className="glass py-5 rounded-[2rem] border-white/5 flex flex-col items-center justify-center gap-2 group hover:bg-white/5 transition-all active:scale-95"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 font-mono">Suporte</span>
          </button>
          
          <button 
            onClick={() => navigate('/menu')}
            className="bg-white text-dark py-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
          >
            <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest font-mono">Pedir mais</span>
          </button>
        </section>
      </main>
    </div>
  );
}
