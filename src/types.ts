export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'sorvetes' | 'milkshakes' | 'acai' | 'combos' | 'promocao';
  image: string;
  rating: number;
  isBestSeller?: boolean;
  tag?: string;
  maxFlavors?: number;
  availableFlavors?: string[];
  stock?: number;
}

export interface CartItem extends Product {
  cartItemId: string; // Unique ID for each cart combination
  quantity: number;
  notes?: string;
  flavors?: string[];
  toppings?: string[];
}

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  userId?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'pix' | 'card' | 'cash';
  isActive: boolean;
  details?: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  deliveryType?: 'delivery' | 'pickup';
  lalamoveStatus?: string;
  lalamoveDriver?: string;
  lalamoveShareLink?: string;
  createdAt: string;
  orderNumber?: string;
  paymentApproved?: boolean;
  paymentStatus?: 'pending' | 'approved' | 'rejected' | 'pending_whatsapp';
  paymentMethod?: 'online' | 'whatsapp';
}
