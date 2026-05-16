import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Orders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const { clearCart } = useApp();

  useEffect(() => {
    const processPayment = async () => {
      const isSuccess = searchParams.get('success');
      const isPending = searchParams.get('pending');
      const orderId = searchParams.get('orderId');

      if (!orderId) {
        setStatus('success'); // General orders page view
        return;
      }

      if (isSuccess === 'true') {
        clearCart();
        setStatus('success');
      } else if (isPending === 'true') {
        setStatus('pending');
      } else {
        setStatus('success');
      }
    };

    processPayment();
  }, [searchParams, clearCart]);

  if (status === 'loading') {
    return (
      <div className="p-8 text-center text-white/40 min-h-screen flex items-center justify-center">
        Atualizando status do pedido...
      </div>
    );
  }

  if (status === 'error') {
     return (
      <div className="p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-primary mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-4">Erro ao atualizar</h2>
        <p className="text-white/40 mb-8">Não foi possível confirmar o pagamento. Por favor, entre em contato com o suporte.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-primary text-dark font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors">
          Voltar ao Início
        </button>
      </div>
     )
  }

  if (searchParams.get('orderId')) {
     return (
        <div className="p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
          {status === 'success' ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
               <CheckCircle2 className="w-20 h-20 text-[#25D366] mb-6" />
               <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-4">Pedido Confirmado!</h2>
               <p className="text-white/60 mb-8">Seu pagamento foi aprovado e a loja já recebeu seu pedido. O preparo começará em breve.</p>
            </motion.div>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
               <Clock className="w-20 h-20 text-yellow-500 mb-6" />
               <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-4">Pagamento Pendente</h2>
               <p className="text-white/60 mb-8">Estamos aguardando a confirmação do pagamento. Você receberá atualizações em breve.</p>
            </motion.div>
          )}
          <button onClick={() => navigate('/')} className="px-8 py-4 bg-primary text-dark font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors">
            Voltar ao Início
          </button>
        </div>
     );
  }

  return (
    <div className="p-8 pt-20">
      <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-8 text-center">Seus Pedidos</h1>
      <div className="text-center text-white/40 mt-20">
         Meus pedidos aparecerão aqui em breve.
      </div>
    </div>
  );
}
