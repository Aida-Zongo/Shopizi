import { useState, useEffect } from 'react';
import api, { getApiError } from '../../lib/api';
import { MapPin, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import ShopiziLoader from '../../components/ShopiziLoader';

interface DeliveryHistory {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  created_at: string;
  status: string;
  driver_earnings_xof: number;
  distance_km: number | null;
}

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/delivery/my/history');
      if (res.data.success) setHistory(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livrée';
      case 'cancelled_by_client': return 'Annulée (client)';
      case 'cancelled_by_driver': return 'Annulée (moi)';
      case 'cancelled_by_system': return 'Annulée (système)';
      default: return status;
    }
  };

  const isSuccess = (status: string) => status === 'delivered';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShopiziLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-sm font-headline-sm text-text-main">Historique des livraisons</h1>
        <p className="text-body-md text-text-muted mt-1">Vos courses passées et leur statut</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm mb-4">{error}</div>
      )}

      {history.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-body-md text-text-muted">Aucune livraison dans l'historique.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-outline-variant/10">
            {history.map(item => (
              <div key={item.id} className="p-5 hover:bg-surface-container-low/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-body-md font-bold text-text-main">Commande #{item.order_number}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium ${
                        isSuccess(item.status) ? 'bg-tertiary-container/30 text-tertiary-dark' :
                        'bg-error-container/30 text-error'
                      }`}>
                        {isSuccess(item.status) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                  <span className="text-body-sm font-medium text-burkina-green-deep">+{Number(item.driver_earnings_xof || 0).toLocaleString()} XOF</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 text-body-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.customer_name} — {item.delivery_address}</span>
                  </div>
                  <span className="hidden md:block">·</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="hidden md:block">·</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.distance_km ? `${item.distance_km} km` : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
