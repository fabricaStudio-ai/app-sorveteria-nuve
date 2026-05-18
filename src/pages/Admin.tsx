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
  limit,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '../lib/firebase';
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
  User as UserIcon,
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
  Volume2,
  Sparkles,
  Share2,
  Zap,
  Instagram,
  MessageCircle
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
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

const COLORS = ['#00f2ff', '#7000ff', '#ff00d4', '#ff8c00', '#00ff8c'];

export default function Admin() {
  const { user, profile, store, loading: authLoading, setUserRole, userRole } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') as any;

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'finance' | 'payments' | 'admins' | 'promotions'>(
    initialTab && ['overview', 'products', 'orders', 'finance', 'payments', 'admins', 'promotions'].includes(initialTab) 
    ? initialTab 
    : 'overview'
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');

  const fetchAdmins = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      setAdmins(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'admins');
    }
  };

  const fetchPromotions = async () => {
    try {
      const snap = await getDocs(collection(db, 'promotions'));
      setPromotions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'promotions');
    }
  };

  const handleSavePromo = async () => {
    if (!promoForm.title || !promoForm.discount) return;
    try {
      if (editingPromo) {
        await updateDoc(doc(db, 'promotions', editingPromo.id), promoForm);
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...promoForm,
          createdAt: new Date().toISOString()
        });
      }
      setShowPromoModal(false);
      setEditingPromo(null);
      setPromoForm({ title: '', description: '', price: '', discount: '', image: '', expiresAt: '', isActive: true, code: '' });
      fetchPromotions();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'promotions');
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Excluir esta promoção?")) return;
    try {
      await deleteDoc(doc(db, 'promotions', id));
      fetchPromotions();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `promotions/${id}`);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminId) return;
    try {
      await setDoc(doc(db, 'admins', newAdminId), {
        addedAt: new Date().toISOString(),
        addedBy: profile?.userId || 'system'
      });
      setNewAdminId('');
      setShowAddAdmin(false);
      fetchAdmins();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `admins/${newAdminId}`);
    }
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<'Todos' | 'Pagamento' | 'Novos' | 'Preparando' | 'Prontos' | 'Enviados' | 'Finalizados' | 'Cancelados'>('Todos');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
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
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    price: '',
    discount: '',
    image: '',
    expiresAt: '',
    isActive: true,
    code: ''
  });
  const [sharingPromo, setSharingPromo] = useState<any | null>(null);
  const [shareConfig, setShareConfig] = useState<{ promo: any } | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const promoShareRef = useRef<HTMLDivElement>(null);
  const instagramPostRef = useRef<HTMLDivElement>(null);
  const instagramStoryRef = useRef<HTMLDivElement>(null);

  const handleCallLalamove = async (order: Order) => {
    try {
      if(!confirm("Deseja solicitar um entregador Lalamove para este pedido agora?")) return;
      
      const quoteRes = await fetch('/api/lalamove/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const quoteData = await quoteRes.json();
      
      if(!quoteRes.ok) throw new Error(quoteData.error || "Erro ao cotar entrega na Lalamove.");

      const orderRes = await fetch('/api/lalamove/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, quotationId: quoteData.id })
      });
      const orderData = await orderRes.json();

      if(!orderRes.ok) throw new Error(orderData.error || "Erro ao criar pedido na Lalamove.");

      // Update firebase 
      await updateDoc(doc(db, 'orders', order.id), {
         lalamoveStatus: orderData.status,
         lalamoveShareLink: orderData.shareLink,
         lalamoveDriver: orderData.driverId
      });
      
      alert("Entregador Lalamove solicitado com sucesso!");
    } catch(err: any) {
       console.error(err);
       alert(err.message || "Falha ao chamar a Lalamove");
    }
  };

  const handleSharePromo = async (promo: any, type: 'whatsapp' | 'instagram_post' | 'instagram_story' = 'whatsapp') => {
    setSharingPromo(promo);
    setIsGeneratingShare(true);
    
    // allow render
    setTimeout(async () => {
       const targetRef = type === 'instagram_post' ? instagramPostRef : 
                         type === 'instagram_story' ? instagramStoryRef : 
                         promoShareRef;

       if (targetRef.current) {
          try {
             const dataUrl = await htmlToImage.toPng(targetRef.current, {
                quality: 1,
                pixelRatio: type.startsWith('instagram') ? 2 : 1
             });
             
             const res = await fetch(dataUrl);
             const blob = await res.blob();
             const fileName = type === 'instagram_post' ? 'post_instagram.png' : 
                             type === 'instagram_story' ? 'story_instagram.png' : 
                             `promocao_${promo.id}.png`;
             const file = new File([blob], fileName, { type: 'image/png' });

             const appUrl = window.location.origin;
             const textToShare = `*${promo.title}*\n${promo.discount}\n\n${promo.description}\n\n👉 Peça agora: ${appUrl}`;

             if (type === 'whatsapp') {
               const filesToShare = [file];
               if (promo.image && promo.image.startsWith('http')) {
                 try {
                   const imgRes = await fetch(promo.image);
                   const imgBlob = await imgRes.blob();
                   const imgFile = new File([imgBlob], 'foto_produto.png', { type: imgBlob.type });
                   filesToShare.push(imgFile);
                 } catch (e) {}
               }

               if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
                  await navigator.share({
                    title: promo.title,
                    text: textToShare,
                    files: filesToShare
                  });
               } else {
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = fileName;
                  a.click();
                  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
                  window.open(waUrl, '_blank');
               }
             } else {
               const a = document.createElement('a');
               a.href = dataUrl;
               a.download = fileName;
               a.click();
               alert(`${type === 'instagram_post' ? 'Post' : 'Story'} gerado e baixado! Agora você pode postar no seu Instagram.`);
             }
          } catch(e) {
             console.error("Error sharing promo:", e);
             alert("Não foi possível gerar a imagem da promoção para compartilhar.");
          }
       }
       setIsGeneratingShare(false);
       setSharingPromo(null);
       setShareConfig(null);
    }, 500);
  };

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
  const [isUploading, setIsUploading] = useState(false);

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
      const productToEdit = products.find(p => p.id === editId);
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
    fetchAdmins();
    fetchPromotions();

    // Sound for notifications
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // Real-time Orders Listener (Preparation Queue)
    if (!store?.id) return;

    const ordersQuery = query(
      collection(db, 'stores', store.id, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const allOrdersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Filter orders: Hide abandoned carts/unpaid online orders
      // Only show approved online payments OR manual payment methods (WhatsApp, Cash, Pix on delivery)
      const ordersData = allOrdersData.filter(o => {
        // Online payments must be approved
        if (o.paymentMethod === 'online') {
          return o.paymentStatus === 'approved' || o.paymentApproved;
        }
        // Manual/Delivery methods always show so manager can handle them
        return true;
      });
      
      setOrders(ordersData);

      // Check for new orders to trigger notification
      if (ordersData.length > prevOrdersCount.current && prevOrdersCount.current !== 0) {
        const latestOrder = ordersData[0];
        // Only notify if it's a new or received order AND it's not from the admin
        if (latestOrder && (latestOrder.status === 'pending_payment' || latestOrder.status === 'received') && latestOrder.customerEmail !== 'fabricasoftwareai@gmail.com') {
          setNewOrderNotification(latestOrder);
          audioRef.current?.play().catch(e => console.log('Audio play blocked'));
        }
      }
      prevOrdersCount.current = ordersData.length;
    }, (error) => {
      console.error("Orders Listener Error:", error);
      // We don't throw here to avoid crashing the whole admin panel
    });

    return () => unsubscribe();
  }, [profile]);

  const deleteOrder = async (id: string) => {
    if (!store?.id) return;
    console.log("Attempting to delete order:", id);
    try {
      await deleteDoc(doc(db, 'stores', store.id, 'orders', id));
      console.log("Order deleted successfully:", id);
      setOrderToDelete(null); // Clear confirmation state
    } catch (e) {
      console.error("Delete order error:", e);
      handleFirestoreError(e, OperationType.DELETE, `stores/${store.id}/orders/${id}`);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!store?.id) return;
    try {
      const orderRef = doc(db, 'stores', store.id, 'orders', orderId);
      
      // Get current order data to handle points
      const ordersSnap = await getDocs(query(collection(db, 'stores', store.id, 'orders'), where('__name__', '==', orderId), limit(1)));
      const orderData = !ordersSnap.empty ? ordersSnap.docs[0].data() as Order : null;

      await updateDoc(orderRef, { status: newStatus });

      if (newStatus === 'completed' && orderData?.userId) {
        // Award/Deduct points
        const userRef = doc(db, 'profiles', orderData.userId);
        const usersSnap = await getDocs(query(collection(db, 'profiles'), where('__name__', '==', orderData.userId), limit(1)));
        
        if (!usersSnap.empty) {
          const userData = usersSnap.docs[0].data();
          const currentPoints = userData.points || 0;
          const pointsEarned = orderData.pointsEarned || 0;
          const pointsUsed = orderData.pointsUsed || 0;
          
          // Calculate new total
          const newPoints = currentPoints + pointsEarned - pointsUsed;
          
          await updateDoc(userRef, { 
            points: Math.max(0, newPoints),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `stores/${store.id}/orders/${orderId}`);
    }
  };

  const fetchProducts = async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'stores', store.id, 'products'));
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `stores/${store.id}/products`);
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
      handleFirestoreError(e, OperationType.GET, 'transactions');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'paymentMethods'));
      const methods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
      setPaymentMethods(methods);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'paymentMethods');
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
      handleFirestoreError(e, OperationType.WRITE, 'transactions');
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
    const urlStoreId = new URLSearchParams(location.search).get('store');
    const storeId = store?.id || urlStoreId;
    if (!productForm.name || !productForm.price || !storeId) {
      alert("Erro: ID da loja não encontrado.");
      return;
    }

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
        await setDoc(doc(db, 'stores', storeId, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'stores', storeId, 'products'), {
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

  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadToFirebase = async (file: File, path: string): Promise<string> => {
    if (!auth.currentUser) {
      throw new Error("Você precisa estar logado para fazer upload de imagens.");
    }

    // Try ImgBB if configured (completely free and bypasses Firebase Storage setup)
    if (profile?.imgbbApiKey) {
      try {
        console.log("Using ImgBB for upload...");
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${profile.imgbbApiKey}`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          return data.data.url;
        }
        console.warn("ImgBB upload failed, falling back to Firebase:", data.error);
      } catch (err) {
        console.warn("ImgBB error, falling back to Firebase:", err);
      }
    }

    if (file.size > 25 * 1024 * 1024) throw new Error("Imagem muito grande (máx 25MB)");
    
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    setUploadProgress(0);
    
    console.log(`Starting upload to ${path}/${fileName}...`);
    return new Promise((resolve, reject) => {
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        console.log("Upload task created.");

        const timeout = setTimeout(() => {
          uploadTask.cancel();
          const errorMsg = "O upload demorou muito (tempo esgotado). Isso geralmente acontece se o Firebase Storage não foi ativado ou se as regras de segurança estão bloqueando. Certifique-se de ter habilitado o Storage no Console do Firebase (aba 'Storage' -> 'Começar').";
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }, 60000);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${Math.round(progress)}%`);
            setUploadProgress(progress);
          }, 
          (error: any) => {
            clearTimeout(timeout);
            console.error("Firebase Storage Error:", error);
            if (error.code === 'storage/unauthorized') {
              reject(new Error("Sem permissão para fazer upload (Erro 403). Você precisa habilitar e configurar as 'Storage Rules' no Console do Firebase para permitir uploads."));
            } else if (error.code === 'storage/canceled') {
              reject(new Error("Upload cancelado ou tempo esgotado."));
            } else if (error.code === 'storage/retry-limit-exceeded') {
               reject(new Error("Erro de rede: limite de tentativas excedido. Verifique sua conexão."));
            } else if (error.code === 'storage/project-not-found' || error.code === 'storage/bucket-not-found') {
               reject(new Error("Ops! O bucket do Firebase Storage não foi encontrado. Verifique a configuração do projeto."));
            } else {
              reject(new Error(`Erro no Firebase Storage (${error.code}): ${error.message}`));
            }
          }, 
          async () => {
            clearTimeout(timeout);
            console.log("Upload complete, getting download URL...");
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log("Download URL obtained:", downloadURL);
              resolve(downloadURL);
            } catch (e: any) {
              console.error("Error getting download URL:", e);
              reject(new Error("Erro ao obter URL da imagem após o upload: " + e.message));
            }
          }
        );
      } catch (e: any) {
        console.error("Synchronous error during upload initiation:", e);
        reject(e);
      }
    });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadToFirebase(file, 'products');
      setProductForm(prev => ({ ...prev, image: downloadURL }));
    } catch (error: any) {
      console.error("Error uploading product image:", error);
      alert(error.message || "Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePromoImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadToFirebase(file, 'promotions');
      setPromoForm(prev => ({ ...prev, image: downloadURL }));
    } catch (error: any) {
      console.error("Error uploading promo image:", error);
      alert(error.message || "Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
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

  const totalIncome = (transactions || [])
    .filter(t => t && t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalExpense = (transactions || [])
    .filter(t => t && t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  const profit = totalIncome - totalExpense;

  // New Dynamic Stats for Overview
  const today = new Date().toISOString().split('T')[0];
  const ordersToday = (orders || []).filter(o => o && o.createdAt && typeof o.createdAt === 'string' && o.createdAt.startsWith(today));
  const incomeToday = (ordersToday || [])
    .filter(o => o && o.status !== 'cancelled' && o.status !== 'pending_payment')
    .reduce((acc, o) => acc + (o.total || 0), 0) +
    (transactions || [])
    .filter(t => t && t.type === 'income' && t.date && typeof t.date === 'string' && t.date.startsWith(today))
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  
  const totalSalesValue = (orders || [])
    .filter(o => o && o.status !== 'cancelled' && o.status !== 'pending_payment')
    .reduce((acc, o) => acc + (o.total || 0), 0);
  
  const dailyStats = [
    { label: 'Vendas Totais', value: `R$ ${(totalSalesValue || 0).toLocaleString('pt-BR')}`, icon: DollarSign, trend: '+--%', color: 'text-primary', delay: 0 },
    { label: 'Pedidos do Dia', value: (ordersToday?.length || 0).toString(), icon: ShoppingBag, trend: '+--%', color: 'text-secondary', delay: 0.1 },
    { label: 'Saldo Hoje', value: `R$ ${(incomeToday || 0).toLocaleString('pt-BR')}`, icon: Wallet, trend: '+--%', color: 'text-emerald-400', delay: 0.2 },
    { label: 'Total Produtos', value: (products?.length || 0).toString(), icon: Package, trend: '--', color: 'text-orange-500', delay: 0.3 },
  ];

  // Dynamic Chart Data from last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dynamicChartData = last7Days.map(date => {
    const dayName = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayOrders = (orders || []).filter(o => o && o.createdAt && typeof o.createdAt === 'string' && o.createdAt.startsWith(date));
    const daySales = dayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const dayExpenses = (transactions || [])
      .filter(t => t && t.type === 'expense' && t.date && typeof t.date === 'string' && t.date.startsWith(date))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    
    return {
      name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      sales: daySales,
      orders: dayOrders.length,
      expense: dayExpenses
    };
  });

  const financeCategories = (transactions || []).reduce((acc: any, t) => {
    if (t && t.type === 'expense' && t.category) {
      acc[t.category] = (acc[t.category] || 0) + (t.amount || 0);
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
      <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Verificando acesso na nuvem...</p>
      </div>
    );
  }
  
  if (userRole !== 'admin') {
    const isBootstrapEmail = user?.email?.toLowerCase().trim() === 'fabricasoftwareai@gmail.com' || user?.email?.toLowerCase().trim() === 'animesgospelas1@gmail.com';
    
    return (
      <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-serif italic font-bold">Acesso Negado</h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto text-balance">
            Sua conta (<span className="text-white/60 font-mono text-[10px]">{user?.email}</span>) não tem permissões de gestor na Nuvê.
          </p>
          {isBootstrapEmail && (
            <p className="text-primary/60 text-[9px] uppercase font-black tracking-widest mt-4">
              Você é um administrador. Clique abaixo para sincronizar seu acesso.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {isBootstrapEmail ? (
            <button 
              onClick={() => {
                setUserRole('admin');
                setTimeout(() => window.location.reload(), 500);
              }} 
              className="w-full bg-primary text-dark py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Sincronizar Agora
            </button>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={() => setUserRole('customer')} 
                className="w-full bg-secondary text-dark py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Entrar como Cliente
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="w-full glass py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white/40"
              >
                Voltar para o Início
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              import('../lib/firebase').then(m => m.logout());
              navigate('/');
            }} 
            className="w-full bg-red-500/10 text-red-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-foreground font-sans selection:bg-primary/30">
      <div className="flex flex-col min-h-screen">
        
        {/* Main Content Area */}
        <main className="flex-1 w-full">
           {/* Header */}
           <header className="flex items-center justify-between p-6 glass-dark border-b border-white/5 sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="p-2 glass rounded-xl">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
                <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border border-white/5 overflow-hidden p-1.5">
                  {profile?.appLogo ? (
                    <img src={profile.appLogo} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 rounded-lg flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-serif italic font-bold">
                  {profile?.appName || 'App'} Admin
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchProducts} className="p-2 glass rounded-xl active:scale-95 transition-transform">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
           </header>

           {/* Navigation Tabs */}
           <div className="flex gap-2 px-6 py-4 overflow-x-auto scrollbar-none border-b border-white/5 bg-dark/80 sticky top-[77px] z-40 backdrop-blur-xl">
              {[
                { id: 'overview', label: 'Dashboard' },
                { id: 'products', label: 'Catálogo' },
                { id: 'orders', label: 'Pedidos' },
                { id: 'promotions', label: 'Ofertas' },
                { id: 'finance', label: 'Financeiro' },
                { id: 'payments', label: 'Pagos' },
                { id: 'admins', label: 'Equipe' },
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

           <div className="p-6">
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
                       {dailyStats.map((stat, i) => (
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
                                  <span className="opacity-30 text-white font-normal">tempo real</span>
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
                                <AreaChart data={dynamicChartData}>
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
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Catálogo {profile?.appName || ''}</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Controle total sobre seus itens e sabores artesanais.</p>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                          <button 
                            onClick={seedData}
                            className="glass px-6 py-4 rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 border-white/5 transition-all active:scale-95 w-full sm:w-auto"
                          >
                             <RefreshCw className="w-4 h-4 text-primary" /> Restaurar Padrões
                          </button>
                          <button 
                            onClick={() => openProductModal()}
                            className="bg-white text-dark px-6 py-4 rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all w-full sm:w-auto"
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
                                  if(confirm(`Deseja apagar este sabor de ${profile?.appName || 'seu catálogo'}?`)) {
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
                          <p className="text-white/40 text-sm mt-3 font-medium">Pedidos com pagamento aprovado.</p>
                       </div>
                       <div className="flex gap-4 p-1 glass rounded-2xl border-white/5 overflow-x-auto scrollbar-none">
                          {['Todos', 'Pagamento', 'Novos', 'Preparando', 'Prontos', 'Enviados', 'Finalizados', 'Cancelados'].map((filter) => (
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
                         if (orderFilter === 'Pagamento') return o.status === 'pending_payment';
                         if (orderFilter === 'Novos') return o.status === 'received';
                         if (orderFilter === 'Preparando') return o.status === 'preparing';
                         if (orderFilter === 'Prontos') return o.status === 'ready_for_pickup';
                         if (orderFilter === 'Enviados') return o.status === 'shipped';
                         if (orderFilter === 'Finalizados') return o.status === 'completed';
                         if (orderFilter === 'Cancelados') return o.status === 'cancelled';
                         return o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'pending_payment';
                       }).map((order) => (
                         <motion.div 
                           key={order.id}
                           layout
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className={cn(
                             "glass rounded-[3rem] p-8 border-white/5 relative overflow-hidden transition-all duration-500",
                             order.status === 'ready_for_pickup' || order.status === 'shipped' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5"
                           )}
                         >
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex gap-3">
                                  <div className="px-5 py-2 glass-dark rounded-2xl border-white/5">
                                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mesa/Pedido</span>
                                     <p className="text-xl font-bold text-primary font-mono">#{order.orderNumber || order.id.slice(-4).toUpperCase()}</p>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (orderToDelete === order.id) {
                                        deleteOrder(order.id);
                                      } else {
                                        setOrderToDelete(order.id);
                                        setTimeout(() => {
                                          setOrderToDelete(current => current === order.id ? null : current);
                                        }, 4000);
                                      }
                                    }}
                                    className="p-3 glass rounded-2xl text-white/50 hover:text-red-500 hover:bg-red-500/20 border-white/10 bg-white/5 transition-all active:scale-95 flex items-center justify-center self-center relative z-30 pointer-events-auto min-w-[50px] min-h-[50px]"
                                    title="Excluir Pedido"
                                  >
                                    {orderToDelete === order.id ? (
                                      <span className="text-[8px] font-bold text-red-500">CONFIRMAR?</span>
                                    ) : (
                                      <Trash2 className="w-5 h-5" />
                                    )}
                                  </button>
                               </div>
                               <div className="text-right">
                                  <div className="flex items-center gap-2 justify-end mb-1">
                                     <Clock className="w-3 h-3 text-white/30" />
                                     <span className="text-[10px] font-medium text-white/30">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    order.status === 'pending_payment' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                    order.status === 'received' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                    order.status === 'preparing' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
                                    order.status === 'shipped' || order.status === 'ready_for_pickup' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    "bg-white/5 text-white/20 border-white/10"
                                  )}>
                                     {order.status === 'pending_payment' ? 'Pagamento' : 
                                      order.status === 'received' ? 'Novo' : 
                                      order.status === 'preparing' ? 'Preparando' : 
                                      order.status === 'shipped' ? 'Enviado' :
                                      order.status === 'ready_for_pickup' ? 'Pronto' :
                                      order.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                                  </span>
                               </div>
                            </div>

                            <div className="mb-8 p-6 glass-dark rounded-[2rem] border-white/5">
                               <h3 className="text-lg font-serif italic font-bold mb-4 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-white/30" /> {order.customerName || 'Cliente Anônimo'}
                               </h3>
                               <div className="space-y-4">
                                  {(order.items || []).map((item, i) => (
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
                               {order.status === 'pending_payment' && (
                                 <button 
                                   onClick={() => {
                                      if(confirm("Confirmar que o pagamento foi recebido?")) {
                                        updateDoc(doc(db, 'stores', store.id, 'orders', order.id), { 
                                          status: 'received',
                                          paymentApproved: true, 
                                          paymentStatus: 'approved' 
                                        });
                                      }
                                   }}
                                   className="col-span-2 bg-emerald-500 text-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                 >
                                    <Check className="w-4 h-4" /> Aprovar Pagamento
                                 </button>
                               )}

                               {order.status === 'received' && (
                                 <>
                                   <div className="col-span-2 bg-[#25D366]/10 text-[#25D366] py-3 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-1 border border-[#25D366]/20">
                                      <CheckCircle2 className="w-4 h-4" /> Pagamento Aprovado
                                   </div>
                                   <button 
                                     onClick={() => updateOrderStatus(order.id, 'preparing')}
                                     className="col-span-2 bg-primary text-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                   >
                                      <ChefHat className="w-4 h-4" /> Começar Preparo
                                   </button>
                                 </>
                               )}
                               {order.status === 'preparing' && (
                                 <button 
                                   onClick={() => updateOrderStatus(order.id, order.deliveryMethod === 'delivery' ? 'shipped' : 'ready_for_pickup')}
                                   className="col-span-2 bg-secondary text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                 >
                                    <Bell className="w-4 h-4" /> {order.deliveryMethod === 'delivery' ? 'Marcar como Enviado' : 'Marcar como Pronto'}
                                 </button>
                               )}
                               {(order.status === 'shipped' || order.status === 'ready_for_pickup') && (
                                 <>
                                   {order.deliveryMethod === 'delivery' && !order.lalamoveStatus && profile?.lalamoveConnected && (
                                     <button 
                                       onClick={() => handleCallLalamove(order)}
                                       className="col-span-2 bg-[#F37021] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all mb-2"
                                     >
                                        <Zap className="w-4 h-4" /> Solicitar Lalamove
                                     </button>
                                   )}
                                   {order.lalamoveStatus && (
                                     <div className="col-span-2 bg-[#F37021]/10 text-[#F37021] py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-2 border border-[#F37021]/20">
                                        <Zap className="w-4 h-4" /> Lalamove Solicitada
                                     </div>
                                   )}
                                   <button 
                                     onClick={() => updateOrderStatus(order.id, 'completed')}
                                     className="col-span-2 bg-emerald-500 text-dark py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                   >
                                      <CheckCircle2 className="w-4 h-4" /> Finalizar Pedido
                                   </button>
                                 </>
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

                {activeTab === 'promotions' && (
                  <motion.div 
                    key="promotions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Ofertas & Cupons</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Cadastre descontos e ofertas sazonais aqui.</p>
                       </div>
                       <button 
                         onClick={() => {
                           setEditingPromo(null);
                           setPromoForm({ title: '', description: '', price: '', discount: '', image: '', expiresAt: '', isActive: true, code: '' });
                           setShowPromoModal(true);
                         }}
                         className="bg-secondary text-white px-8 py-4 rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-xl active:scale-95 transition-all w-full sm:w-auto"
                       >
                          <PlusCircle className="w-5 h-5" /> Nova Promoção
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                       {promotions.map((promo) => (
                         <div key={promo.id} className="glass rounded-[3rem] p-8 border-white/5 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                               <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary overflow-hidden border border-white/5 relative shadow-xl">
                                  {promo.image ? (
                                    <img src={promo.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Sparkles className="w-8 h-8 opacity-20" />
                                  )}
                               </div>
                               <div className="flex gap-2">
                                  <button 
                                     onClick={() => setShareConfig({ promo })}
                                     disabled={isGeneratingShare}
                                     className="px-4 py-3 bg-[#25D366]/10 text-[#25D366] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#25D366]/20 transition-all active:scale-95 border border-[#25D366]/20"
                                     title="Compartilhar no WhatsApp"
                                  >
                                     <Share2 className="w-4 h-4" /> {isGeneratingShare && sharingPromo?.id === promo.id ? 'Gerando...' : 'Compartilhar'}
                                  </button>
                                  <button onClick={() => { 
                                    setEditingPromo(promo); 
                                    setPromoForm({
                                      title: promo.title || '',
                                      description: promo.description || '',
                                      price: promo.price || '',
                                      discount: promo.discount || '',
                                      image: promo.image || '',
                                      expiresAt: promo.expiresAt || '',
                                      isActive: promo.isActive ?? true,
                                      code: promo.code || ''
                                    }); 
                                    setShowPromoModal(true); 
                                  }} className="p-3 glass rounded-xl text-white/20 hover:text-white transition-colors">
                                     <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deletePromo(promo.id)} className="p-3 glass rounded-xl text-white/20 hover:text-red-400 transition-colors">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            </div>
                            <h3 className="text-2xl font-serif italic font-bold mb-2">{promo.title}</h3>
                            <div className="flex items-center gap-3 mb-4">
                              <p className="text-3xl font-black text-secondary">{promo.discount}</p>
                              {promo.price && (
                                <>
                                  <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                                  <p className="text-2xl font-bold text-white/60">R$ {parseFloat(promo.price).toFixed(2).replace('.', ',')}</p>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed mb-6">{promo.description}</p>
                            
                            <div className="flex items-center justify-between p-4 glass-dark rounded-2xl border-white/5 bg-white/5">
                               <div>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Código</p>
                                  <p className="text-sm font-mono font-bold text-primary">{promo.code || 'S/ CUPOM'}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Status</p>
                                  <p className={cn("text-[10px] font-bold", promo.isActive ? "text-emerald-400" : "text-red-400")}>
                                     {promo.isActive ? 'ATIVA' : 'EXPIRADA'}
                                  </p>
                               </div>
                            </div>
                         </div>
                       ))}

                       {promotions.length === 0 && (
                         <div className="col-span-full py-32 glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center gap-6 text-center opacity-30">
                            <Sparkles className="w-16 h-16" strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma promoção ativa</p>
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
                          <p className="text-white/40 text-sm mt-3 font-medium">Gestão de fluxo de caixa e rentabilidade do {profile?.appName || 'seu app'}.</p>
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
                          <p className="text-white/40 text-sm mt-3 font-medium">Configure como seus clientes podem pagar no {profile?.appName || 'seu app'}.</p>
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

                {activeTab === 'admins' && (
                  <motion.div 
                    key="admins"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div>
                          <h1 className="text-4xl md:text-5xl font-serif italic font-bold tracking-tighter">Gestores</h1>
                          <p className="text-white/40 text-sm mt-3 font-medium">Gerencie quem tem acesso total ao painel administrativo.</p>
                       </div>
                       <button 
                         onClick={() => {
                           const uid = prompt("Digite o UID do novo gestor (disponível no perfil do usuário):");
                           if (uid) {
                            setNewAdminId(uid);
                            handleAddAdmin();
                           }
                         }}
                         className="bg-white text-dark px-8 py-4 rounded-[2rem] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] shadow-xl active:scale-95 transition-all"
                       >
                          <PlusCircle className="w-5 h-5" /> Novo Gestor
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {admins.map((admin) => (
                         <div key={admin.id} className="glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
                            <div className="relative z-10">
                               <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary mb-4">
                                  <UserIcon className="w-6 h-6" />
                               </div>
                               <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ID do Gestor</p>
                               <p className="text-sm font-mono text-white/60 mb-4">{admin.id}</p>
                               <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase font-black tracking-widest">
                                  <Calendar className="w-3 h-3" /> Adicionado em {admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : 'N/A'}
                               </div>
                               
                               {admin.id !== profile?.userId && (
                                 <button 
                                   onClick={async () => {
                                     if(confirm("Remover acesso de gestor?")) {
                                       await deleteDoc(doc(db, 'admins', admin.id));
                                       fetchAdmins();
                                     }
                                   }}
                                   className="mt-6 w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                                 >
                                   Remover Acesso
                                 </button>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

           </div>
        </main>
      </div>

      <AnimatePresence>
        {showPromoModal && (
          <motion.div key="modal-promo">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPromoModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md glass-dark p-6 md:p-10 rounded-[3rem] border-white/5 z-[101] shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-none">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic font-bold">{editingPromo ? 'Editar' : 'Nova'} Promoção</h2>
                  <button onClick={() => setShowPromoModal(false)} className="p-2 glass rounded-xl">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Título</label>
                    <input type="text" value={promoForm.title} onChange={e => setPromoForm({...promoForm, title: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-sm" placeholder="Ex: Verão Nuvê" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Desconto / Oferta</label>
                    <input type="text" value={promoForm.discount} onChange={e => setPromoForm({...promoForm, discount: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-sm" placeholder="Ex: 20% OFF ou Compre 1 Leve 2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Preço de Venda (R$)</label>
                    <input type="number" value={promoForm.price} onChange={e => setPromoForm({...promoForm, price: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-sm" placeholder="0,00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Cupom (Opcional)</label>
                    <input type="text" value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-sm font-mono" placeholder="VERAO20" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Banner da Promoção (Opcional)</label>
                     <div className="flex gap-4 items-center p-4 glass-dark rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-16 h-16 rounded-xl overflow-hidden glass border-white/10 flex-shrink-0 bg-white/5 relative">
                           {promoForm.image ? (
                              <img src={promoForm.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10 italic text-[10px]"><Plus className="w-4 h-4 opacity-20" /></div>
                           )}
                           {isUploading && (
                             <div className="absolute inset-0 bg-dark/60 flex items-center justify-center">
                               <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                             </div>
                           )}
                        </div>
                        <div className="flex-1 space-y-3">
                           <div className="relative h-12">
                              <label className="absolute inset-0 w-full glass border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                                 <input 
                                   type="file" 
                                   accept="image/*"
                                   onChange={handlePromoImageUpload}
                                   disabled={isUploading}
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                 />
                                 <span className="relative z-0">
                                   {isUploading ? `Enviando (${Math.round(uploadProgress)}%)...` : 'Carregar Banner'}
                                 </span>
                              </label>
                           </div>
                           <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={promoForm.image}
                                onChange={e => setPromoForm({...promoForm, image: e.target.value})}
                                className="flex-1 glass bg-white/5 px-4 py-2 rounded-xl outline-none text-[10px] font-medium placeholder:text-white/10" 
                                placeholder="Ou cole a URL do banner aqui" 
                              />
                              {isUploading && (
                                <button 
                                  onClick={() => setIsUploading(false)}
                                  className="p-2 glass rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Cancelar upload travado"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Descrição</label>
                    <textarea value={promoForm.description} onChange={e => setPromoForm({...promoForm, description: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-sm h-24" placeholder="Detalhes da oferta..." />
                  </div>
                  <button onClick={handleSavePromo} className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl mt-4">Salvar Promoção</button>
               </div>
            </motion.div>
          </motion.div>
        )}

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
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif italic font-bold">Nova Transação</h2>
                  <button onClick={() => setShowAddTransaction(false)} className="p-2 glass rounded-xl">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
               </div>
               
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
                     <div className="flex flex-col sm:flex-row gap-6 items-center">
                        <div className="w-32 h-32 rounded-3xl overflow-hidden glass border-white/10 flex-shrink-0 bg-white/5 relative group">
                           {productForm.image ? (
                              <>
                                <img src={productForm.image} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                                <div className="absolute inset-x-0 bottom-0 bg-dark/80 backdrop-blur-sm py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setProductForm(prev => ({ ...prev, image: '' }))}
                                    className="text-[8px] font-black uppercase tracking-widest text-red-400"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                           ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white/10 italic gap-2">
                                <Plus className="w-6 h-6" />
                                <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Sem Foto</span>
                              </div>
                           )}
                           
                           {isUploading && (
                             <div className="absolute inset-0 bg-dark/60 backdrop-blur-[2px] flex items-center justify-center">
                               <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                             </div>
                           )}
                        </div>
                         <div className="flex-1 w-full space-y-4">
                            <div className="relative h-14 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center group hover:border-primary/50 transition-all cursor-pointer">
                               <input 
                                 type="file" 
                                 accept="image/*"
                                 onChange={handleImageUpload}
                                 disabled={isUploading}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                               />
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-primary transition-colors relative z-0 pointer-events-none">
                                  {isUploading ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span>Enviando ({Math.round(uploadProgress)}%)</span>
                                      <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <><PlusCircle className="w-4 h-4" /> Selecionar do Celular</>
                                  )}
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="flex-1">
                                  <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest ml-2 mb-1">Ou cole uma URL abaixo:</p>
                                  <input 
                                    type="text" 
                                    placeholder="Ex: https://..."
                                    value={productForm.image}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                                    className="w-full glass bg-white/5 px-5 py-4 rounded-2xl border-white/5 outline-none text-xs font-bold placeholder:text-white/10 focus:border-primary/30 transition-all"
                                  />
                               </div>
                               {isUploading && (
                                 <button 
                                   onClick={() => setIsUploading(false)}
                                   className="p-4 glass rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors self-end h-[52px]"
                                   title="Cancelar upload travado"
                                 >
                                    <RefreshCw className="w-5 h-5 flex-shrink-0" />
                                 </button>
                               )}
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

        {/* Share Options Modal */}
        {shareConfig && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-dark/95 backdrop-blur-3xl"
                onClick={() => setShareConfig(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm glass rounded-[3rem] p-8 border-white/5 overflow-hidden"
              >
                 <h3 className="text-2xl font-serif italic font-bold mb-2">Compartilhar Oferta</h3>
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Escolha o formato ideal</p>

                 <div className="space-y-4">
                    <button 
                       onClick={() => handleSharePromo(shareConfig.promo, 'whatsapp')}
                       disabled={isGeneratingShare}
                       className="w-full p-6 glass rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center">
                             <MessageCircle className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">WhatsApp Status</p>
                             <p className="text-[10px] text-white/30 uppercase font-black">Texto + Imagem</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </button>

                    <button 
                       onClick={() => handleSharePromo(shareConfig.promo, 'instagram_post')}
                       disabled={isGeneratingShare}
                       className="w-full p-6 glass rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#E1306C]/10 text-[#E1306C] rounded-xl flex items-center justify-center">
                             <Instagram className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">Instagram Post</p>
                             <p className="text-[10px] text-white/30 uppercase font-black">Medida 1:1 (1080x1080)</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </button>

                    <button 
                       onClick={() => handleSharePromo(shareConfig.promo, 'instagram_story')}
                       disabled={isGeneratingShare}
                       className="w-full p-6 glass rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-xl flex items-center justify-center">
                             <Instagram className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">Instagram Story</p>
                             <p className="text-[10px] text-white/30 uppercase font-black">Medida 9:16 (1080x1920)</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                    </button>
                 </div>

                 <button 
                   onClick={() => setShareConfig(null)}
                   className="w-full mt-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                 >
                    Cancelar
                 </button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Hidden Status generator */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        {/* WhatsApp Template */}
        <div 
          ref={promoShareRef}
          className="w-[1080px] h-[1920px] bg-[#050505] flex flex-col relative overflow-hidden"
          style={{ fontFamily: 'sans-serif' }}
        >
          {sharingPromo && (
            <>
              {/* background */}
              {sharingPromo.image ? (
                <>
                  <img src={sharingPromo.image} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/60" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/40 to-[#ff00d4]/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-20 text-center">
                <div className="bg-white/10 backdrop-blur-3xl p-16 rounded-[4rem] border border-white/20 w-full max-w-[800px] shadow-2xl">
                  <span className="text-[#ff00d4] text-5xl font-black uppercase tracking-[0.3em] mb-12 inline-block px-10 py-6 bg-white/5 rounded-full border border-white/10">
                    Oferta Especial
                  </span>
                  <h2 className="text-[100px] font-serif italic font-bold text-white leading-tight mb-8">{sharingPromo.title}</h2>
                  <p className="text-[140px] font-black text-[#00f2ff] drop-shadow-[0_0_60px_rgba(0,242,255,0.8)] leading-none mb-12">{sharingPromo.discount}</p>
                  <p className="text-4xl text-white/80 leading-relaxed max-w-[700px] mx-auto mb-16">{sharingPromo.description}</p>
                  
                  {sharingPromo.code && (
                    <div className="bg-white/10 rounded-3xl p-10 inline-block border-[4px] border-dashed border-white/30 mb-8 backdrop-blur-md">
                       <p className="text-3xl text-white/60 font-medium uppercase tracking-widest mb-4">Código do Cupom</p>
                       <p className="text-7xl font-mono font-black text-white tracking-widest">{sharingPromo.code}</p>
                    </div>
                  )}
                  
                  <div className="mt-10 pt-10 border-t border-white/20 flex flex-col items-center gap-6">
                     {sharingPromo.image && (
                       <div className="w-[300px] h-[300px] rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl">
                         <img src={sharingPromo.image} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                       </div>
                     )}
                     <p className="text-4xl font-bold text-white/40 tracking-[0.2em] uppercase mt-4">Peça pelo App</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-20 left-0 right-0 flex justify-center opacity-40">
                 <p className="text-2xl font-black text-white tracking-[0.5em] uppercase">{profile?.appName || 'Catálogo'}</p>
              </div>
            </>
          )}
        </div>

        {/* Instagram Post Template (1080x1080) */}
        <div ref={instagramPostRef} className="w-[1080px] h-[1080px] bg-dark flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/30 blur-[150px] rounded-full" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-secondary/20 blur-[150px] rounded-full" />
           
           <div className="relative z-10 w-full h-full flex flex-col items-center justify-between border-[20px] border-white/5 rounded-[5rem] p-24">
              <div className="space-y-4">
                 <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10">
                    <ShoppingBag className="w-16 h-16 text-primary" />
                 </div>
                 <h2 className="text-7xl font-serif italic font-bold tracking-tight text-white">{sharingPromo?.title}</h2>
                 <div className="h-2 w-32 bg-primary mx-auto rounded-full mt-8" />
              </div>

              <div className="space-y-8">
                 <p className="text-8xl font-black text-primary tracking-tighter drop-shadow-[0_0_30px_rgba(0,242,255,0.5)]">
                    {sharingPromo?.discount}
                 </p>
                 <p className="text-3xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                    {sharingPromo?.description}
                 </p>
              </div>

              <div className="mt-12 w-full">
                 <div className="bg-white/5 border border-white/10 py-8 rounded-[2rem] mb-10">
                    <p className="text-[14px] font-black uppercase tracking-[0.5em] text-white/30">Baixe o app no Link da Bio</p>
                 </div>
                 <p className="text-3xl font-serif italic text-white font-bold opacity-40">@{profile?.appName?.toLowerCase().replace(/\s/g, '') || 'nuve'}</p>
              </div>
           </div>
        </div>

        {/* Instagram Story Template (1080x1920) */}
        <div ref={instagramStoryRef} className="w-[1080px] h-[1920px] bg-dark flex flex-col items-center justify-between p-24 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 via-dark to-dark" />
           <div className="absolute top-[-5%] left-[-20%] w-full h-[40%] bg-primary/20 blur-[200px] rounded-full" />
           
           <div className="relative z-10 text-center w-full mt-24">
              <div className="w-40 h-40 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto mb-12 border border-white/10">
                 <ShoppingBag className="w-20 h-20 text-primary" />
              </div>
              <h3 className="text-4xl font-black uppercase tracking-[0.4em] text-primary mb-4">OFERTA IMPERDÍVEL</h3>
              <div className="h-1 bg-white/10 w-64 mx-auto rounded-full" />
           </div>

           <div className="relative z-10 w-full">
              <div className="p-20 glass rounded-[6rem] border-white/5 backdrop-blur-3xl shadow-2xl text-center">
                 <h2 className="text-9xl font-serif italic font-bold leading-[0.9] mb-12 text-white">{sharingPromo?.title}</h2>
                 <p className="text-9xl font-black text-secondary tracking-tighter drop-shadow-[0_0_50px_rgba(112,0,255,0.4)]">
                    {sharingPromo?.discount}
                 </p>
                 <div className="h-1 bg-white/5 w-full my-16 rounded-full" />
                 <p className="text-4xl text-white/50 leading-relaxed italic">
                    "{sharingPromo?.description}"
                 </p>
              </div>
           </div>

           <div className="relative z-10 w-full mb-24 text-center space-y-12">
              <div className="bg-primary p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,242,255,0.3)]">
                 <p className="text-5xl font-black uppercase tracking-[0.2em] text-dark">LINK NA BIO</p>
                 <p className="text-2xl font-bold text-dark/60 mt-4 uppercase tracking-widest">E PEÇA JÁ O SEU</p>
              </div>
              <div className="space-y-4">
                 <p className="text-3xl text-white/20 font-black uppercase tracking-[0.6em]">NUVE SORVETERIA</p>
                 <p className="text-xl text-white/10 font-mono">@{profile?.appName?.toLowerCase().replace(/\s/g, '') || 'nuve'}</p>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}
