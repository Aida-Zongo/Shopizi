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

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=1400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&q=80&auto=format&fit=crop',
];

const SOCIAL_AVATARS = [
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=80&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=60&auto=format&fit=crop',
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

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shops, setShops] = useState<Shop[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [stats, setStats] = useState({ shops: 0, products: 0 });
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
    api.get('/customer/stats')
      .then(res => { if (res.data.success) setStats(res.data.data); })
      .catch(() => {});
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Real-time filtering handles the display
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 lg:py-20 px-4" style={{ backgroundColor: '#F7F7F2' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Texte + recherche */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-sm mb-6" style={{ color: '#0A504A' }}>
              <span className="material-symbols-outlined text-[16px]">public</span>
              <span>La marketplace digitale du Burkina Faso</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: '#0A504A' }}>
              Trouvez tout ce dont<br />
              <span style={{ color: '#F97316' }}>vous avez besoin</span>
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Des milliers de produits disponibles chez nos commerçants partenaires à Ouagadougou et partout au Burkina.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto lg:mx-0">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ex: riz local, tissu faso dan fani, téléphone..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-text-main bg-white border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-shopizi-accent text-base"
                />
              </div>
              <button type="submit" className="px-6 py-4 bg-shopizi-accent hover:brightness-90 text-white font-bold rounded-2xl transition-all active:scale-95">
                Chercher
              </button>
            </form>

            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mt-4">
              {['Riz local', 'Tissu Faso Dan Fani', 'Téléphone', 'Médicaments', 'Décoration'].map(term => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    navigate(`/marketplace?q=${encodeURIComponent(term)}`);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-gray-600 text-xs font-medium transition-all"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Preuve sociale */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-8">
              <div className="flex -space-x-3">
                {SOCIAL_AVATARS.map(src => (
                  <img key={src} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <p className="text-gray-600 text-sm text-left">
                Déjà adopté par des <span className="font-bold" style={{ color: '#0A504A' }}>milliers de Burkinabè</span>
              </p>
            </div>
          </div>

          {/* Visuel — image nette, cadre arrondi, carte flottante */}
          <div className="relative hidden sm:block">
            <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full opacity-15" style={{ backgroundColor: '#F97316' }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#0A504A' }} />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-72 md:h-96">
              {HERO_IMAGES.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                  style={{ opacity: i === heroIndex ? 1 : 0 }}
                />
              ))}
            </div>
            <div className="absolute -bottom-5 left-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF4ED' }}>
                <span className="material-symbols-outlined" style={{ color: '#F97316' }}>moped</span>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0A504A' }}>Livraison rapide</p>
                <p className="text-xs text-gray-500">dès 500 FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="py-10 px-4" style={{ backgroundColor: '#0A504A' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: 'storefront', value: `${stats.shops}+`, label: 'Boutiques actives' },
            { icon: 'inventory_2', value: `${stats.products}+`, label: 'Produits disponibles' },
            { icon: 'local_shipping', value: '500 FCFA', label: 'Livraison dès' },
            { icon: 'percent', value: '0%', label: 'Commission sur ventes' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <span className="material-symbols-outlined text-[32px] mb-2" style={{ color: '#FDBA74' }}>
                {item.icon}
              </span>
              <p className="text-2xl md:text-3xl font-black text-white">{item.value}</p>
              <p className="text-sm text-white/70">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
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
              {cat.label}
            </button>
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
                <span className="absolute top-3 right-3 bg-white/95 text-xs font-black px-2.5 py-1 rounded-full" style={{ color: '#F97316' }}>
                  Étape {item.step}
                </span>
                <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#F97316' }}>
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
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F97316' }}>
                    <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
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

      {/* Shops Grid */}
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
                    <span className="flex items-center ml-auto"><span className="material-symbols-outlined text-[14px] mr-0.5">location_on</span> {shop.city_name || 'Burkina Faso'}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-2 line-clamp-2">{(shop.description && shop.description !== 'null' && shop.description !== 'undefined') ? shop.description : 'Boutique partenaire Shopizi'}</p>
                  <p className="text-xs text-burkina-green-deep mt-2 font-medium">
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">moped</span>
                    Livraison : {shop.delivery_fee_xof ? `${Number(shop.delivery_fee_xof).toLocaleString()} FCFA` : 'à partir de 500 FCFA'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pourquoi Shopizi */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image gauche */}
          <div className="relative rounded-3xl overflow-hidden h-80 lg:h-96 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&q=80&auto=format&fit=crop"
              alt="Commerçant Burkina Faso"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-bold">Des marchands locaux</p>
              <p className="text-sm opacity-80">nous font confiance</p>
            </div>
          </div>

          {/* Contenu droite */}
          <div>
            <h2 className="text-3xl font-black mb-6" style={{ color: '#0A504A' }}>
              Pourquoi choisir Shopizi ?
            </h2>
            {[
              { icon: 'storefront', title: 'Commerçants locaux', desc: 'Soutenez directement l\'économie burkinabè' },
              { icon: 'verified_user', title: 'Paiements sécurisés', desc: 'Orange Money et Moov Money acceptés' },
              { icon: 'bolt', title: 'Livraison rapide', desc: 'Dès 500 FCFA partout au Burkina' },
              { icon: 'support_agent', title: 'Support réactif', desc: 'Chat intégré et WhatsApp disponible' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(10, 80, 74, 0.08)' }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: '#0A504A' }}>
                    {item.icon}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: '#0A504A' }}>
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Commerçant */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#0A504A' }}>
          {/* Motif géométrique */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.2) 0%, transparent 40%)`,
            }}
          />

          <div className="relative z-10 px-8 py-12 md:px-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
                <span className="material-symbols-outlined text-white text-sm">rocket_launch</span>
                <span className="text-white/90 text-xs font-medium">
                  Inscription 100% gratuite
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                Vous êtes commerçant ?
              </h2>
              <p className="text-white/70 max-w-md text-sm leading-relaxed">
                Créez votre boutique en ligne en quelques minutes et touchez des milliers de clients au Burkina Faso.
                Gardez 100% de vos revenus — Shopizi ne prend aucune commission sur vos ventes.
              </p>
            </div>

            <div className="flex flex-col gap-3 flex-shrink-0">
              <Link
                to="/register"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: '#F97316', color: 'white' }}
              >
                <span className="material-symbols-outlined text-sm">add_business</span>
                Créer ma boutique
              </Link>
              <Link
                to="/shops"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm border-2 border-white/40 text-white hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm">storefront</span>
                Voir les boutiques
              </Link>
            </div>
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
    </div>
  );
}
