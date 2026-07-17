import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { getCategoryLabel, getCategoryGradient, getShopBannerStyle } from '../../lib/categories';
import StarRating from '../../components/StarRating';

interface Shop {
  id: string;
  name: string;
  subdomain: string;
  category: string;
  description: string | null;
  city_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  allows_delivery: boolean;
  delivery_fee_xof: number | null;
  whatsapp_number: string;
  avg_rating: number | null;
  total_reviews: number;
}

interface Product {
  id: string;
  name: string;
  price_xof: number;
  image_url: string | null;
  shop_name?: string;
  shop_subdomain?: string;
  category?: string;
}

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1400&q=80',
    title: 'Trouvez tout ce dont',
    highlight: 'vous avez besoin',
    subtitle: 'Des milliers de produits chez vos commerçants locaux au Burkina Faso',
  },
  {
    image: 'https://images.unsplash.com/photo-1531217132659-9b2a1875a5aa?w=1400&q=80',
    title: 'Livraison rapide',
    highlight: 'dès 500 FCFA',
    subtitle: 'Des livreurs partenaires disponibles à Ouagadougou et dans toutes les villes',
  },
  {
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
    title: 'Vendez vos produits',
    highlight: '100% en ligne',
    subtitle: 'Créez votre boutique gratuitement et touchez des milliers de clients',
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80',
    title: 'Produits digitaux',
    highlight: 'livraison instantanée',
    subtitle: 'Livres, formations, musique — téléchargement immédiat après paiement',
  },
];

const CATEGORIES = [
  { value: '', label: 'Tout', icon: 'storefront' },
  { value: 'food', label: 'Alimentation', icon: 'restaurant' },
  { value: 'fashion', label: 'Mode', icon: 'checkroom' },
  { value: 'electronics', label: 'Électronique', icon: 'devices' },
  { value: 'health', label: 'Santé', icon: 'health_and_safety' },
  { value: 'home', label: 'Maison', icon: 'home' },
  { value: 'beauty', label: 'Beauté', icon: 'spa' },
  { value: 'services', label: 'Services', icon: 'build' },
];

// Paiement 100% en ligne : le checkout redirige vers CinetPay (channels: 'ALL'),
// qui expose Orange Money, Moov Money et carte sur sa page hebergee. Ce ne sont
// pas des passerelles concurrentes mais les canaux d'une seule. Le webhook marque
// la commande payee automatiquement, sans action du marchand. Pas de cash ni de
// virement : le backend ne sait confirmer que les paiements en ligne.
const PAYMENT_METHODS = [
  { name: 'Orange Money', logo: 'orange' as const },
  { name: 'Moov Money', logo: 'moov' as const },
  { name: 'Carte bancaire', logo: 'card' as const },
];

// Marques SVG fidèles aux couleurs officielles : le carré Orange (#FF7900)
// et le badge wordmark Moov (bleu marine). Rendues inline pour rester nettes
// a toute taille et sans dependance a un fichier image externe.
function PaymentLogo({ logo }: { logo: 'orange' | 'moov' | 'card' }) {
  if (logo === 'orange') {
    return (
      <svg width="20" height="20" viewBox="0 0 100 100" aria-hidden="true" className="rounded-[5px] shrink-0">
        <rect width="100" height="100" rx="12" fill="#FF7900" />
        <rect x="50" y="50" width="40" height="40" fill="#FFFFFF" />
      </svg>
    );
  }
  if (logo === 'moov') {
    return (
      <svg width="34" height="20" viewBox="0 0 150 90" aria-hidden="true" className="rounded-[5px] shrink-0">
        <rect width="150" height="90" rx="18" fill="#0A1F44" />
        <text x="75" y="62" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="46" fill="#FFFFFF" textAnchor="middle">moov</text>
      </svg>
    );
  }
  return (
    <span className="material-symbols-outlined text-base" style={{ color: '#1A1F71' }}>credit_card</span>
  );
}

