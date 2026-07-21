import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

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
  shop_name: string;
  shop_subdomain: string;
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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const res = await api.get(`/customer/orders/${order.id}`);
      if (res.data.success) setSelectedOrder(res.data.data);
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/customer/orders');
        if (res.data.success) setOrders(res.data.data || []);
      } catch (err: any) {
        setError(getApiError(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShopiziLoader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-headline-sm font-headline-sm text-text-main mb-6">Mes commandes</h1>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-md mb-4">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-text-muted">Vous n'avez pas encore passé de commande.</p>
          <Link to="/marketplace" className="inline-block mt-3 text-burkina-green-deep hover:underline font-medium">
            Découvrir les boutiques
          </Link>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-outline-variant/10">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">N°</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Boutique</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Montant</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Statut</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-label-sm text-text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-surface-container-low/20">
                    <td className="px-6 py-4 whitespace-nowrap text-body-md font-bold text-text-main">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{order.shop_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md text-text-muted">{order.total_amount_xof} XOF</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-surface-container text-text-muted'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-sm text-text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-md">
                      <button
                        onClick={() => openDetails(order)}
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
              <div className="flex justify-between"><span className="text-text-muted">Boutique</span><span className="font-medium">{selectedOrder.shop_name}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Montant</span><span className="font-medium">{selectedOrder.total_amount_xof} XOF</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Date</span><span className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Statut</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status] || 'bg-surface-container text-text-muted'}`}>
                  {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="pt-2 border-t border-outline-variant/20">
                  <p className="text-text-muted mb-2">Articles</p>
                  {selectedOrder.items.map(item => (
                    <div key={item.product_id} className="flex justify-between text-sm py-1">
                      <span>{item.quantity} × {item.product_name}</span>
                      <span className="font-medium">{item.line_total_xof} XOF</span>
                    </div>
                  ))}
                </div>
              )}
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
