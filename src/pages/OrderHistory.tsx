import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Clock, MapPin, Package, CheckCircle2, ChefHat, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';

const statusLabels: Record<Order['status'], { label: string, color: string, icon: any }> = {
  pending_payment: { label: 'Aguardando Pagamento', color: 'text-orange-500', icon: Clock },
  received: { label: 'Pagamento Aprovado', color: 'text-blue-500', icon: Check },
  preparing: { label: 'Preparando', color: 'text-primary', icon: ChefHat },
  ready_for_pickup: { label: 'Pronto para Retirada', color: 'text-emerald-500', icon: Package },
  shipped: { label: 'Saiu para Entrega', color: 'text-secondary', icon: MapPin },
  completed: { label: 'Concluído', color: 'text-white/40', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'text-red-500', icon: Clock },
};

export default function OrderHistory() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<(Order & { storeId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        // Query all orders across all stores for this user
        const q = query(
          collectionGroup(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          return {
            id: doc.id,
            ...doc.data(),
            storeId: doc.ref.parent.parent?.id || 'default'
          };
        }) as (Order & { storeId: string })[];
        setOrders(fetched);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="px-6 py-8 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-white">Meus Pedidos</h1>
          <p className="text-sm text-white/60">Histórico de compras</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => {
             const statusInfo = statusLabels[order.status] || statusLabels.pending_payment;
             const StatusIcon = statusInfo.icon;
             return (
              <motion.button
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/tracking/${order.storeId}/${order.id}`)}
                className="w-full text-left glass rounded-2xl p-5 block hover:border-white/20 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-white text-lg">#{order.orderNumber}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 ${statusInfo.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{statusInfo.label}</span>
                </div>
              </motion.button>
             );
          })}
        </div>
      )}
    </div>
  );
}
