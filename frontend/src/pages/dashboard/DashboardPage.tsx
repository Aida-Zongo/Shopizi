import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ArrowUpRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

interface Shop {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  subdomain?: string;
}

interface OrderStats {
  new: number;
  confirmed: number;
  processing: number;
  ready: number;
  delivered: number;
  completed: number;
}

interface Product {
  id: string;
  name: string;
  price_xof: number;
  stock_quantity: number;
  primary_image?: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [publishing, setPublishing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'merchant'],
    queryFn: async () => {
      const [shopRes, ordersStatsRes, productsRes] = await Promise.all([
        api.get('/shops/my').catch(() => ({ data: { data: null } })),
        api.get('/orders/stats').catch(() => ({ data: { data: null } })),
        api.get('/products').catch(() => ({ data: { data: [] } })),
      ]);
      return {
        shop: shopRes.data.data as Shop | null,
        orderStats: ordersStatsRes.data.data as OrderStats | null,
        products: (productsRes.data.data as Product[]).slice(0, 5),
      };
    },
  });

  const handlePublish = async () => {
    if (!data?.shop) return;
    setPublishing(true);
    try {
      const res = await api.patch('/shops/my/publish', { is_published: true });
      if (res.data.success) {
        // Force refetch to update UI
        window.location.reload();
      }
    } catch (err) {
      alert('Erreur lors de la publication de la boutique.');
    } finally {
      setPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-burkina-green-deep animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="bg-error-container border border-error/20 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-error mx-auto mb-2" />
          <h3 className="text-headline-sm font-headline-sm text-error mb-2"> error occurred</h3>
          <p className="text-body-sm text-text-muted">Impossible de charger les données du tableau de bord.</p>
        </div>
      </div>
    );
  }

  const { shop, orderStats, products } = data || { shop: null, orderStats: null, products: [] };
  const pendingOrders = orderStats ? orderStats.new + orderStats.confirmed : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-text-main">
              Bonjour, {user?.full_name?.split(' ')[0] || 'Cher marchand'} !
            </h1>
            <p className="text-body-lg text-text-muted mt-2">
              Voici ce qui se passe dans votre boutique aujourd'hui.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-text-main px-4 py-2.5 rounded-lg text-label-lg hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
              Exporter
            </button>
            <Link
              to="/products"
              className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-5 py-2.5 rounded-lg text-label-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Ajouter un produit
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Ventes Card */}
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border-l-4 border-burkina-green-deep">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-burkina-green-light flex items-center justify-center text-burkina-green-deep">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-label-sm text-primary flex items-center gap-1 font-bold">
              <TrendingUp className="w-4 h-4" />
              +12%
            </span>
          </div>
          <p className="text-label-lg text-text-muted">Ventes du mois</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-headline-md font-bold text-text-main">1,250,000</h3>
            <span className="text-label-sm font-bold text-text-muted">XOF</span>
          </div>
          <div className="mt-6 h-12 w-full flex items-end gap-1">
            {/* Tiny Sparkline Mock */}
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[30%] transition-all hover:h-[45%]" />
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[45%] transition-all hover:h-[60%]" />
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[35%] transition-all hover:h-[50%]" />
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[55%] transition-all hover:h-[70%]" />
            <div className="flex-1 bg-burkina-green-deep rounded-t-sm h-[75%] transition-all hover:h-[90%]" />
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[65%] transition-all hover:h-[80%]" />
            <div className="flex-1 bg-burkina-green-light rounded-t-sm h-[85%] transition-all hover:h-[100%]" />
          </div>
        </div>

        {/* Commandes Card */}
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-saffron-glow flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            {pendingOrders > 0 && (
              <span className="text-label-sm text-tertiary flex items-center gap-1 font-bold">
                Urgent
              </span>
            )}
          </div>
          <p className="text-label-lg text-text-muted">Commandes en attente</p>
          <h3 className="text-headline-md font-bold mt-1 text-text-main">{pendingOrders}</h3>
        </div>

        {/* Produits Card */}
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-burkina-green-light flex items-center justify-center text-burkina-green-deep">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
          </div>
          <p className="text-label-lg text-text-muted">Produits en stock</p>
          <h3 className="text-headline-md font-bold mt-1 text-text-main">{products.length}</h3>
        </div>

        {/* Revenus Card */}
        <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-saffron-glow flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">credit_card</span>
            </div>
          </div>
          <p className="text-label-lg text-text-muted">Revenus totaux</p>
          <h3 className="text-headline-md font-bold mt-1 text-text-main">0 XOF</h3>
        </div>
      </section>

      {/* Commission Info */}
      <div className="bg-burkina-green-light/30 border border-burkina-green-deep/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <p className="text-body-sm font-medium text-burkina-green-deep">Vous recevez 100% du prix de vos produits</p>
        <p className="text-body-sm text-text-muted">Les frais de livraison sont gérés par Shopizi</p>
      </div>

      {/* Shop Status */}
      {shop && !shop.is_published && (
        <div className="bg-saffron-glow/30 border border-secondary/20 rounded-xl p-6">
          <h3 className="font-semibold text-secondary mb-2">Votre boutique n'est pas encore publique</h3>
          <p className="text-secondary text-sm mb-4">
            Ajoutez des produits et publiez votre boutique pour que vos clients puissent y accéder.
          </p>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {publishing ? 'Publication...' : 'Publier ma boutique'}
          </button>
        </div>
      )}

      {/* Recent Products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-sm font-headline-sm text-text-main">Produits récents</h2>
          <Link to="/products" className="text-label-lg font-label-lg text-burkina-green-deep hover:underline flex items-center gap-1">
            Voir tout <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
          {products.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 text-label-sm text-text-muted uppercase">
                  <th className="px-6 py-3 font-medium">Produit</th>
                  <th className="px-6 py-3 font-medium">Prix</th>
                  <th className="px-6 py-3 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 text-body-md font-medium text-text-main">{product.name}</td>
                    <td className="px-6 py-4 text-body-md text-text-muted">{product.price_xof.toLocaleString()} XOF</td>
                    <td className="px-6 py-4 text-body-md text-text-muted">{product.stock_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-text-muted text-body-md">
              Aucun produit ajouté pour le moment.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
