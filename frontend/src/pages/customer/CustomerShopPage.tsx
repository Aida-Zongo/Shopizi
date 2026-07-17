import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import SandboxPaymentModal from '../../components/SandboxPaymentModal';
import { getCategoryLabel, getCategoryGradient, getShopBannerStyle } from '../../lib/categories';
import { useAuthStore } from '../../store/authStore';
import StarRating from '../../components/StarRating';

interface ShopData {
  shop: {
    id: string; name: string; subdomain: string; description: string | null;
    logo_url: string | null; banner_url: string | null; city_name: string | null;
    whatsapp_number: string; phone_number: string | null; address: string | null;
    allows_delivery: boolean; delivery_fee_xof: number | null;
    primary_color: string | null; secondary_color: string | null;
    category?: string;
  };
  products: Array<{
    id: string; name: string; price_xof: number; sale_price_xof: number | null;
    description: string | null; image_url: string | null; stock_status: string;
    category_id: string | null;
  }>;
  categories: Array<{ id: string; name: string; slug: string }>;
}

interface DigitalProduct {
  id: string;
  name: string;
  price_xof: number;
  file_type: string;
  cover_image_url: string | null;
}

const DIGITAL_TYPE_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  video: 'play_circle',
  audio: 'music_note',
  zip: 'folder_zip',
  image: 'image',
  word: 'description',
};

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  order_id: string | null;
  reviewer_name: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  type: 'promo' | 'price' | 'arrival';
  title: string;
  message: string;
  created_at: string;
}

const ANNOUNCEMENT_ICONS: Record<Announcement['type'], string> = {
  promo: 'sell',
  price: 'payments',
  arrival: 'inventory_2',
};

