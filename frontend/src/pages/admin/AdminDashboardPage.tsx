import { useEffect, useState } from 'react';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

type Tab = 'overview' | 'shops' | 'users' | 'orders' | 'finances';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'shops', label: 'Boutiques' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'orders', label: 'Commandes' },
  { id: 'finances', label: 'Finances' },
];

const PLAN_OPTIONS = [
  { slug: 'free', label: 'Gratuit' },
  { slug: 'pro', label: 'Pro' },
  { slug: 'business', label: 'Business' },
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  confirmed: 'Confirmé',
  processing: 'En traitement',
  ready: 'Prêt',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const ROLE_LABELS: Record<string, string> = {
  customer: 'Clients',
  merchant: 'Marchands',
  driver: 'Livreurs',
};

function Money({ xof }: { xof: number }) {
  return <>{(xof || 0).toLocaleString('fr-FR')} XOF</>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <ShopiziLoader />
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/overview')
      .then(res => setData(res.data.data))
      .catch(err => setError(getApiError(err)));
  }, []);

  if (error) return <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md">{error}</div>;
  if (!data) return <Spinner />;

  const cards = [
    { label: 'Boutiques actives', value: data.activeShops },
    { label: 'Produits', value: data.totalProducts },
    { label: 'Commandes', value: data.totalOrders },
    { label: 'Revenu Shopizi (ce mois)', value: <Money xof={data.monthlyRevenueXof.total} /> },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            <p className="text-label-sm text-text-muted uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-headline-md font-headline-md font-bold text-text-main">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <h3 className="text-label-lg font-label-lg text-text-main mb-3">Détail du revenu mensuel</h3>
        <p className="text-body-sm text-text-muted mb-3">Revenus Shopizi = 5% des frais de livraison</p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-text-muted">Commission livraison (5%)</span><span className="font-medium"><Money xof={data.monthlyRevenueXof.deliveryCommissions} /></span></div>
          <div className="flex justify-between"><span className="text-text-muted">Revenu publicitaire</span><span className="font-medium"><Money xof={data.monthlyRevenueXof.adsRevenue} /></span></div>
          <div className="flex justify-between pt-2 border-t border-outline-variant/20"><span className="font-bold text-text-main">Total</span><span className="font-bold text-burkina-green-deep"><Money xof={data.monthlyRevenueXof.total} /></span></div>
        </div>
      </div>
    </div>
  );
}

