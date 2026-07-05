import { useState, useEffect } from 'react';
import api, { getApiError } from '../../lib/api';
import { MapPin, Phone, Package, Loader2, CheckCircle, XCircle, Navigation } from 'lucide-react';

interface Delivery {
  id: string;
  order_number: string;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  customer_name: string;
  delivery_address: string;
  customer_phone: string;
  total_amount_xof: number;
  distance_km: number | null;
  status: string;
  driver_notes: string | null;
}

export default function DriverDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/delivery/my');
      if (res.data.success) setDeliveries(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleStatusUpdate = async (deliveryId: string, newStatus: string) => {
    setActionId(deliveryId);
    try {
      const res = await api.patch(`/delivery/${deliveryId}/status`, { status: newStatus });
      if (res.data.success) {
        setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, ...res.data.data } : d));
        setTimeout(fetchDeliveries, 500);
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-burkina-green-deep animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-sm font-headline-sm text-text-main">Mes Livraisons</h1>
        <p className="text-body-md text-text-muted mt-1">Gérer vos prises en charge et livraisons</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm mb-4">{error}</div>
      )}

      {deliveries.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-text-muted text-body-md">Aucune livraison en cours.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map(delivery => (
            <div key={delivery.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                      <Package className="w-5 h-5 text-on-secondary-container" />
                    </div>
                    <div>
                      <h3 className="text-body-lg font-bold text-text-main">Commande #{delivery.order_number}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium ${
                        delivery.status === 'driver_assigned' ? 'bg-secondary-container/30 text-on-secondary-container' :
                        delivery.status === 'in_transit' ? 'bg-burkina-green-light text-burkina-green-deep' :
                        'bg-surface-container text-text-muted'
                      }`}>
                        {delivery.status === 'driver_assigned' ? 'Assignée' :
                         delivery.status === 'in_transit' ? 'En cours' :
                         delivery.status === 'at_destination' ? 'Arrivé' : delivery.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-surface-container-low rounded-lg">
                      <p className="text-label-sm text-text-muted mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Boutique</p>
                      <p className="text-body-sm font-medium text-text-main">{delivery.shop_name}</p>
                      <p className="text-body-sm text-text-muted">{delivery.shop_address}</p>
                      <p className="text-body-sm text-burkina-green-deep mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{delivery.shop_phone}</p>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-lg">
                      <p className="text-label-sm text-text-muted mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Client</p>
                      <p className="text-body-sm font-medium text-text-main">{delivery.customer_name}</p>
                      <p className="text-body-sm text-text-muted">{delivery.delivery_address}</p>
                      <p className="text-body-sm text-text-muted mt-1">{delivery.total_amount_xof.toLocaleString()} XOF</p>
                    </div>
                  </div>
                  {delivery.driver_notes && (
                    <p className="mt-3 text-body-sm text-text-muted bg-saffron-glow/30 p-2 rounded-lg">Note: {delivery.driver_notes}</p>
                  )}
                </div>
                <div className="flex flex-row md:flex-col gap-2 justify-end">
                  {delivery.status === 'driver_assigned' && (
                    <button
                      onClick={() => handleStatusUpdate(delivery.id, 'in_transit')}
                      disabled={actionId === delivery.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Navigation className="w-4 h-4" />
                      {actionId === delivery.id ? 'Chargement...' : 'Débuter la livraison'}
                    </button>
                  )}
                  {delivery.status === 'in_transit' && (
                    <button
                      onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                      disabled={actionId === delivery.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-burkina-green-deep text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionId === delivery.id ? 'Livraison...' : 'Confirmer livraison'}
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate(delivery.id, 'cancelled_by_driver')}
                    disabled={actionId === delivery.id}
                    className="flex items-center gap-2 px-4 py-2.5 border border-error/20 text-error rounded-xl font-medium hover:bg-error-container/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
