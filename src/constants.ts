import { Product, Category } from './types';

export const FLAVORS = [
  'Baunilha Bourbon',
  'Chocolate Belga',
  'Morango Silvestre',
  'Pistache Italiano',
  'Doce de Leite',
  'Menta Refrescante',
  'Céu Azul (Chiclete)',
  'Ninho Trufado',
  'Coco Queimado'
];

export const TOPPINGS = [
  'Granulado de Chocolate',
  'Caldas de Morango',
  'Mel de Abelha',
  'Granola Artesanal',
  'Leite em Pó',
  'Creme de Avelã',
  'Castanhas Crocantes',
  'Marshmallow'
];

export const WHATSAPP_PHONE = '5500000000000'; // Substitua pelo seu número real

export const CATEGORIES: Category[] = [
  { id: 'promocao', name: 'Promoções', icon: '🔥' },
  { id: 'sorvetes', name: 'Sorvetes', icon: '🍦' },
  { id: 'milkshakes', name: 'Milkshakes', icon: '🥤' },
  { id: 'acai', name: 'Açaí', icon: '🥣' },
  { id: 'combos', name: 'Combos', icon: '🎁' },
];

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Nuvem de Baunilha',
    description: 'Sorvete artesanal de baunilha Bourbon com raspas de chocolate branco e algodão doce.',
    price: 18.90,
    category: 'sorvetes',
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    isBestSeller: true,
    tag: 'Artesanal',
    maxFlavors: 2
  },
  {
    id: '2',
    name: 'Céu Azul Neon',
    description: 'Um mix refrescante de mirtilo, spirulina azul e um toque cítrico.',
    price: 22.50,
    category: 'sorvetes',
    image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    tag: 'Premium',
    maxFlavors: 2
  },
  {
    id: '3',
    name: 'Milkshake Galaxy',
    description: 'Batido com sorvete de mirtilo, calda de marshmallow e granulados espaciais.',
    price: 26.00,
    category: 'milkshakes',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    isBestSeller: true,
    maxFlavors: 1
  },
  {
    id: '4',
    name: 'Açaí Nuvê Especial',
    description: 'Açaí cremoso com leite ninho, morangos, granola artesanal e mel.',
    price: 32.00,
    category: 'acai',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    tag: 'Energia',
    maxFlavors: 0 // Acai usually doesn't have "scoops" of flavors in the same way, but can have toppings
  },
  {
    id: '5',
    name: 'Combo Astral',
    description: '2 Sorvetes Médios + 1 Milkshake de Chocolate.',
    price: 49.90,
    originalPrice: 65.00,
    category: 'promocao',
    image: 'https://images.unsplash.com/photo-1505394033343-43ad05d38b3a?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    tag: 'Oferta'
  },
  {
    id: '6',
    name: 'Sorvete de Pistache Real',
    description: 'Pistaches selecionados da Sicília com base cremosa e pedaços crocantes.',
    price: 28.00,
    category: 'sorvetes',
    image: 'https://images.unsplash.com/photo-1567206563066-ec262159c79e?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    isBestSeller: true,
    maxFlavors: 2
  }
];