function ShopsTab() {
  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShops = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/shops', { params: { limit: 100 } });
      setShops(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchShops(); }, []);

  const toggleStatus = async (shop: any) => {
    try {
      const res = await api.patch(`/admin/shops/${shop.id}/status`, { is_published: !shop.is_published });
      setShops(prev => prev.map(s => (s.id === shop.id ? { ...s, is_published: res.data.data.is_published } : s)));
    } catch (err: any) {
      alert(getApiError(err));
    }
  };

  const changePlan = async (shop: any, plan_slug: string) => {
    try {
      await api.patch(`/admin/shops/${shop.id}/plan`, { plan_slug });
      fetchShops();
    } catch (err: any) {
      alert(getApiError(err));
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md">{error}</div>;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-outline-variant/10">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Boutique</th>
              <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Ville</th>
              <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Plan</th>
              <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Statut</th>
              <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
            {shops.map(shop => (
              <tr key={shop.id} className="hover:bg-surface-container-low/20">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="font-bold text-text-main">{shop.name}</p>
                  <p className="text-body-sm text-text-muted">{shop.owner_email}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{shop.city || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={shop.plan_slug || 'free'}
                    onChange={e => changePlan(shop, e.target.value)}
                    className="text-body-sm border border-outline-variant rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 bg-white text-text-main"
                  >
                    {PLAN_OPTIONS.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.is_published ? 'bg-burkina-green-light text-burkina-green-deep' : 'bg-error-container/30 text-error'}`}>
                    {shop.is_published ? 'Active' : 'Désactivée'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleStatus(shop)}
                    className="text-burkina-green-deep hover:underline font-medium text-body-sm"
                  >
                    {shop.is_published ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  const [role, setRole] = useState<'customer' | 'merchant' | 'driver'>('customer');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    api.get('/admin/users', { params: { role, limit: 100 } })
      .then(res => setUsers(res.data.data || []))
      .catch(err => setError(getApiError(err)))
      .finally(() => setIsLoading(false));
  }, [role]);

  const openProfile = async (id: string) => {
    try {
      const res = await api.get(`/admin/users/${id}`);
      setSelected(res.data.data);
    } catch (err: any) {
      alert(getApiError(err));
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['customer', 'merchant', 'driver'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-4 py-2 rounded-full text-label-sm font-label-sm transition-colors ${role === r ? 'bg-burkina-green-deep text-white' : 'bg-surface-container-low text-text-muted hover:text-text-main'}`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : error ? (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md">{error}</div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-outline-variant/10">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Nom</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Téléphone</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Statut</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-low/20">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-main">{u.full_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{u.phone_number || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-burkina-green-light text-burkina-green-deep' : 'bg-error-container/30 text-error'}`}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => openProfile(u.id)} className="text-burkina-green-deep hover:underline font-medium text-body-sm">Voir profil</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted">Aucun utilisateur.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_30px_rgba(0,0,0,0.12)] max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-sm font-headline-sm text-text-main">{selected.full_name || 'Profil'}</h2>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-main">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-text-muted">Email</span><span className="font-medium">{selected.email}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Téléphone</span><span className="font-medium">{selected.phone_number || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Rôle</span><span className="font-medium">{selected.role}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Inscrit le</span><span className="font-medium">{new Date(selected.created_at).toLocaleDateString()}</span></div>
              {selected.shop_name && (
                <div className="flex justify-between"><span className="text-text-muted">Boutique</span><span className="font-medium">{selected.shop_name}</span></div>
              )}
              {selected.driver_id && (
                <>
                  <div className="flex justify-between"><span className="text-text-muted">Statut livreur</span><span className="font-medium">{selected.driver_status}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Livraisons</span><span className="font-medium">{selected.total_deliveries}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Gains</span><span className="font-medium"><Money xof={selected.total_earnings_xof} /></span></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    api.get('/admin/orders', { params: { limit: 100, ...(status ? { status } : {}) } })
      .then(res => setOrders(res.data.data || []))
      .catch(err => setError(getApiError(err)))
      .finally(() => setIsLoading(false));
  }, [status]);

  return (
    <div>
      <div className="mb-4">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-4 py-2 border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 bg-white text-text-main"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : error ? (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md">{error}</div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-outline-variant/10">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">N°</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Boutique</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Client</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Montant</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Statut</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface-container-low/20">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-text-main">{o.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{o.shop_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{o.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted"><Money xof={o.total_amount_xof} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container text-text-muted">
                        {ORDER_STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-sm text-text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-text-muted">Aucune commande.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancesTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/finances')
      .then(res => setData(res.data.data))
      .catch(err => setError(getApiError(err)));
  }, []);

  if (error) return <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md">{error}</div>;
  if (!data) return <Spinner />;

  const rows = [
    { label: 'Commission livraison (5%)', value: data.deliveryCommissionsXof },
    { label: 'Revenu publicitaire', value: data.adsRevenueXof },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] max-w-xl">
      <h3 className="text-label-lg font-label-lg text-text-main mb-1">Finances Shopizi (total cumulé)</h3>
      <p className="text-body-sm text-text-muted mb-4">Revenus Shopizi = 5% des frais de livraison</p>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-text-muted">{r.label}</span>
            <span className="font-medium"><Money xof={r.value} /></span>
          </div>
        ))}
        <div className="flex justify-between pt-3 border-t border-outline-variant/20">
          <span className="font-bold text-text-main">Total</span>
          <span className="font-bold text-burkina-green-deep text-headline-sm"><Money xof={data.totalXof} /></span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div>
      <h1 className="text-headline-sm font-headline-sm text-text-main mb-6">Tableau de bord administrateur</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-label-sm font-label-sm transition-colors ${tab === t.id ? 'bg-burkina-green-deep text-white' : 'bg-surface-container-low text-text-muted hover:text-text-main'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'shops' && <ShopsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'finances' && <FinancesTab />}
    </div>
  );
}
