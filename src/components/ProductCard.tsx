import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Star, Plus, Cloud, Heart, MessageCircle, TrendingUp, Zap, Edit } from 'lucide-react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import ProductModal from './ProductModal';
import { cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  index: number;
  key?: any;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const { addToCart, profile } = useApp();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const isAdmin = profile?.isAdmin;

  const handleWhatsAppOrder = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const text = encodeURIComponent(`Olá! Gostaria de pedir o ${product.name} (R$ ${(product.price || 0).toFixed(2)})`);
    window.open(`https://wa.me/5500000000000?text=${text}`, '_blank');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className="glass rounded-[2.5rem] overflow-hidden group shadow-2xl relative active:scale-[0.98] transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,242,255,0.15)] hover:border-primary/20"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent" />
          
          {/* Top Layer Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.isBestSeller && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-secondary/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-secondary/30 shadow-lg"
              >
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Mais Vendido</span>
              </motion.div>
            )}
            {product.originalPrice && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-primary/30 shadow-lg"
              >
                <Zap className="w-3 h-3 text-dark" />
                <span className="text-[9px] font-black text-dark uppercase tracking-wider">Promoção</span>
              </motion.div>
            )}
          </div>

          {/* Rating */}
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/10">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-bold">{(product.rating || 0).toFixed(1)}</span>
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            className={cn(
              "absolute bottom-4 right-4 p-3 rounded-2xl transition-all duration-300 backdrop-blur-xl border border-white/10",
              isFavorite ? "bg-red-500/80 text-white border-red-500/50" : "bg-black/20 text-white/60 hover:text-white"
            )}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               {product.tag && (
                 <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{product.tag}</span>
               )}
            </div>
            <h3 className="font-serif italic text-xl font-bold tracking-tight">{product.name}</h3>
            <p className="text-white/40 text-xs line-clamp-2 mt-1.5 leading-relaxed font-medium">{product.description}</p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tighter text-white">R$ {(product.price || 0).toFixed(2)}</span>
                {product.originalPrice && (
                  <span className="text-sm text-white/20 line-through font-medium">R$ {(product.originalPrice || 0).toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleWhatsAppOrder(e)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl glass border-white/10 text-primary hover:bg-primary/10 transition-colors"
                id={`btn-wa-${product.id}`}
              >
                <MessageCircle className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white text-dark hover:bg-primary transition-all duration-300"
                id={`btn-add-menu-${product.id}`}
              >
                <Plus className="w-6 h-6" />
              </motion.button>

              {isAdmin && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin?tab=products&edit=${product.id}`);
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl glass border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                  title="Editar Produto"
                >
                   <Edit className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <ProductModal 
        product={product} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