const FAQ_ITEMS = [
  {
    question: "C'est quoi Shopizi ?",
    answer: "Shopizi est la première marketplace digitale du Burkina Faso. Elle connecte les commerçants locaux, les clients et les livreurs sur une seule plateforme. Achetez, vendez et faites livrer partout au Burkina.",
    icon: 'storefront',
    color: '#00A86B',
  },
  {
    question: 'Pourquoi choisir Shopizi ?',
    answer: "Shopizi ne prend aucune commission sur vos ventes de produits physiques. Les marchands gardent 100% de leurs revenus. Seuls les frais de livraison font l'objet d'un partage équitable avec les livreurs.",
    icon: 'star',
    color: '#ca8a04',
  },
  {
    question: 'Comment ça marche ?',
    answer: '1. Cherchez un produit ou une boutique. 2. Commandez et payez via Orange Money ou Moov Money. 3. Un livreur partenaire vient chercher votre commande et vous la livre à domicile en un temps record.',
    icon: 'help',
    color: '#0A504A',
  },
  {
    question: 'La livraison est disponible où ?',
    answer: 'Shopizi gère les livraisons dans la même ville. Pour Ouagadougou, Bobo-Dioulasso, Koudougou et d\'autres villes. Les frais commencent à 500 FCFA et ne dépassent jamais 2,000 FCFA en ville.',
    icon: 'local_shipping',
    color: '#00A86B',
  },
  {
    question: 'Comment devenir marchand ?',
    answer: "L'inscription est 100% gratuite. Créez votre compte en moins de 2 minutes, configurez votre boutique, ajoutez vos produits et commencez à vendre immédiatement. Aucun document requis pour démarrer.",
    icon: 'add_business',
    color: '#ca8a04',
  },
  {
    question: "C'est quoi les produits digitaux ?",
    answer: 'Vendez et achetez des livres PDF, formations en ligne, musique, templates et bien plus. Après paiement, le client reçoit immédiatement son lien de téléchargement. Pas de livreur, livraison instantanée.',
    icon: 'download',
    color: '#0A504A',
  },
];

