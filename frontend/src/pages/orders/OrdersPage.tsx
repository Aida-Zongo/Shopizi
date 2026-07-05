import { useEffect, useState } from 'react';
import api, { getApiError } from '../../lib/api';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_xof: number;
  line_total_xof: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount_xof: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  confirmed: 'Confirmé',
  processing: 'En traitement',
  ready: 'Prêt',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-primary-container/30 text-primary-dark',
  confirmed: 'bg-burkina-green-light text-burkina-green-deep',
  processing: 'bg-secondary-container/30 text-on-secondary-container',
  ready: 'bg-tertiary-container/30 text-tertiary-dark',
  delivered: 'bg-burkina-green-light/50 text-burkina-green-deep',
  completed: 'bg-surface-container text-text-muted',
  cancelled: 'bg-error-container/30 text-error',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err: any) {
      alert(getApiError(err));
    }
  };

  const filtered = orders.filter(o =>
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-sm font-headline-sm text-text-main">Commandes</h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une commande..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
        />
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md mb-4">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-text-muted">
            {search ? `Aucun résultat pour "${search}"` : 'Aucune commande pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant/10">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">N°</th>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Client</th>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Montant</th>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Statut</th>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-surface-container-low/20">
                  <td className="px-6 py-4 whitespace-nowrap text-body-md font-bold text-text-main">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{order.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{order.total_amount_xof} XOF</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-surface-container text-text-muted'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-sm text-text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-md">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-burkina-green-deep hover:underline font-medium"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_30px_rgba(0,0,0,0.12)] max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-sm font-headline-sm text-text-main">Commande {selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-text-muted hover:text-text-main transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-text-muted">Client</span><span className="font-medium">{selectedOrder.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Téléphone</span><span className="font-medium">{selectedOrder.customer_phone}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Montant</span><span className="font-medium">{selectedOrder.total_amount_xof} XOF</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Date</span><span className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Statut</span>
                <select
                  value={selectedOrder.status}
                  onChange={e => handleStatusChange(selectedOrder.id, e.target.value)}
                  className="text-body-sm border border-outline-variant rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep bg-white text-text-main"
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-surface-container-high text-text-main rounded-xl hover:bg-surface-container transition-colors text-label-sm font-medium border border-outline-variant/20"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
