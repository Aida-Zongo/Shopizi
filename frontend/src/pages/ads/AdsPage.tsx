import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Plus } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import SandboxPaymentModal from '../../components/SandboxPaymentModal';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Ad {
  id: string;
  product_id: string;
  product_name: string;
  budget_xof: number;
  status: string;
  image_url: string | null;
  impressions: number;
  clicks: number;
}

interface Product {
  id: string;
  name: string;
}

export default function AdsPage() {
  const [hasProAccess, setHasProAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ads, setAds] = useState<Ad[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [budget, setBudget] = useState('1000');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [payment, setPayment] = useState<{ transactionId: string; amount: number; description: string } | null>(null);

  const loadAds = async () => {
    try {
      const res = await api.get('/ads');
      if (res.data.success) setAds(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const subRes = await api.get('/subscriptions/my');
        if (subRes.data.success) {
          const planSlug = subRes.data.data?.subscription?.plan_slug;
          const access = planSlug === 'pro' || planSlug === 'business';
          setHasProAccess(access);
          if (access) {
            await Promise.all([
              loadAds(),
              api.get('/products').then(res => setProducts(res.data.data || [])).catch(() => {}),
            ]);
          }
        }
      } catch (err) {
        console.error(err);
        setHasProAccess(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAccess();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetXof = Number(budget);
    if (!selectedProduct) {
      setCreateError('Sélectionnez un produit.');
      return;
    }
    if (!budgetXof || budgetXof < 1000) {
      setCreateError('Le budget minimum est de 1000 FCFA.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/payments/initiate', {
        type: 'ads',
        amount: budgetXof,
        metadata: { product_id: selectedProduct, budget_xof: budgetXof },
      });
      const { mode, transaction_id, payment_url } = res.data.data;
      const productName = products.find(p => p.id === selectedProduct)?.name || '';
      if (mode === 'sandbox') {
        setShowCreate(false);
        setPayment({ transactionId: transaction_id, amount: budgetXof, description: `Publicité — ${productName}` });
      } else if (payment_url) {
        window.location.href = payment_url;
      }
    } catch (err) {
      setCreateError(getApiError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPayment(null);
    setSelectedProduct('');
    setBudget('1000');
    loadAds();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShopiziLoader />
      </div>
    );
  }

  if (!hasProAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-10 h-10" />
        </div>
        <h1 className="text-headline-md font-headline-md text-text-main mb-4">Accès aux Publicités</h1>
        <p className="text-body-lg text-text-muted mb-8">
          La gestion des campagnes publicitaires est réservée aux marchands Pro et Business.
          Boostez la visibilité de vos produits et augmentez vos ventes dès aujourd'hui.
        </p>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-2 px-8 py-4 bg-burkina-green-deep text-white rounded-xl font-label-lg uppercase tracking-wider hover:bg-opacity-90 transition-all shadow-md"
        >
          Passez à la vitesse supérieure
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-headline-sm font-headline-sm text-text-main">Publicités</h1>
          <p className="text-body-md text-text-muted mt-1">Gérez vos campagnes publicitaires</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-burkina-green-deep text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Créer une campagne
        </button>
      </div>

      {ads.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center shadow-sm">
          <TrendingUp className="w-12 h-12 text-outline mx-auto mb-4" />
          <h2 className="text-title-lg font-bold text-text-main mb-2">Aucune campagne active</h2>
          <p className="text-body-md text-text-muted">Commencez par sponsoriser l'un de vos produits pour attirer plus de clients.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-surface-container text-text-muted text-label-sm uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {ads.map(ad => (
                <tr key={ad.id}>
                  <td className="px-4 py-3 flex items-center gap-3">
                    {ad.image_url && <img src={ad.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <span className="font-medium text-text-main">{ad.product_name}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{Number(ad.budget_xof).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${ad.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-container text-text-muted'}`}>
                      {ad.status === 'active' ? 'Active' : ad.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted text-sm">
                    {ad.impressions} vues · {ad.clicks} clics
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-headline-sm font-headline-sm">Nouvelle campagne</h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-main">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Produit à sponsoriser</label>
                <select
                  required value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                >
                  <option value="">Sélectionnez un produit</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Budget (FCFA)</label>
                <input
                  type="number" min={1000} required value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                />
                <p className="text-xs text-text-muted mt-1">Minimum 1000 FCFA</p>
              </div>

              {createError && <p className="text-sm text-error">{createError}</p>}

              <button
                type="submit" disabled={isCreating}
                className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isCreating ? 'Initialisation...' : 'Payer et lancer la campagne'}
              </button>
            </form>
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
    </div>
  );
}