const DIFFERENTIATORS = [
  {
    icon: 'percent',
    title: '0% de commission',
    desc: 'Shopizi ne prend aucune commission sur vos ventes de produits. Vous gardez 100% de vos revenus.',
    highlight: '0%',
  },
  {
    icon: 'chat',
    title: 'Chat intégré',
    desc: "Discutez directement avec les marchands et les livreurs depuis l'application. Partagez votre position GPS en un clic.",
    highlight: 'Direct',
  },
  {
    icon: 'qr_code_scanner',
    title: 'Confirmation QR Code',
    desc: 'À la livraison, le client scanne le QR code du livreur pour confirmer la réception. Simple, rapide et sécurisé.',
    highlight: 'Sécurisé',
  },
  {
    icon: 'download',
    title: 'Produits digitaux',
    desc: 'Vendez des livres, formations et fichiers digitaux avec livraison instantanée. Unique au Burkina Faso.',
    highlight: 'Unique',
  },
  {
    icon: 'smart_toy',
    title: 'IA Kèra',
    desc: 'Notre assistante shopping intelligente parle votre langue et vous aide à trouver les meilleurs produits locaux.',
    highlight: 'IA locale',
  },
  {
    icon: 'verified',
    title: 'Made in Burkina',
    desc: 'Conçu par et pour les Burkinabè. Support en français, prix en FCFA, paiements via Orange Money et Moov Money.',
    highlight: 'Local',
  },
];

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shops, setShops] = useState<Shop[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [stats, setStats] = useState({ shops: 0, products: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(i => (i + 1) % heroSlides.length);
        setIsTransitioning(false);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  };

  const filteredFeaturedProducts = featuredProducts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = normalizeText(searchQuery);
    return normalizeText(p.name).includes(q) ||
           (p.shop_name && normalizeText(p.shop_name).includes(q));
  });

  const filteredShops = shops.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = normalizeText(searchQuery);
    return normalizeText(s.name).includes(q) ||
           (s.category && normalizeText(s.category).includes(q)) ||
           (s.description && normalizeText(s.description).includes(q));
  });

  useEffect(() => {
    loadData();
  }, [activeCategory]);

  useEffect(() => {
    // Resilience au demarrage a froid de Render : si la 1re requete echoue
    // (serveur en cours de reveil), on reessaie une fois apres un court delai,
    // sinon le hero resterait bloque sur 0 jusqu'a un rechargement manuel.
    let cancelled = false;
    const fetchStats = (attempt: number) => {
      api.get('/customer/stats')
        .then(res => { if (!cancelled && res.data.success) setStats(res.data.data); })
        .catch(() => { if (!cancelled && attempt < 2) setTimeout(() => fetchStats(attempt + 1), 3000); });
    };
    fetchStats(1);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load published shops
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      const shopsRes = await api.get(`/customer/shops?${params}`);
      if (shopsRes.data.success) setShops(shopsRes.data.data || []);

      // Load featured products
      const prodRes = await api.get('/customer/products/featured');
      if (prodRes.data.success) setFeaturedProducts(prodRes.data.data || []);
    } catch {
      // silently fail — public page
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Hero avec carrousel d'images */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)' }}>
        {/* Images carrousel */}
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === currentSlide ? 0.2 : 0 }}
          >
            <img src={slide.image} alt="" className="w-full h-full object-cover" />
          </div>
        ))}

        {/* Overlay dégradé */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,80,74,0.95) 50%, rgba(10,80,74,0.7) 100%)' }} />

        {/* Contenu */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-white/20 bg-white/10">
              <span className="material-symbols-outlined text-sm" style={{ color: '#A2E4B8' }}>storefront</span>
              <span className="text-white/80 text-sm font-medium">
                La marketplace du Burkina Faso
              </span>
            </div>

            {/* Titre animé */}
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {heroSlides[currentSlide].title}
              <span className="block" style={{ color: '#ca8a04' }}>
                {heroSlides[currentSlide].highlight}
              </span>
            </h1>

            <p className={`text-white/70 text-lg mb-8 leading-relaxed transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {heroSlides[currentSlide].subtitle}
            </p>

            {/* Barre de recherche */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-xl">
                <span className="material-symbols-outlined text-gray-400">search</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/marketplace?q=${encodeURIComponent(searchQuery)}`)}
                  placeholder="Rechercher un produit, une boutique..."
                  className="flex-1 outline-none text-gray-700 bg-transparent"
                />
              </div>
              <button
                onClick={() => navigate(`/marketplace?q=${encodeURIComponent(searchQuery)}`)}
                className="px-6 py-3 rounded-2xl font-bold text-white shadow-xl hover:opacity-90 transition-all"
                style={{ backgroundColor: '#ca8a04' }}
              >
                Chercher
              </button>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {['Riz local', 'Tissu Faso Dan Fani', 'Téléphone', 'Médicaments', 'Formation'].map(term => (
                <button
                  key={term}
                  onClick={() => navigate(`/marketplace?q=${encodeURIComponent(term)}`)}
                  className="px-3 py-1.5 rounded-full text-white/80 text-xs font-medium border border-white/20 hover:bg-white/10 transition-all"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Stats droite */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { icon: 'storefront', value: stats.shops + '+', label: 'Boutiques actives' },
              { icon: 'inventory_2', value: stats.products + '+', label: 'Produits disponibles' },
              { icon: 'local_shipping', value: '500 FCFA', label: 'Livraison dès' },
              { icon: 'groups', value: '21M+', label: 'Burkinabè servis' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-all">
                <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: '#A2E4B8' }}>
                  {stat.icon}
                </span>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: '#A2E4B8' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Indicateurs carrousel */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === currentSlide ? '24px' : '8px',
                height: '8px',
                backgroundColor: i === currentSlide ? '#ca8a04' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      </section>

      {/* Bande défilante moyens de paiement */}
      <div className="bg-white border-y border-gray-100 py-4 overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6 bg-gray-200 mx-4" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap px-4">
            Moyens de paiement acceptés
          </span>
          <div className="w-px h-6 bg-gray-200" />
        </div>

        <style>{`
          @keyframes payment-scroll-kf {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .payment-scroll {
            animation: payment-scroll-kf 20s linear infinite;
            display: flex;
            width: max-content;
          }
          .payment-scroll:hover { animation-play-state: paused; }
        `}</style>

        <div className="overflow-hidden">
          <div className="payment-scroll">
            {[...Array(2)].map((_, repeat) => (
              <div key={repeat} className="flex items-center gap-8 px-4">
                {PAYMENT_METHODS.map((pay, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 whitespace-nowrap hover:shadow-sm transition-all">
                    <PaymentLogo logo={pay.logo} />
                    <span className="text-sm font-medium text-gray-600">
                      {pay.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Catégories de produits */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? 'text-white shadow-md'
                  : 'bg-surface-container text-text-muted hover:bg-surface-container-high'
              }`}
              style={activeCategory === cat.value ? { backgroundColor: '#0A504A' } : {}}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="py-10 px-4" style={{ backgroundColor: '#0A504A' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: 'storefront', value: `${stats.shops}+`, label: 'Boutiques actives' },
            { icon: 'inventory_2', value: `${stats.products}+`, label: 'Produits disponibles' },
            { icon: 'local_shipping', value: '500 FCFA', label: 'Livraison dès' },
            { icon: 'percent', value: '0%', label: 'Sur produits physiques' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <span className="material-symbols-outlined text-[32px] mb-2" style={{ color: '#A2E4B8' }}>
                {item.icon}
              </span>
              <p className="text-2xl md:text-3xl font-black text-white">{item.value}</p>
              <p className="text-sm text-white/70">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3" style={{ color: '#0A504A' }}>
            Comment ça marche ?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Shopizi connecte clients, commerçants et livreurs en toute simplicité
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: 'search',
              step: '01',
              title: 'Recherchez',
              desc: 'Trouvez des produits et boutiques locales près de chez vous à Ouagadougou et partout au Burkina Faso',
              image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=70&auto=format&fit=crop',
            },
            {
              icon: 'shopping_cart',
              step: '02',
              title: 'Commandez',
              desc: 'Passez commande sur la plateforme et payez via Orange Money ou Moov Money en toute sécurité',
              image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=70&auto=format&fit=crop',
            },
            {
              icon: 'local_shipping',
              step: '03',
              title: 'Recevez',
              desc: 'Un livreur partenaire récupère votre commande et vous la livre rapidement à domicile',
              image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&q=70&auto=format&fit=crop',
            },
          ].map((item, i) => (
            <div key={i} className="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              {/* Photo nette + badge étape + pastille icône */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={item.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute top-3 right-3 bg-white/95 text-xs font-black px-2.5 py-1 rounded-full" style={{ color: '#ca8a04' }}>
                  Étape {item.step}
                </span>
                <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#00A86B' }}>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '22px' }}>{item.icon}</span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold mb-3" style={{ color: '#0A504A' }}>
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Connecteur entre cartes */}
              {i < 2 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00A86B' }}>
                    <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Produits en vedette */}
      {featuredProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-main"><span className="material-symbols-outlined align-middle mr-1">star</span> Produits en vedette</h2>
          </div>
          {filteredFeaturedProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-text-muted mb-2">search_off</span>
              <p className="text-text-main font-medium">Aucun produit trouvé pour "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-sm font-bold text-text-main transition-colors">
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFeaturedProducts.slice(0, 10).map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden hover:shadow-xl transition-all group cursor-pointer"
                  onClick={() => navigate(`/shops/${product.shop_subdomain}`)}>
                  <div className="aspect-square overflow-hidden relative" style={{ background: product.image_url ? undefined : getCategoryGradient(product.category || '', product.id) }}>
                    <span className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                      {getCategoryLabel(product.category)}
                    </span>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white font-bold text-6xl opacity-80">{product.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-main line-clamp-2">{product.name}</p>
                    <p className="text-base font-bold text-burkina-green-deep mt-1">{Number(product.price_xof).toLocaleString()} <span className="text-xs font-normal text-text-muted">FCFA</span></p>
                    {product.shop_name && <p className="text-xs text-text-muted mt-1 truncate"><span className="material-symbols-outlined text-[12px] align-middle mr-1">storefront</span> {product.shop_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Boutiques partenaires */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main"><span className="material-symbols-outlined align-middle mr-1">storefront</span> Boutiques partenaires</h2>
          <Link to="/shops" className="text-sm text-burkina-green-deep hover:underline font-medium">Voir toutes →</Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden animate-pulse">
                <div className="h-36 bg-surface-container" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-surface-container rounded w-3/4" />
                  <div className="h-3 bg-surface-container rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <span className="material-symbols-outlined text-6xl mb-4 block">storefront</span>
            <p className="text-lg font-medium">{searchQuery ? `Aucune boutique trouvée pour "${searchQuery}"` : "Aucune boutique trouvée"}</p>
            <p className="text-sm mt-1">{searchQuery ? "Essayez d'autres mots-clés" : "Essayez une autre catégorie"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredShops.map((shop, index) => (
              <Link
                key={shop.id}
                to={`/shops/${shop.subdomain}`}
                className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Banner */}
                <div className="h-36 relative overflow-hidden group-hover:brightness-110 transition-all duration-300" style={{ background: getShopBannerStyle(shop.category, index) }}>
                  {shop.banner_url ? (
                    <img src={shop.banner_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      <span className="text-white font-black opacity-20" style={{ fontSize: '120px', lineHeight: 1, userSelect: 'none' }}>
                        {shop.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Logo */}
                  <div className="absolute bottom-0 left-4 translate-y-1/2 w-14 h-14 rounded-xl border-2 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: getShopBannerStyle(shop.category, index) }}>
                        <span className="text-white font-black text-xl drop-shadow-lg">{shop.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 text-burkina-green-deep text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] mr-1">moped</span> Livraison
                  </div>
                </div>

                <div className="pt-8 pb-4 px-4">
                  <h3 className="font-bold text-burkina-green-deep">{shop.name}</h3>
                  {Number(shop.total_reviews) > 0 ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarRating rating={Number(shop.avg_rating)} size={14} />
                      <span className="text-xs text-text-muted">({Number(shop.avg_rating).toFixed(1)})</span>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted mt-0.5">Pas encore d'avis</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
                    <span className="px-2 py-0.5 bg-shopizi-light/30 border border-shopizi-light rounded-full text-[10px] font-bold text-shopizi-dark">{getCategoryLabel(shop.category)}</span>
                    <span className="flex items-center"><span className="material-symbols-outlined text-[14px] mr-0.5">inventory_2</span> {(shop as any).product_count > 0 ? `${(shop as any).product_count} produits` : 'Catalogue en préparation'}</span>
                    <span className="flex items-center ml-auto" style={{ color: shop.city_name ? '#0A504A' : '#ca8a04' }}><span className="material-symbols-outlined text-[14px] mr-0.5">location_on</span> {shop.city_name || 'Ville non précisée'}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-2 line-clamp-2">{(shop.description && shop.description !== 'null' && shop.description !== 'undefined') ? shop.description : 'Boutique partenaire Shopizi'}</p>
                  {shop.city_name ? (
                    <p className="text-xs text-burkina-green-deep mt-2 font-medium flex items-center">
                      <span className="material-symbols-outlined text-[16px] mr-1">moped</span>
                      Livraison à {shop.city_name}
                      <span className="text-text-muted ml-1">· {shop.delivery_fee_xof ? `${Number(shop.delivery_fee_xof).toLocaleString()} FCFA` : 'dès 500 FCFA'}</span>
                    </p>
                  ) : (
                    <p className="text-xs mt-2 font-medium flex items-center" style={{ color: '#ca8a04' }}>
                      <span className="material-symbols-outlined text-[16px] mr-1">warning</span>
                      Ville à préciser
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pourquoi Shopizi (FAQ visuelle) */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#00A86B' }}>
            Vos questions
          </span>
          <h2 className="text-4xl font-black mt-2 mb-4" style={{ color: '#0A504A' }}>
            Tout savoir sur Shopizi
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            La marketplace digitale pensée pour les Burkinabè
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FAQ_ITEMS.map((faq, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 group cursor-pointer">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ backgroundColor: faq.color + '15' }}
                >
                  <span className="material-symbols-outlined" style={{ color: faq.color, fontSize: '24px' }}>
                    {faq.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-lg mb-2" style={{ color: '#0A504A' }}>
                    {faq.question}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* La particularité de Shopizi */}
      <section style={{ backgroundColor: '#0A504A' }} className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#A2E4B8' }}>
              Notre différence
            </span>
            <h2 className="text-4xl font-black text-white mt-2 mb-4">
              La particularité de Shopizi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DIFFERENTIATORS.map((item, i) => (
              <div key={i} className="relative group">
                <div className="absolute top-4 right-4 text-5xl font-black opacity-5 text-white select-none">
                  {item.highlight}
                </div>
                <div className="p-6">
                  <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(162,228,184,0.15)' }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: '#A2E4B8' }}>
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="font-black text-xl text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-16" style={{ backgroundColor: '#F7F7F2' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-black text-center mb-3" style={{ color: '#0A504A' }}>
            Ils nous font confiance
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Ce que disent nos marchands et clients
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Aminata Ouédraogo',
                role: 'Marchande de mode, Ouagadougou',
                text: 'Depuis que j\'ai rejoint Shopizi, mes ventes ont doublé. Je reçois des commandes de tout Ouaga !',
                photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&q=70&auto=format&fit=crop',
              },
              {
                name: 'Ibrahim Kaboré',
                role: 'Client fidèle, Bobo-Dioulasso',
                text: 'Je commande mes produits locaux sans bouger de chez moi. La livraison est toujours rapide.',
                photo: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=160&q=70&auto=format&fit=crop',
              },
              {
                name: 'Fatou Traoré',
                role: 'Livreur partenaire, Ouagadougou',
                text: 'Shopizi m\'a permis d\'avoir un revenu stable. Je gère mes courses comme je veux.',
                photo: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=160&q=70&auto=format&fit=crop',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ca8a04', fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white"
                  />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#0A504A' }}>
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Double CTA (Client + Marchand) */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CTA Client */}
          <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #00A86B 0%, #0A504A 100%)' }}>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 bg-white" />
            <span className="material-symbols-outlined text-4xl text-white/60 mb-4 block">
              shopping_bag
            </span>
            <h3 className="text-2xl font-black text-white mb-3">
              Vous êtes client ?
            </h3>
            <p className="text-white/70 text-sm mb-6">
              Découvrez des milliers de produits locaux et faites-vous livrer où vous voulez au Burkina.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: '#ca8a04', color: 'white' }}
            >
              <span className="material-symbols-outlined text-sm">explore</span>
              Explorer la marketplace
            </Link>
          </div>

          {/* CTA Marchand */}
          <div className="rounded-3xl p-8 relative overflow-hidden border-2 border-gray-100 bg-white">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: '#00A86B' }} />
            <span className="material-symbols-outlined text-4xl mb-4 block" style={{ color: '#ca8a04' }}>
              add_business
            </span>
            <h3 className="text-2xl font-black mb-3" style={{ color: '#0A504A' }}>
              Vous êtes marchand ?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Créez votre boutique gratuitement et vendez à des milliers de clients. 0% de commission.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#00A86B' }}
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Créer ma boutique — Gratuit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
