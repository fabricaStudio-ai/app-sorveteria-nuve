import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Transaction, PaymentMethod, Order } from '../types';
import { PRODUCTS } from '../constants';
import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  ChefHat,
  ChevronRight,
  ArrowUpRight,
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  ArrowDownRight,
  PlusCircle,
  Calendar,
  CreditCard,
  Settings,
  Smartphone,
  Banknote,
  Check,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { cn } from '../lib/utils';

const chartData = [
  { name: 'Seg', sales: 4000, orders: 24, expense: 1200 },
  { name: 'Ter', sales: 3000, orders: 18, expense: 800 },
  { name: 'Qua', sales: 2000, orders: 12, expense: 1500 },
  { name: 'Qui', sales: 2780, orders: 20, expense: 900 },
  { name: 'Sex', sales: 1890, orders: 15, expense: 1100 },
  { name: 'Sáb', sales: 2390, orders: 25, expense: 2000 },
  { name: 'Dom', sales: 3490, orders: 30, expense: 500 },
];

const COLORS = ['#00f2ff', '#7000ff', '#ff00d4', '#ff8c00', '#00ff8c'];

export default function Admin() {
  const { profile, loading: authLoading } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') as any;

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'finance' | 'payments'>(
    initialTab && ['overview', 'products', 'orders', 'finance', 'payments'].includes(initialTab) 
    ? initialTab 
    : 'overview'
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<'Todos' | 'Pendentes' | 'Preparando' | 'Prontos'>('Todos');
  const [loading, setLoading] = useState(true);
  
  // Notification State
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrdersCount = useRef<number>(0);

  // Finance Modal State
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'Ingredientes',
    description: '',
    amount: ''
  });

  // Payment Method Modal State
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    name: '',
    type: 'pix' as 'pix' | 'card' | 'cash',
    isActive: true,
    details: ''
  });

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'sorvetes',
    image: '',
    rating: 5,
    tag: '',
    isBestSeller: false,
    stock: '',
    availableFlavors: '',
    maxFlavors: '0'
  });

  const modalProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    // Handle tab change from URL
    const tabParam = queryParams.get('tab');
    if (tabParam && ['overview', 'products', 'orders', 'finance', 'payments'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  useEffect(() => {
    // Handle specific product editing from URL
    const editId = queryParams.get('edit');
    const isNew = queryParams.get('new') === 'true';
    const currentSearch = location.search;

    if (modalProcessedRef.current === currentSearch) return;

    if (editId && (products.length > 0 || !loading)) {
      const productToEdit = products.find(p => p.id === editId) || PRODUCTS.find(p => p.id === editId);
      if (productToEdit) {
        modalProcessedRef.current = currentSearch;
        openProductModal(productToEdit);
        const currentTab = queryParams.get('tab') || 'products';
        navigate(`/admin?tab=${currentTab}`, { replace: true });
      }
    } else if (isNew) {
      modalProcessedRef.current = currentSearch;
      openProductModal();
      const currentTab = queryParams.get('tab') || 'products';
      navigate(`/admin?tab=${currentTab}`, { replace: true });
    }
  }, [products, loading, location.search, navigate]);

  useEffect(() => {
    if (!profile?.isAdmin) return;

    fetchProducts();
    fetchTransactions();
    fetchPaymentMethods();

    // Sound for notifications
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // Real-time Orders Listener (Preparation Queue)
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);

      // Check for new orders to trigger notification
      if (ordersData.length > prevOrdersCount.current && prevOrdersCount.current !== 0) {
        const latestOrder = ordersData[0];
        // Only notify if it's a pending order AND it's not from the admin
        if (latestOrder.status === 'pending' && latestOrder.customerEmail !== 'fabricasoftwareai@gmail.com') {
          setNewOrderNotification(latestOrder);
          audioRef.current?.play().catch(e => console.log('Audio play blocked'));
        }
      }
      prevOrdersCount.current = ordersData.length;
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [profile]);

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'transactions'));
      const trans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(trans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'paymentMethods'));
      const methods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
      setPaymentMethods(methods);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.description) return;
    
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        date: new Date().toISOString(),
        userId: profile?.userId
      });
      setShowAddTransaction(false);
      setNewTransaction({ type: 'expense', category: 'Ingredientes', description: '', amount: '' });
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPayment.name) return;
    
    try {
      await addDoc(collection(db, 'paymentMethods'), newPayment);
      setShowAddPayment(false);
      setNewPayment({ name: '', type: 'pix', isActive: true, details: '' });
      fetchPaymentMethods();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return;

    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price) || 0,
        stock: productForm.stock ? parseInt(productForm.stock as string) : 0,
        maxFlavors: parseInt(productForm.maxFlavors) || 0,
        availableFlavors: productForm.availableFlavors ? productForm.availableFlavors.split(',').map(s => s.trim()).filter(Boolean) : [],
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await setDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: new Date().toISOString(),
          rating: 5
        });
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: 'sorvetes',
        image: '',
        rating: 5,
        tag: '',
        isBestSeller: false,
        stock: '',
        availableFlavors: '',
        maxFlavors: '0'
      });
      fetchProducts();
    } catch (e) {
      console.error("Error saving product:", e);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        price: (product.price || 0).toString(),
        category: product.category || 'sorvetes',
        image: product.image || '',
        rating: product.rating || 5,
        tag: product.tag || '',
        isBestSeller: product.isBestSeller || false,
        stock: (product.stock ?? 0).toString(),
        availableFlavors: (product.availableFlavors || []).join(', '),
        maxFlavors: (product.maxFlavors || 0).toString()
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: 'sorvetes',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=600&auto=format&fit=crop',
        rating: 5,
        tag: '',
        isBestSeller: false,
        stock: '99',
        availableFlavors: '',
        maxFlavors: '2'
      });
    }
    setShowProductModal(true);
  };

  const togglePaymentStatus = async (id: string, currentStatus: boolean) => {
    try {
      const batch = writeBatch(db);
      const ref = doc(db, 'paymentMethods', id);
      batch.update(ref, { isActive: !currentStatus });
      await batch.commit();
      fetchPaymentMethods();
    } catch (e) {
      console.error(e);
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const financeCategories = transactions.reduce((acc: any, t) => {
    if (t.type === 'expense') {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
    }
    return acc;
  }, {});

  const pieData = Object.keys(financeCategories).map(key => ({
    name: key,
    value: financeCategories[key]
  }));

  const seedData = async () => {
    if (!confirm("Isso irá adicionar os produtos padrão ao banco. Continuar?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      PRODUCTS.forEach((prod) => {
        const ref = doc(collection(db, 'products'));
        batch.set(ref, {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          category: prod.category,
          image: prod.image,
          rating: prod.rating,
          isBestSeller: prod.isBestSeller || false,
          tag: prod.tag || '',
          stock: 99,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      fetchProducts();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !profile) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Verificando acesso na nuvem...</p>
      </div>
    );
  }
  
  if (!profile?.isAdmin) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-primary/30">
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
        
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 glass-dark border-r border-white/5 p-6 gap-8">
           <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                 <ChefHat className="w-6 h-6 text-dark" />
              </div>
              <h2 className="text-xl font-serif italic font-bold">Nuvê Admin</h2>
           </div>

           <nav className="flex flex-col gap-2">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Resumo' },
                { id: 'products', icon: Package, label: 'Produtos' },
                { id: 'orders', icon: ShoppingBag, label: 'Pedidos' },
                { id: 'finance', icon: Wallet, label: 'Financeiro' },
                { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
              ].map((item) => (
                <button
                  key={`nav-desktop-${item.id}`}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'bg-primary text-dark font-bold shadow-[0_10px_20_rgba(0,242,255,0.15)]' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </button>
              ))}
           </nav>

           <div className="mt-auto p-5 glass rounded-[2rem] border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Painel de Gestão</p>
              <p className="text-xs text-white/40 leading-relaxed mb-4">Administre seu estoque e visualize o crescimento em tempo real.</p>
              <button 
                onClick={fetchProducts}
                className="w-full glass py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full scrollbar-none">
           {/* Mobile Header */}
           <header className="lg:hidden flex items-center justify-between p-6 glass-dark border-b border-white/5 sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-dark" />
                </div>
                <h2 className="text-xl font-serif italic font-bold">Nuvê Admin</h2>
              </div>
              <button onClick={fetchProducts} className="p-2 glass rounded-xl active:scale-95 transition-transform">
                <RefreshCw className="w-5 h-5" />
              </button>
           </header>

           {/* Mobile Navigation Tabs */}
           <div className="lg:hidden flex gap-2 px-6 py-4 overflow-x-auto scrollbar-none border-b border-white/5 bg-dark sticky top-[77px] z-40 backdrop-blur-xl">
              {[
                { id: 'overview', label: 'Dashboard' },
                { id: 'products', label: 'Catálogo' },
                { id: 'orders', label: 'Pedidos' },
                { id: 'finance', label: 'Financeiro' },
                { id: 'payments', label: 'Pagos' },
              ].map((tab) => (
                <button
                  key={`nav-mobile-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all whitespace-nowrap active:scale-95 ${
                    activeTab === tab.id ? 'bg-primary text-dark border-primary shadow-[0_5px_15px_rgba(0,242,255,0.2)]' : 'glass border-white/5 text-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
           </div>

           <div className="p-6 md:p-12 max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                  >
                    {/* Welcome Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                       <div>
                          <motion.h1 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter"
                          >
                            Dashboard
                          </motion.h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Relatório detalhado das operações de hoje.</p>
                       </div>
                       <div className="flex items-center gap-2 p-1.5 glass rounded-2xl w-fit border-white/5">
                          <button 
                            onClick={() => {
                              audioRef.current?.play().then(() => {
                                alert("Áudio ativado para novas notificações!");
                              }).catch(e => console.log('Audio wait'));
                            }}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary flex items-center gap-2 hover:bg-primary/20 transition-all"
                          >
                             <Volume2 className="w-3.5 h-3.5" /> Ativar Som
                          </button>
                          {['Dia', 'Semana', 'Mês'].map((t) => (
                            <button 
                              key={t} 
                              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                t === 'Mês' ? 'bg-white text-dark shadow-xl' : 'text-white/30 hover:text-white/60'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                       {[
                         { label: 'Vendas Totais', value: 'R$ 12.450', icon: DollarSign, trend: '+12%', color: 'text-primary', delay: 0 },
                         { label: 'Pedidos do Dia', value: '42', icon: ShoppingBag, trend: '+5%', color: 'text-secondary', delay: 0.1 },
                         { label: 'Ticket Médio', value: 'R$ 32,40', icon: TrendingUp, trend: '+2%', color: 'text-emerald-400', delay: 0.2 },
                         { label: 'Novos Clientes', value: '18', icon: Users, trend: '+8%', color: 'text-orange-500', delay: 0.3 },
                       ].map((stat, i) => (
                         <motion.div 
                           key={stat.label}
                           initial={{ opacity: 0, y: 30 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: stat.delay }}
                           className="glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-500"
                         >
                            <div className="relative z-10 flex flex-col gap-5">
                               <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10", stat.color)}>
                                  <stat.icon className="w-7 h-7" />
                               </div>
                               <div>
                                  <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                                  <p className="text-3xl font-bold mt-2 tracking-tighter leading-none">{stat.value}</p>
                               </div>
                               <div className="flex items-center gap-2 text-xs font-bold">
                                  <div className="flex items-center gap-1 text-emerald-400">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {stat.trend}
                                  </div>
                                  <span className="opacity-30 text-white font-normal">vs ontem</span>
                               </div>
                            </div>
                            <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 blur-[80px] opacity-10 rounded-full transition-opacity group-hover:opacity-20", stat.color.replace('text', 'bg'))} />
                         </motion.div>
                       ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                       <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="xl:col-span-2 glass rounded-[3rem] p-10 border-white/5 shadow-2xl relative overflow-hidden"
                       >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                             <div>
                                <h3 className="text-2xl font-serif italic font-bold">Fluxo de Vendas</h3>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Ganhos Diários</p>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                   <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rendimento</span>
                                </div>
                             </div>
                          </div>
                          <div className="h-[380px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                   <defs>
                                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.4}/>
                                         <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                                      </linearGradient>
                                   </defs>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                   <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900' }}
                                    dy={15}
                                   />
                                   <YAxis hide />
                                   <Tooltip 
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '16px' }}
                                    itemStyle={{ color: '#00f2ff', fontSize: '14px', fontWeight: 'bold' }}
                                   />
                                   <Area 
                                    type="monotone" 
                                    dataKey="sales" 
                                    stroke="#00f2ff" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorSales)" 
                                    animationDuration={2000}
                                   />
                                </AreaChart>
                             </ResponsiveContainer>
                          </div>
                       </motion.div>

                       <div className="space-y-8">
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass rounded-[3rem] p-10 border-white/5 flex flex-col gap-8 h-full shadow-xl"
                          >
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-serif italic font-bold">Top Sabores</h3>
                                <BarChart3 className="w-5 h-5 text-primary opacity-50" />
                              </div>
                              <div className="space-y-8 flex-1">
                                 {products.slice(0, 5).map((p, idx) => (
                                   <motion.div 
                                    key={`top-flavor-${p.id}`} 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className="flex items-center gap-5 group cursor-pointer"
                                   >
                                      <div className="w-14 h-14 rounded-2xl overflow-hidden glass-dark border-white/5 flex-shrink-0 relative">
                                         <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" referrerPolicy="no-referrer" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-dark/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <h4 className="font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">{p.name}</h4>
                                         <div className="flex items-center gap-3 mt-2">
                                            <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                               <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${95 - (idx * 15)}%` }}
                                                transition={{ duration: 1.5, delay: 0.5 }}
                                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
                                               />
                                            </div>
                                            <span className="text-[10px] font-black text-white/30 tracking-widest">{95 - (idx * 15)}%</span>
                                         </div>
                                      </div>
                                      <div className="text-right">
                                         <span className="text-sm font-bold tracking-tighter">R$ {(p.price || 0).toFixed(0)}</span>
                                      </div>
                                   </motion.div>
                                 ))}
                              </div>
                              <button className="w-full glass py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] border-white/5 hover:border-primary/30 transition-all active:scale-95 bg-white/5">Relatório Completo</button>
                          </motion.div>
                       </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'products' && (
                  <motion.div 
                    key="products"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Catálogo Nuvê</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Controle total sobre seus itens e sabores artesanais.</p>
                       </div>
                       <div className="flex gap-4">
                          <button 
                            onClick={seedData}
                            className="glass px-8 py-4 rounded-[2rem] flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 border-white/5 transition-all active:scale-95"
                          >
                             <RefreshCw className="w-4 h-4 text-primary" /> Restaurar Padrões
                          </button>
                          <button 
                            onClick={() => openProductModal()}
                            className="bg-white text-dark px-8 py-4 rounded-[2rem] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                          >
                             <Plus className="w-5 h-5" /> Cadastrar Sabor
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                       {products.map((p, idx) => (
                         <motion.div 
                            key={`catalog-item-${p.id}`} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass rounded-[3rem] p-8 border-white/5 group hover:border-primary/20 transition-all duration-500 relative overflow-hidden"
                         >
                            <div className="flex gap-6 items-start relative z-10">
                               <div className="w-24 h-24 rounded-[2rem] overflow-hidden glass-dark border-white/5 shadow-2xl">
                                  <img src={p.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" referrerPolicy="no-referrer" />
                               </div>
                               <div className="flex-1 min-w-0 py-1">
                                  <h4 className="font-serif italic font-bold text-2xl truncate mb-2 group-hover:text-primary transition-colors">{p.name}</h4>
                                  <div className="flex items-center gap-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-white/40">R$ {(p.price || 0).toFixed(2)}</p>
                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                    <span className="px-3 py-1 bg-white/5 text-[9px] font-black text-white/40 rounded-full uppercase tracking-[0.1em]">{p.category}</span>
                                  </div>
                                  <p className="text-xs text-white/30 mt-4 line-clamp-2 leading-relaxed">{p.description}</p>
                               </div>
                            </div>

                            <div className="flex gap-3 mt-8 relative z-10">
                               <button 
                                 onClick={() => openProductModal(p)}
                                 className="flex-1 glass py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 border-white/5 text-white/50 hover:text-white transition-all active:scale-95 leading-none"
                               >
                                  <Edit className="w-4 h-4" /> Editar Item
                               </button>
                               <button 
                                onClick={() => {
                                  if(confirm("Deseja apagar este sabor da Nuvê?")) {
                                    deleteDoc(doc(db, 'products', p.id)).then(fetchProducts);
                                  }
                                }}
                                className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 border-white/5 transition-all active:scale-95"
                               >
                                  <Trash2 className="w-5 h-5" />
                               </button>
                            </div>
                            
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                         </motion.div>
                       ))}

                       {products.length === 0 && (
                         <div className="col-span-full py-48 glass rounded-[4rem] border-dashed border-white/10 flex flex-col items-center justify-center gap-6 text-center">
                            <div className="w-24 h-24 glass rounded-full flex items-center justify-center border-white/5">
                              <Package className="w-10 h-10 text-white/10" strokeWidth={1} />
                            </div>
                            <div>
                               <p className="text-white font-bold uppercase tracking-[0.3em] text-sm mb-2">Nuvem Vazia</p>
                               <p className="text-white/30 text-xs max-w-xs mx-auto leading-relaxed">Você ainda não tem produtos cadastrados. Use o botão de semear ou adicione manualmente.</p>
                            </div>
                         </div>
                       )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'orders' && (
                  <motion.div 
                    key="orders"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-12 pb-20"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter flex items-center gap-4">
                            Cozinha <ChefHat className="w-8 h-8 text-secondary" />
                          </h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Fila de preparação por ordem de chegada.</p>
                       </div>
                       <div className="flex gap-4 p-1 glass rounded-2xl border-white/5 overflow-x-auto scrollbar-none">
                          {['Todos', 'Pendentes', 'Preparando', 'Prontos'].map((filter) => (
                            <button 
                              key={filter} 
                              onClick={() => setOrderFilter(filter as any)}
                              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === filter ? 'bg-primary text-dark font-bold' : 'text-white/30 hover:text-white/60'}`}
                            >
                               {filter}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                       {orders.filter(o => {
                         if (orderFilter === 'Todos') return o.status !== 'completed' && o.status !== 'cancelled';
                         if (orderFilter === 'Pendentes') return o.status === 'pending';
                         if (orderFilter === 'Preparando') return o.status === 'preparing';
                         if (orderFilter === 'Prontos') return o.status === 'ready';
                         return true;
                       }).map((order, idx) => (
                         <motion.div 
                           key={order.id}
                           layout
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className={cn(
                             "glass rounded-[3rem] p-8 border-white/5 relative overflow-hidden transition-all duration-500",
                             order.status === 'ready' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5"
                           )}
                         >
                            <div className="flex justify-between items-start mb-6">
                               <div className="px-5 py-2 glass-dark rounded-2xl border-white/5">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mesa/Pedido</span>
                                  <p className="text-xl font-bold text-primary font-mono">#{order.orderNumber || order.id.slice(-4).toUpperCase()}</p>
                               </div>
                               <div className="text-right">
                                  <div className="flex items-center gap-2 justify-end mb-1">
                                     <Clock className="w-3 h-3 text-white/30" />
                                     <span className="text-[10px] font-medium text-white/30">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    order.status === 'pending' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                    order.status === 'preparing' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  )}>
                                     {order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Preparando' : 'Pronto'}
                                  </span>
                               </div>
                            </div>

                            <div className="mb-8 p-6 glass-dark rounded-[2rem] border-white/5">
                               <h3 className="text-lg font-serif italic font-bold mb-4 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-white/30" /> {order.customerName || 'Cliente Anônimo'}
                               </h3>
                               <div className="space-y-4">
                                  {order.items.map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                       <div className="w-10 h-10 rounded-xl overflow-hidden glass border-white/10 flex-shrink-0">
                                          <img src={item.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                       </div>
                                       <div className="flex-1">
                                          <p className="text-sm font-bold leading-none mb-1">{item.quantity}x {item.name}</p>
                                          <p className="text-[10px] text-white/40 leading-tight">
                                             {item.flavors?.join(', ')} {item.toppings?.length ? `+ ${item.toppings.join(', ')}` : ''}
                                          </p>
                                          {item.notes && <p className="text-[10px] text-secondary font-medium mt-1 italic">"{item.notes}"</p>}
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                               {order.status === 'pending' && (
                                 <button 
                                   onClick={() => updateOrderStatus(order.id, 'preparing')}
                                   className="col-span-2 bg-primary text-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                 >
                                    <ChefHat className="w-4 h-4" /> Começar Preparo
                                 </button>
                               )}
                               {order.status === 'preparing' && (
                                 <button 
                                   onClick={() => updateOrderStatus(order.id, 'ready')}
                                   className="col-span-2 bg-secondary text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                 >
                                    <Bell className="w-4 h-4" /> Marcar como Pronto
                                 </button>
                               )}
                               {order.status === 'ready' && (
                                 <button 
                                   onClick={() => updateOrderStatus(order.id, 'completed')}
                                   className="col-span-2 bg-emerald-500 text-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                 >
                                    <CheckCircle2 className="w-4 h-4" /> Entregar Pedido
                                 </button>
                               )}
                            </div>
                            
                            <div className={cn(
                              "absolute -bottom-20 -right-20 w-48 h-48 blur-[80px] opacity-10 rounded-full",
                              order.status === 'preparing' ? "bg-primary" : "bg-white"
                            )} />
                         </motion.div>
                       ))}

                       {orders.length === 0 && (
                         <div className="col-span-full py-48 glass rounded-[4rem] border-dashed border-white/10 flex flex-col items-center justify-center gap-6 text-center opacity-30">
                            <ShoppingBag className="w-16 h-16" strokeWidth={1} />
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido na fila</p>
                            </div>
                         </div>
                       )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'finance' && (
                  <motion.div 
                    key="finance"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Financeiro</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Gestão de fluxo de caixa e rentabilidade da Nuvê.</p>
                       </div>
                       <button 
                         onClick={() => setShowAddTransaction(true)}
                         className="bg-primary text-dark px-8 py-4 rounded-[2rem] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_rgba(0,242,255,0.2)] active:scale-95 transition-all"
                       >
                          <PlusCircle className="w-5 h-5" /> Nova Transação
                       </button>
                    </div>

                    {/* Finance Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       {[
                         { label: 'Total Entradas', value: `R$ ${totalIncome.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-emerald-400' },
                         { label: 'Total Saídas', value: `R$ ${totalExpense.toLocaleString('pt-BR')}`, icon: ArrowDownRight, color: 'text-red-400' },
                         { label: 'Lucro Líquido', value: `R$ ${profit.toLocaleString('pt-BR')}`, icon: DollarSign, color: profit >= 0 ? 'text-primary' : 'text-red-400' },
                       ].map((stat) => (
                         <div key={stat.label} className="glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
                            <div className="relative z-10">
                               <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 mb-4", stat.color)}>
                                  <stat.icon className="w-6 h-6" />
                               </div>
                               <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                               <p className="text-2xl font-bold mt-1 tracking-tighter">{stat.value}</p>
                            </div>
                            <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 blur-[60px] opacity-10 rounded-full", stat.color.replace('text', 'bg'))} />
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                       <div className="glass rounded-[3rem] p-10 border-white/5 h-full">
                          <h3 className="text-xl font-serif italic font-bold mb-10 flex items-center gap-3">
                            <PieChart className="w-5 h-5 text-primary" /> Distribuição de Gastos
                          </h3>
                          <div className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                   <Pie
                                    data={pieData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                   >
                                      {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                   </Pie>
                                   <Tooltip 
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                   />
                                </RePieChart>
                             </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-8">
                             {pieData.map((data, idx) => (
                               <div key={data.name} className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{data.name}</span>
                                  <span className="text-xs font-bold ml-auto">R$ {(data.value || 0).toFixed(0)}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="glass rounded-[3rem] p-10 border-white/5">
                          <div className="flex items-center justify-between mb-10">
                             <h3 className="text-xl font-serif italic font-bold flex items-center gap-3">
                               <Receipt className="w-5 h-5 text-secondary" /> Últimas Transações
                             </h3>
                             <button onClick={fetchTransactions} className="text-white/20 hover:text-white transition-colors">
                                <RefreshCw className="w-4 h-4" />
                             </button>
                          </div>
                          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-none">
                             {transactions.map((t) => (
                               <div key={t.id} className="glass-dark p-5 rounded-2xl border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                  <div className="flex items-center gap-4">
                                     <div className={cn("p-3 rounded-xl", t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                                        {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                     </div>
                                     <div>
                                        <h4 className="font-bold text-sm tracking-tight">{t.description}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{t.category}</span>
                                           <span className="w-1 h-1 bg-white/10 rounded-full" />
                                           <span className="text-[10px] font-medium text-white/20">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <p className={cn("text-sm font-black", t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR')}
                                     </p>
                                  </div>
                               </div>
                             ))}
                             {transactions.length === 0 && (
                               <div className="text-center py-20 opacity-20">
                                  <Calendar className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma transação encontrada</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {activeTab === 'payments' && (
                  <motion.div 
                    key="payments"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Formas de Pagamento</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Configure como seus clientes podem pagar na Nuvê.</p>
                       </div>
                       <button 
                         onClick={() => setShowAddPayment(true)}
                         className="bg-white text-dark px-8 py-4 rounded-[2rem] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                       >
                          <PlusCircle className="w-5 h-5" /> Adicionar Método
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                       {paymentMethods.map((method, idx) => (
                         <motion.div 
                           key={method.id}
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: idx * 0.1 }}
                           className={cn(
                             "glass rounded-[3rem] p-8 border-white/5 relative overflow-hidden transition-all duration-500",
                             !method.isActive && "opacity-40 grayscale"
                           )}
                         >
                            <div className="flex justify-between items-start mb-8 relative z-10">
                               <div className={cn(
                                 "w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5",
                                 method.type === 'pix' ? 'text-primary' : method.type === 'card' ? 'text-secondary' : 'text-emerald-400'
                               )}>
                                  {method.type === 'pix' ? <Smartphone className="w-6 h-6" /> : method.type === 'card' ? <CreditCard className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                               </div>
                               <button 
                                 onClick={() => togglePaymentStatus(method.id, method.isActive)}
                                 className={cn(
                                   "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                   method.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/40 border border-white/10"
                                 )}
                               >
                                  {method.isActive ? 'Ativo' : 'Inativo'}
                               </button>
                            </div>

                            <div className="relative z-10">
                               <h3 className="text-xl font-serif italic font-bold mb-2">{method.name}</h3>
                               <p className="text-xs text-white/30 leading-relaxed uppercase tracking-widest font-black mb-1">{method.type}</p>
                               {method.details && <p className="text-xs text-primary/60 font-medium">{method.details}</p>}
                            </div>

                            <div className="flex gap-3 mt-8 relative z-10">
                               <button 
                                 onClick={() => {
                                   if(confirm("Deseja remover esta forma de pagamento?")) {
                                     deleteDoc(doc(db, 'paymentMethods', method.id)).then(fetchPaymentMethods);
                                   }
                                 }}
                                 className="flex-1 glass py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all border-white/5"
                               >
                                 <Trash2 className="w-4 h-4" /> Excluir
                               </button>
                            </div>
                            
                            <div className={cn(
                              "absolute -bottom-10 -right-10 w-32 h-32 blur-[80px] opacity-10 rounded-full",
                              method.type === 'pix' ? 'bg-primary' : method.type === 'card' ? 'bg-secondary' : 'bg-emerald-400'
                            )} />
                         </motion.div>
                       ))}

                       {paymentMethods.length === 0 && (
                         <div className="col-span-full py-32 glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center gap-6 text-center opacity-30">
                            <CreditCard className="w-16 h-16" strokeWidth={1} />
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest">Nenhum método configurado</p>
                            </div>
                         </div>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

           </div>
        </main>
      </div>

      <AnimatePresence>
        {showAddTransaction && (
          <motion.div key="modal-add-transaction">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTransaction(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md glass-dark p-10 rounded-[3rem] border-white/5 z-[101] shadow-2xl"
            >
               <h2 className="text-2xl font-serif italic font-bold mb-8">Nova Transação</h2>
               
               <div className="space-y-6">
                  <div className="flex p-1.5 glass rounded-2xl bg-white/5">
                     <button 
                      onClick={() => setNewTransaction(prev => ({ ...prev, type: 'income' }))}
                      className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", newTransaction.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/40')}
                     >
                        Receita
                     </button>
                     <button 
                      onClick={() => setNewTransaction(prev => ({ ...prev, type: 'expense' }))}
                      className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", newTransaction.type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-white/40')}
                     >
                        Despesa
                     </button>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Categoria</label>
                     <select 
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold"
                     >
                        <option value="Ingredientes">Ingredientes</option>
                        <option value="Equipamentos">Equipamentos</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Aluguel">Aluguel</option>
                        <option value="Salários">Salários</option>
                        <option value="Vendas">Vendas</option>
                        <option value="Outros">Outros</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Descrição</label>
                     <input 
                      type="text" 
                      placeholder="Ex: Compra de leite condensado"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Valor (R$)</label>
                     <input 
                      type="number" 
                      placeholder="0,00"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-xl font-bold placeholder:text-white/10"
                     />
                  </div>

                  <button 
                    onClick={handleAddTransaction}
                    className="w-full bg-white text-dark py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4"
                  >
                    Confirmar Transação
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}

        {showProductModal && (
          <motion.div key="modal-product-editor">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProductModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-xl glass-dark p-8 md:p-10 rounded-[3rem] border-white/5 z-[101] shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none"
            >
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic font-bold">{editingProduct ? 'Editar Sabor' : 'Novo Sabor'}</h2>
                  <button onClick={() => setShowProductModal(false)} className="p-2 glass rounded-xl">
                     <Plus className="w-5 h-5 rotate-45" />
                  </button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nome do Sabor</label>
                     <input 
                      type="text" 
                      placeholder="Ex: Nuvê de Pistache"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Preço (R$)</label>
                     <input 
                      type="number" 
                      placeholder="0,00"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2 col-span-full">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Descrição</label>
                     <textarea 
                      placeholder="Descreva as notas de sabor e textura..."
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10 h-24 resize-none"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Categoria</label>
                     <select 
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold"
                     >
                        <option value="sorvetes">Sorvetes</option>
                        <option value="acai">Açaí</option>
                        <option value="milkshakes">Milkshakes</option>
                        <option value="combos">Combos</option>
                        <option value="bebidas">Bebidas</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Tag (Opcional)</label>
                     <input 
                      type="text" 
                      placeholder="Ex: Vegano, Zero Açúcar"
                      value={productForm.tag}
                      onChange={(e) => setProductForm(prev => ({ ...prev, tag: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Estoque (Qtd)</label>
                     <input 
                      type="number" 
                      placeholder="99"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Limite de Sabores</label>
                      <input 
                       type="number" 
                       placeholder="Ex: 2"
                       value={productForm.maxFlavors}
                       onChange={(e) => setProductForm(prev => ({ ...prev, maxFlavors: e.target.value }))}
                       className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                      />
                   </div>

                   <div className="space-y-2 col-span-full">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Sabores Disponíveis (Separados por vírgula)</label>
                      <textarea 
                       placeholder="Baunilha, Chocolate, Morango..."
                       value={productForm.availableFlavors}
                       onChange={(e) => setProductForm(prev => ({ ...prev, availableFlavors: e.target.value }))}
                       className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10 h-20 resize-none"
                      />
                   </div>

                  <div className="space-y-2 col-span-full">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Imagem do Produto</label>
                     <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden glass border-white/10 flex-shrink-0 bg-white/5">
                           {productForm.image ? (
                              <img src={productForm.image} className="w-full h-full object-cover" alt="Preview" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10 italic text-[8px] uppercase">Sem Foto</div>
                           )}
                        </div>
                        <div className="flex-1 w-full space-y-3">
                           <input 
                            type="text" 
                            placeholder="URL da Imagem (opcional se enviar arquivo)"
                            value={productForm.image}
                            onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                            className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                           />
                           <div className="relative h-12">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                              />
                              <div className="absolute inset-0 glass border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                                 <Plus className="w-3 h-3" /> Selecionar Foto
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group col-span-full bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={productForm.isBestSeller}
                        onChange={(e) => setProductForm(prev => ({ ...prev, isBestSeller: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-white/10 rounded-full peer-checked:bg-primary transition-colors" />
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-md" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Marcar como "Mais Vendido"</span>
                  </label>

                  <button 
                    onClick={handleSaveProduct}
                    className="w-full bg-white text-dark py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 col-span-full"
                  >
                    {editingProduct ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Sabor'}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}

        {showAddPayment && (
          <motion.div key="modal-add-payment">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPayment(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md glass-dark p-10 rounded-[3rem] border-white/5 z-[101] shadow-2xl"
            >
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic font-bold">Novo Método</h2>
                  <button onClick={() => setShowAddPayment(false)} className="p-2 glass rounded-xl">
                     <Plus className="w-5 h-5 rotate-45" />
                  </button>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nome do Método</label>
                     <input 
                      type="text" 
                      placeholder="Ex: Cartão de Crédito"
                      value={newPayment.name}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Tipo de Transação</label>
                     <div className="flex gap-2">
                        {[
                           { id: 'pix', icon: Smartphone, label: 'Pix' },
                           { id: 'card', icon: CreditCard, label: 'Cartão' },
                           { id: 'cash', icon: Banknote, label: 'Dinheiro' }
                        ].map(type => (
                           <button
                              key={type.id}
                              onClick={() => setNewPayment(prev => ({ ...prev, type: type.id as any }))}
                              className={cn(
                                 "flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all",
                                 newPayment.type === type.id 
                                    ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,242,255,0.2)] text-primary" 
                                    : "glass border-white/5 text-white/30"
                              )}
                           >
                              <type.icon className="w-5 h-5" />
                              <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Detalhes (Opcional)</label>
                     <input 
                      type="text" 
                      placeholder="Ex: CPF para Pix ou Taxas"
                      value={newPayment.details}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full glass bg-white/5 p-4 rounded-2xl border-white/5 outline-none text-sm font-bold placeholder:text-white/10"
                     />
                  </div>

                  <button 
                    onClick={handleAddPaymentMethod}
                    className="w-full bg-white text-dark py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4 flex items-center justify-center gap-3"
                  >
                    <Check className="w-5 h-5" /> Ativar Método
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {newOrderNotification && (
            <motion.div
              key="notification-new-order"
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg"
            >
              <div className="glass-dark border-2 border-primary shadow-[0_0_50px_rgba(0,242,255,0.3)] rounded-[3rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
                
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shrink-0">
                    <Bell className="w-10 h-10 text-dark animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Novo Pedido Recebido!</span>
                      <span className="text-xl font-bold font-mono">#{newOrderNotification.orderNumber || newOrderNotification.id.slice(-4).toUpperCase()}</span>
                    </div>
                    <h3 className="text-2xl font-serif italic font-bold mt-1">{newOrderNotification.customerName || 'Cliente Anônimo'}</h3>
                    <p className="text-white/50 text-xs mt-2 uppercase tracking-widest font-black">
                      {(newOrderNotification.items || []).reduce((acc, i) => acc + (i.quantity || 0), 0)} itens • R$ {(newOrderNotification.total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex gap-3 relative z-10">
                  <button 
                    onClick={() => {
                      setActiveTab('orders');
                      setNewOrderNotification(null);
                    }}
                    className="flex-1 bg-white text-dark py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all text-sm"
                  >
                    Ver na Cozinha
                  </button>
                  <button 
                    onClick={() => setNewOrderNotification(null)}
                    className="glass px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-white/30 hover:text-white transition-all text-sm"
                  >
                    Fechar
                  </button>
                </div>

                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