export default function CustomerShopPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [isContacting, setIsContacting] = useState(false);
  const [data, setData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQ, setSearchQ] = useState('');

  // Checkout State
  const [checkoutProduct, setCheckoutProduct] = useState<ShopData['products'][0] | null>(null);
  const [digitalProducts, setDigitalProducts] = useState<DigitalProduct[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'geo' | 'manual'>('geo');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCityId, setDeliveryCityId] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [clientLat, setClientLat] = useState<number | null>(null);
  const [clientLng, setClientLng] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isFeeEstimated, setIsFeeEstimated] = useState(false);
  const [gpsInterCity, setGpsInterCity] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ transactionId: string; amount: number; description: string } | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ avg_rating: number | null; total_reviews: number }>({ avg_rating: null, total_reviews: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [myOrderIdForShop, setMyOrderIdForShop] = useState<string | null>(null);

  // Fil de discussion entre clients sous un avis
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [repliesByReview, setRepliesByReview] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Annonces du marchand (bandeau)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (subdomain) {
      setIsLoading(true);
      api.get(`/shops/${subdomain}/public`)
        .then(res => { if (res.data.success) setData(res.data.data); })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [subdomain]);

  const fetchReviews = async (shopId: string) => {
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.get('/reviews', { params: { shop_id: shopId } }),
        api.get(`/reviews/shop/${shopId}/stats`),
      ]);
      if (reviewsRes.data.success) setReviews(reviewsRes.data.data || []);
      if (statsRes.data.success) setReviewStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleReplies = async (reviewId: string) => {
    setReplyText('');
    if (openReplies === reviewId) { setOpenReplies(null); return; }
    setOpenReplies(reviewId);
    if (!repliesByReview[reviewId]) {
      try {
        const res = await api.get(`/reviews/${reviewId}/replies`);
        if (res.data.success) setRepliesByReview(prev => ({ ...prev, [reviewId]: res.data.data || [] }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    const content = replyText.trim();
    if (!content) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.post(`/reviews/${reviewId}/replies`, { content });
      if (res.data.success) {
        const added: Reply = { ...res.data.data, author_name: user?.full_name || null };
        setRepliesByReview(prev => ({ ...prev, [reviewId]: [...(prev[reviewId] || []), added] }));
        setReplyText('');
      }
    } catch (err) {
      alert("Impossible d'envoyer votre message.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  useEffect(() => {
    if (data?.shop.id) fetchReviews(data.shop.id);
  }, [data?.shop.id]);

  useEffect(() => {
    if (!data?.shop.id) return;
    api.get(`/digital/shop/${data.shop.id}`)
      .then(res => { if (res.data.success) setDigitalProducts(res.data.data || []); })
      .catch(() => {});
  }, [data?.shop.id]);

  useEffect(() => {
    if (!data?.shop.id) return;
    api.get(`/announcements/shop/${data.shop.id}`)
      .then(res => { if (res.data.success) setAnnouncements(res.data.data || []); })
      .catch(() => {});
  }, [data?.shop.id]);

  useEffect(() => {
    if (showCheckout && cities.length === 0) {
      api.get('/cities').then(res => setCities(res.data.data || [])).catch(() => {});
    }
  }, [showCheckout, cities.length]);

  useEffect(() => {
    if (data?.shop.id && isAuthenticated && user?.role === 'customer') {
      api.get('/customer/orders').then(res => {
        if (res.data.success) {
          const own = (res.data.data || []).find((o: any) => o.shop_id === data.shop.id && o.status === 'delivered');
          setMyOrderIdForShop(own?.id || null);
        }
      }).catch(() => {});
    }
  }, [data?.shop.id, isAuthenticated, user?.role]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || reviewRating < 1) return;
    setIsSubmittingReview(true);
    try {
      const res = await api.post('/reviews', {
        shop_id: data.shop.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        order_id: myOrderIdForShop,
      });
      if (res.data.success) {
        setShowReviewForm(false);
        setReviewRating(0);
        setReviewComment('');
        fetchReviews(data.shop.id);
      }
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer votre avis.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Listen for real-time delivery updates on the phone-based customer room
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (payload: { order_id: string; status: string; message: string }) => {
      setToast(payload.message);
      setTimeout(() => setToast(null), 6000);
    };
    socket.on('order:update', handleUpdate);
    return () => { socket.off('order:update', handleUpdate); };
  }, []);

  const filteredProducts = data?.products.filter(p => {
    const matchCat = !activeCategory || p.category_id === activeCategory;
    const matchSearch = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase());
    return matchCat && matchSearch;
  }) || [];

  const handleWhatsApp = (product?: ShopData['products'][0]) => {
    if (!data?.shop.whatsapp_number) return;
    const msg = product
      ? `Bonjour, je suis intéressé(e) par "${product.name}" à ${Number(product.price_xof).toLocaleString()} FCFA. Est-il disponible ?`
      : `Bonjour, j'ai des questions sur votre boutique "${data.shop.name}".`;
    window.open(`https://wa.me/${data.shop.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleContactShop = async () => {
    if (!data) return;
    setIsContacting(true);
    try {
      const res = await api.post('/chat/rooms', { type: 'customer_merchant', shop_id: data.shop.id });
      if (res.data.success) {
        navigate(`/messages?room=${res.data.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Impossible de démarrer la conversation.");
    } finally {
      setIsContacting(false);
    }
  };

  const handleOrderClick = (product: ShopData['products'][0]) => {
    setCheckoutProduct(product);
    setOrderSuccess(false);
    setShowCheckout(true);
    setDeliveryFee(null);
    setDistanceKm(null);
    setCheckoutError(null);
    setIsFeeEstimated(false);
    setGpsInterCity(false);
    setIsSubmittingOrder(false);
    setIsLocating(false);
  };

  const DEFAULT_DELIVERY_FEE = 1000;

  const handleGeoUnavailable = () => {
    setCheckoutError('Géolocalisation non disponible. Entrez votre adresse.');
    setDeliveryFee(DEFAULT_DELIVERY_FEE);
    setIsFeeEstimated(true);
    setDeliveryMode('manual');
    setIsLocating(false);
  };

  const handleLocate = () => {
    setCheckoutError(null);
    if (!navigator.geolocation) {
      handleGeoUnavailable();
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setClientLat(pos.coords.latitude);
        setClientLng(pos.coords.longitude);
        setDeliveryAddress("Position GPS");

        try {
          const res = await api.get('/delivery/calculate-fee', {
            params: {
              shop_id: data?.shop.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }
          });
          if (res.data.success) {
            const fee = res.data.data;
            if (fee.same_city === false) {
              // Client dans une autre ville que la boutique : pas de livraison Shopizi
              setGpsInterCity(true);
              setDeliveryFee(null);
              setDistanceKm(null);
            } else {
              setGpsInterCity(false);
              setDeliveryFee(Math.min(fee.fee, 2000));
              setDistanceKm(fee.distance);
              setIsFeeEstimated(!!fee.estimated);
            }
          }
        } catch (err) {
          console.error(err);
          // Calcul indisponible (réseau...) : frais par défaut
          setDeliveryFee(DEFAULT_DELIVERY_FEE);
          setDistanceKm(null);
          setIsFeeEstimated(true);
        } finally {
          setIsLocating(false);
        }
      },
      handleGeoUnavailable,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct || !data) return;
    setIsSubmittingOrder(true);
    try {
      const payload = {
        shop_id: data.shop.id,
        product_id: checkoutProduct.id,
        product_name: checkoutProduct.name,
        price_xof: checkoutProduct.sale_price_xof || checkoutProduct.price_xof,
        quantity: 1,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        delivery_city_id: deliveryCityId || null,
        client_latitude: clientLat,
        client_longitude: clientLng,
      };
      // No Authorization header present → backend treats this as a public customer order
      const res = await api.post('/orders', payload);
      if (res.data.success) {
        const order = res.data.data;
        const initRes = await api.post('/payments/initiate', {
          type: 'order',
          amount: order.total_amount_xof,
          shop_id: data.shop.id,
          metadata: {
            order_id: order.id,
            product_name: checkoutProduct.name,
            driver_amount_xof: order.driver_amount_xof,
          },
        });
        const { mode, transaction_id, payment_url } = initRes.data.data;
        if (mode === 'sandbox') {
          setPayment({
            transactionId: transaction_id,
            amount: order.total_amount_xof,
            description: `Commande — ${checkoutProduct.name}`,
          });
        } else if (payment_url) {
          window.location.href = payment_url;
        }
      }
    } catch (err) {
      console.error(err);
      setCheckoutError('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPayment(null);
    setOrderSuccess(true);
    getSocket().emit('customer:join', customerPhone);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-text-muted">
        <span className="material-symbols-outlined text-6xl">storefront</span>
        <p className="text-xl font-medium">Boutique introuvable</p>
        <Link to="/" className="text-burkina-green-deep underline">← Retour à l'accueil</Link>
      </div>
    );
  }

  const { shop, products, categories } = data;
  // Livraison intra-ville uniquement : ville choisie différente de celle de
  // la boutique, ou position GPS détectée dans une autre ville
  const selectedDeliveryCity = cities.find(c => c.id === deliveryCityId);
  const isInterCity = gpsInterCity || !!(shop.city_name && selectedDeliveryCity && selectedDeliveryCity.name !== shop.city_name);
  const hash = shop.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const generatedColor = hash % 2 === 0 ? '#0A504A' : '#F97316';
  const primaryColor = shop.primary_color || generatedColor;

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden" style={{ background: getShopBannerStyle(shop.category || '', hash) }}>
        {shop.banner_url && (
          <img src={shop.banner_url} alt="" className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 flex items-end pb-6 px-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white flex-shrink-0">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: primaryColor }}>
                  {shop.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{shop.name}</h1>
              {reviewStats.total_reviews > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating rating={reviewStats.avg_rating || 0} size={14} />
                  <span className="text-white/90 text-xs font-medium">{Number(reviewStats.avg_rating).toFixed(1)} ({reviewStats.total_reviews} avis)</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-white/80 text-sm mt-1">
                <span className="px-2 py-0.5 bg-white/20 rounded-full font-medium">{getCategoryLabel(shop.category)}</span>
                {shop.city_name && <span>📍 {shop.city_name}</span>}
                {shop.allows_delivery && <span className="bg-white/20 px-2 py-0.5 rounded-full flex items-center"><span className="material-symbols-outlined text-[14px] mr-1">moped</span> Livraison disponible</span>}
                <span className="bg-white/20 px-2 py-0.5 rounded-full flex items-center"><span className="material-symbols-outlined text-[14px] mr-1">inventory_2</span> {products.length} produit{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl bg-secondary-container/40 border border-secondary-container">
                <span className="material-symbols-outlined text-on-secondary-container mt-0.5">{ANNOUNCEMENT_ICONS[a.type]}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-main">{a.title}</p>
                  <p className="text-sm text-text-main/90 mt-0.5 whitespace-pre-wrap">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1">
            {/* Search + info bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
                <input
                  type="text" value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder={`Rechercher dans ${shop.name}...`}
                  className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40"
                />
              </div>
              {shop.whatsapp_number ? (
                <button
                  onClick={() => handleWhatsApp()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-all flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container text-text-muted text-sm font-medium rounded-xl flex-shrink-0 cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">speaker_notes_off</span>
                  Contact indisponible
                </div>
              )}
              {isAuthenticated && user?.role === 'customer' ? (
                <button
                  onClick={handleContactShop}
                  disabled={isContacting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary-container hover:shadow-md text-on-secondary-container text-sm font-medium rounded-xl transition-all flex-shrink-0 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  {isContacting ? 'Ouverture...' : 'Message'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary-container hover:shadow-md text-on-secondary-container text-sm font-medium rounded-xl transition-all flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Message
                </Link>
              )}
            </div>

            {/* Categories tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === '' ? 'text-white' : 'bg-surface-container text-text-muted hover:bg-surface-container-high'}`}
                  style={activeCategory === '' ? { backgroundColor: primaryColor, color: '#fff' } : {}}
                >
                  Tous ({products.length})
                </button>
                {categories.map(cat => (
                  <button key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id ? 'text-white' : 'bg-surface-container text-text-muted hover:bg-surface-container-high'}`}
                    style={activeCategory === cat.id ? { backgroundColor: primaryColor, color: '#fff' } : {}}
                  >
                    {cat.name} ({products.filter(p => p.category_id === cat.id).length})
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 px-4 bg-white rounded-2xl border border-outline-variant/20">
                <span className="material-symbols-outlined text-6xl text-text-muted mb-4 opacity-50 block">inventory_2</span>
                <p className="text-lg font-bold text-text-main mb-2">Cette boutique prépare son catalogue !</p>
                <p className="text-text-muted text-sm mb-6">Revenez bientôt pour découvrir leurs produits.</p>
                <Link to="/shops" className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-container hover:bg-surface-container-high text-text-main font-medium rounded-xl transition-all">
                  Voir d'autres boutiques
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden hover:shadow-xl transition-all group">
                    <div className="aspect-square overflow-hidden relative" style={{ background: product.image_url ? undefined : getCategoryGradient(shop.category || '', product.id) }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-4xl opacity-80">{product.name.charAt(0)}</span>
                        </div>
                      )}
                      {product.stock_status === 'out_of_stock' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-red-600 text-xs font-bold px-2 py-1 rounded-full">Épuisé</span>
                        </div>
                      )}
                      {product.sale_price_xof && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">PROMO</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-text-main line-clamp-2">{product.name}</p>
                      <div className="mt-1.5">
                        {product.sale_price_xof ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-red-500">{Number(product.sale_price_xof).toLocaleString()}</span>
                            <span className="text-xs text-text-muted line-through">{Number(product.price_xof).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="font-bold" style={{ color: primaryColor }}>{Number(product.price_xof).toLocaleString()}</span>
                        )}
                        <span className="text-xs text-text-muted"> FCFA</span>
                      </div>
                      <button
                        onClick={() => handleOrderClick(product)}
                        disabled={product.stock_status === 'out_of_stock'}
                        className="w-full mt-2 py-2 text-xs font-medium text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: product.stock_status === 'out_of_stock' ? '#999' : primaryColor }}
                      >
                        {product.stock_status === 'out_of_stock' ? 'Épuisé' : <span className="flex items-center justify-center"><span className="material-symbols-outlined text-[16px] mr-1">shopping_cart</span> Commander</span>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Produits digitaux de la boutique */}
            {digitalProducts.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-bold text-text-main">Produits Digitaux</h2>
                  <span className="px-2 py-0.5 bg-burkina-green-light text-burkina-green-deep text-[10px] font-bold rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">bolt</span>
                    Téléchargement instantané
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {digitalProducts.map(dp => (
                    <Link
                      key={dp.id}
                      to="/digital"
                      className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden hover:shadow-xl transition-all group"
                    >
                      <div className="aspect-square overflow-hidden relative bg-surface-container flex items-center justify-center">
                        {dp.cover_image_url ? (
                          <img src={dp.cover_image_url} alt={dp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="material-symbols-outlined text-[40px] text-outline">
                            {DIGITAL_TYPE_ICONS[dp.file_type] || 'draft'}
                          </span>
                        )}
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded-full">
                          {dp.file_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-text-main line-clamp-2">{dp.name}</p>
                        <div className="mt-1.5">
                          <span className="font-bold" style={{ color: primaryColor }}>{Number(dp.price_xof).toLocaleString()}</span>
                          <span className="text-xs text-text-muted"> FCFA</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 space-y-4">
            {/* Shop Info */}
            <div className="bg-white rounded-2xl border border-outline-variant/20 p-4">
              <h3 className="font-bold text-text-main mb-3 flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">info</span> Infos boutique</h3>
              {shop.description && <p className="text-sm text-text-muted mb-3">{shop.description}</p>}
              <div className="space-y-2 text-sm">
                {shop.city_name && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {shop.city_name}
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    {shop.address}
                  </div>
                )}
                {shop.phone_number && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    {shop.phone_number}
                  </div>
                )}
              </div>
              {shop.allows_delivery && (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1">moped</span> <strong>Livraison disponible</strong>
                  {shop.delivery_fee_xof !== null && ` — ${Number(shop.delivery_fee_xof).toLocaleString()} FCFA`}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-outline-variant/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-text-main flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">star</span> Avis</h3>
                {reviewStats.total_reviews > 0 && (
                  <span className="text-sm font-bold text-text-main">{Number(reviewStats.avg_rating).toFixed(1)}/5</span>
                )}
              </div>

              {isAuthenticated && user?.role === 'customer' && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="w-full mb-3 py-2 text-sm font-medium bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-all"
                >
                  Laisser un avis
                </button>
              )}

              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="mb-4 p-3 bg-surface-container rounded-xl space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i)}
                        className="material-symbols-outlined"
                        style={{ fontSize: 24, color: reviewRating >= i ? '#ca8a04' : '#e5e7eb' }}
                      >
                        {reviewRating >= i ? 'star' : 'star_border'}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    rows={2}
                    placeholder="Votre commentaire (optionnel)"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowReviewForm(false)} className="flex-1 py-2 text-sm font-medium text-text-muted rounded-xl border border-outline-variant">Annuler</button>
                    <button type="submit" disabled={reviewRating < 1 || isSubmittingReview} className="flex-1 py-2 text-sm font-medium bg-burkina-green-deep text-white rounded-xl disabled:opacity-50">
                      {isSubmittingReview ? '...' : 'Envoyer'}
                    </button>
                  </div>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">Aucun avis pour le moment.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reviews.map(r => (
                    <div key={r.id} className="pb-3 border-b border-outline-variant/10 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-main">{r.reviewer_name || 'Client'}</span>
                        <StarRating rating={r.rating} size={13} />
                      </div>
                      {r.order_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-burkina-green-deep bg-burkina-green-light/40 px-2 py-0.5 rounded-full mb-1">
                          <span className="material-symbols-outlined text-[12px]">verified</span> Achat vérifié
                        </span>
                      )}
                      {r.comment && <p className="text-sm text-text-muted">{r.comment}</p>}

                      <button
                        type="button"
                        onClick={() => toggleReplies(r.id)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-burkina-green-deep hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">forum</span>
                        {openReplies === r.id
                          ? 'Masquer la discussion'
                          : (repliesByReview[r.id]?.length
                              ? `${repliesByReview[r.id].length} réponse${repliesByReview[r.id].length > 1 ? 's' : ''}`
                              : 'Discuter')}
                      </button>

                      {openReplies === r.id && (
                        <div className="mt-2 pl-3 border-l-2 border-burkina-green-light/50 space-y-2">
                          {(repliesByReview[r.id] || []).length === 0 ? (
                            <p className="text-xs text-text-muted">Aucune réponse. Lancez la discussion.</p>
                          ) : (
                            (repliesByReview[r.id] || []).map(rep => (
                              <div key={rep.id}>
                                <span className="text-xs font-medium text-text-main">{rep.author_name || 'Client'}</span>
                                <p className="text-xs text-text-muted">{rep.content}</p>
                              </div>
                            ))
                          )}

                          {isAuthenticated ? (
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitReply(r.id); } }}
                                placeholder="Votre réponse..."
                                className="flex-1 px-3 py-1.5 border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40"
                              />
                              <button
                                type="button"
                                onClick={() => handleSubmitReply(r.id)}
                                disabled={!replyText.trim() || isSubmittingReply}
                                className="px-3 py-1.5 text-xs font-medium bg-burkina-green-deep text-white rounded-lg disabled:opacity-50"
                              >
                                {isSubmittingReply ? '...' : 'Envoyer'}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-text-muted italic">Connectez-vous pour répondre.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCheckout(false)}>
          <div className="bg-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-headline-sm font-headline-sm">Commander</h2>
                <button onClick={() => setShowCheckout(false)} className="text-text-muted hover:text-text-main">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {orderSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">check</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Commande confirmée !</h3>
                  <p className="text-text-muted mb-6">Le commerçant a été notifié de votre commande.</p>
                  <button onClick={() => setShowCheckout(false)} className="px-6 py-2 bg-burkina-green-deep text-white rounded-xl font-medium">Fermer</button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-surface-container rounded-xl">
                    <img src={checkoutProduct.image_url || undefined} alt="" className="w-16 h-16 rounded-lg object-cover bg-outline-variant/30" />
                    <div>
                      <p className="font-bold text-text-main line-clamp-1">{checkoutProduct.name}</p>
                      <p className="text-burkina-green-deep font-bold">{(checkoutProduct.sale_price_xof || checkoutProduct.price_xof).toLocaleString()} FCFA</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Votre Nom</label>
                    <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep" placeholder="Ex: Awa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep" placeholder="Ex: 70000000" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ville de livraison</label>
                    <select required value={deliveryCityId} onChange={e => setDeliveryCityId(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep bg-white text-sm">
                      <option value="">Choisir votre ville</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <p className="text-xs text-text-muted mt-1">Les livreurs de cette ville seront notifiés</p>
                  </div>

                  {isInterCity && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
                      <p className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[18px] flex-shrink-0">local_shipping</span>
                        <span>
                          Cette boutique est à <strong>{shop.city_name}</strong>. Shopizi ne gère pas les livraisons inter-villes.
                          Contactez le commerçant pour une expédition par société de transport.
                        </span>
                      </p>
                      {shop.whatsapp_number && (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(checkoutProduct)}
                          className="w-full py-2 bg-burkina-green-deep text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Contacter le commerçant
                        </button>
                      )}
                    </div>
                  )}

                  <div className="border-t border-outline-variant/30 pt-4 mt-2">
                    <h4 className="font-medium text-text-main mb-2">Où voulez-vous être livré ?</h4>
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setDeliveryMode('geo')} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${deliveryMode === 'geo' ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'border-outline-variant'}`}>
                        Ma position
                      </button>
                      <button type="button" onClick={() => setDeliveryMode('manual')} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${deliveryMode === 'manual' ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'border-outline-variant'}`}>
                        Adresse
                      </button>
                    </div>

                    {checkoutError && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    {deliveryMode === 'geo' && (
                      <div className="space-y-3">
                        <button type="button" onClick={handleLocate} disabled={isLocating} className="w-full py-2 flex items-center justify-center gap-2 bg-burkina-green-deep text-white rounded-xl text-sm font-medium hover:bg-opacity-90">
                          {isLocating ? 'Recherche en cours...' : <><span className="material-symbols-outlined text-[18px]">my_location</span> Utiliser ma position GPS</>}
                        </button>
                        {deliveryFee !== null && !isInterCity && (
                          <div className="p-3 bg-tertiary-container/30 border border-burkina-green-deep/20 rounded-xl">
                            <p className="text-sm font-medium text-tertiary-dark flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">distance</span> {distanceKm !== null ? `Distance : ${distanceKm} km` : 'Distance estimée'}</p>
                            <p className="text-sm font-bold text-burkina-green-deep mt-1">Frais de livraison{isFeeEstimated ? ' (estimés)' : ''} : {deliveryFee === 0 ? 'Gratuit' : `${deliveryFee.toLocaleString()} FCFA`}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {deliveryMode === 'manual' && (
                      <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2} className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep text-sm" placeholder="Secteur, quartier, repères..."></textarea>
                    )}
                  </div>

                  {deliveryFee !== null && !isInterCity && (
                    <div className="border-t border-outline-variant/30 pt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-text-muted">
                        <span>Produit</span>
                        <span>{(checkoutProduct.sale_price_xof || checkoutProduct.price_xof).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>Livraison{isFeeEstimated ? ' (estimée)' : ''}</span>
                        <span>{deliveryFee === 0 ? 'Gratuit' : `${deliveryFee.toLocaleString()} FCFA`}</span>
                      </div>
                      <div className="flex justify-between font-bold text-text-main text-base pt-1 border-t border-outline-variant/20">
                        <span>TOTAL</span>
                        <span>{((checkoutProduct.sale_price_xof || checkoutProduct.price_xof) + deliveryFee).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmittingOrder || isInterCity || (deliveryMode === 'geo' && !clientLat)} className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 mt-4">
                    {isSubmittingOrder ? 'Création en cours...' : 'Confirmer la commande'}
                  </button>
                  {!isInterCity && deliveryMode === 'geo' && !clientLat && !isSubmittingOrder && (
                    <p className="text-xs text-text-muted text-center">
                      Utilisez le bouton « Ma position GPS » ci-dessus, ou passez en mode « Adresse ».
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {payment && (
        <SandboxPaymentModal
          transactionId={payment.transactionId}
          amount={payment.amount}
          description={payment.description}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayment(null)}
        />
      )}

      {/* Real-time delivery status toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-text-main text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium max-w-[90vw] text-center animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
