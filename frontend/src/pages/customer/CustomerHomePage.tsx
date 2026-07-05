import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [shops, setShops] = useState<Shop[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
      <section className="relative overflow-hidden py-20 px-4" style={{ background: 'linear-gradient(135deg, #0A504A 0%, #00A86B 60%, #A2E4B8 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 text-white/90 text-sm mb-6">
            <span className="material-symbols-outlined text-[16px]">public</span>
            <span>La marketplace digitale du Burkina Faso</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Trouvez tout ce dont<br />
            <span className="text-amber-300">vous avez besoin</span>
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Des milliers de produits disponibles chez nos commerçants partenaires à Ouagadougou et partout au Burkina.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ex: riz local, tissu faso dan fani, téléphone..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-text-main bg-white focus:outline-none focus:ring-2 focus:ring-shopizi-primary text-base"
              />
            </div>
            <button type="submit" className="px-6 py-4 bg-shopizi-accent hover:brightness-90 text-white font-bold rounded-2xl transition-all active:scale-95">
              Chercher
            </button>
          </form>

          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['Riz local', 'Tissu Faso Dan Fani', 'Téléphone', 'Médicaments', 'Décoration'].map(term => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white/80 text-xs font-medium transition-all"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{shops.length || '6'}+</p>
              <p className="text-white/60 text-xs">Boutiques</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">{featuredProducts.length || '12'}+</p>
              <p className="text-white/60 text-xs">Produits</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black text-amber-300">500 FCFA</p>
              <p className="text-white/60 text-xs">Livraison dès</p>
            </div>
          </div>
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
              style={activeCategory === cat.value ? { backgroundColor: '#00A86B' } : {}}
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
            },
            {
              icon: 'shopping_cart',
              step: '02',
              title: 'Commandez',
              desc: 'Passez commande sur la plateforme et payez via Orange Money ou Moov Money en toute sécurité',
            },
            {
              icon: 'local_shipping',
              step: '03',
              title: 'Recevez',
              desc: 'Un livreur partenaire récupère votre commande et vous la livre rapidement à domicile',
            },
          ].map((item, i) => (
            <div key={i} className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              {/* Numéro étape */}
              <span className="absolute top-6 right-6 text-6xl font-black opacity-5 select-none" style={{ color: '#00A86B' }}>
                {item.step}
              </span>

              {/* Icône */}
              <div className="w-14 h-14 rounded-2xl mb-6 flex items-center justify-center" style={{ backgroundColor: '#A2E4B8' }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: '#0A504A' }}>
                  {item.icon}
                </span>
              </div>

              <h3 className="text-lg font-bold mb-3" style={{ color: '#0A504A' }}>
                {item.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {item.desc}
              </p>

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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3" style={{ color: '#0A504A' }}>
            Pourquoi choisir Shopizi ?
          </h2>
          <p className="text-gray-500">
            La marketplace pensée pour le Burkina Faso
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: 'storefront',
              title: 'Commerçants locaux',
              desc: 'Soutenez directement l\'économie et les entrepreneurs du Burkina Faso',
              color: '#00A86B',
            },
            {
              icon: 'verified_user',
              title: 'Paiements sécurisés',
              desc: 'Transactions protégées via Orange Money et Moov Money',
              color: '#0A504A',
            },
            {
              icon: 'bolt',
              title: 'Livraison rapide',
              desc: 'Des livreurs partenaires disponibles dès 500 FCFA dans votre ville',
              color: '#ca8a04',
            },
            {
              icon: 'support_agent',
              title: 'Support réactif',
              desc: 'Contactez les marchands directement via WhatsApp ou le chat intégré',
              color: '#00A86B',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
                <span className="material-symbols-outlined" style={{ color: item.color, fontSize: '24px' }}>
                  {item.icon}
                </span>
              </div>
              <h3 className="font-bold mb-2 text-sm" style={{ color: '#0A504A' }}>
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Commerçant */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)' }}>
          {/* Motif géométrique */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(202,138,4,0.15) 0%, transparent 40%)`,
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
                style={{ backgroundColor: '#ca8a04', color: 'white' }}
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
    </div>
  );
}
