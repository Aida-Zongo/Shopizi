import { useState, useEffect } from 'react';
import api, { getApiError } from '../../lib/api';
import { TrendingUp, Calendar, Bike, DollarSign } from 'lucide-react';
import ShopiziLoader from '../../components/ShopiziLoader';

interface EarningsPeriod {
  period: string;
  date_from: string;
  date_to: string;
  total_deliveries: number;
  total_earnings_xof: number;
  average_per_delivery_xof: number;
  bonus_xof: number;
}

export default function DriverEarningsPage() {
  const [period, setPeriod] = useState('weekly');
  const [earnings, setEarnings] = useState<EarningsPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEarnings = async (selectedPeriod: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/drivers/earnings?period=${selectedPeriod}`);
      if (res.data.success) setEarnings(res.data.data);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings(period);
  }, [period]);

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
        <h1 className="text-headline-sm font-headline-sm text-text-main">Mes Gains</h1>
        <p className="text-body-md text-text-muted mt-1">Suivez vos revenus de livraison</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm mb-4">{error}</div>
      )}

      <div className="flex gap-2">
        {['weekly', 'monthly', 'yearly'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-colors ${
              period === p ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-text-muted hover:bg-surface-container'
            }`}
          >
            {p === 'weekly' ? 'Cette semaine' : p === 'monthly' ? 'Ce mois' : 'Cette année'}
          </button>
        ))}
      </div>

      {earnings ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-6 border-l-4 border-burkina-green-deep">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-on-secondary-container" />
                </div>
                <p className="text-label-lg font-label-lg text-text-muted">Total gains</p>
              </div>
              <h2 className="text-headline-lg font-headline-lg text-burkina-green-deep">{earnings.total_earnings_xof.toLocaleString()} XOF</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-2">
                <Bike className="w-5 h-5 text-secondary" />
                <p className="text-label-lg font-label-lg text-text-muted">Livraisons</p>
              </div>
              <h3 className="text-headline-md font-headline-md text-text-main">{earnings.total_deliveries}</h3>
              <p className="text-body-sm text-text-muted mt-1">{earnings.average_per_delivery_xof.toLocaleString()} XOF / course</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-tertiary-dark" />
                <p className="text-label-lg font-label-lg text-text-muted">Bonus</p>
              </div>
              <h3 className="text-headline-md font-headline-md text-burkina-green-deep">{earnings.bonus_xof.toLocaleString()} XOF</h3>
              <p className="text-body-sm text-text-muted mt-1">Basé sur la performance</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-secondary" />
              <h3 className="text-label-lg font-bold text-text-main">Détail des transactions</h3>
              <span className="text-label-sm text-text-muted">{earnings.date_from} - {earnings.date_to}</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                <div>
                    <p className="text-body-md font-medium text-text-main">Commission livraisons</p>
                    <p className="text-body-sm text-text-muted">{earnings.total_deliveries} livraisons complétées</p>
                </div>
                <span className="text-body-lg font-bold text-burkina-green-deep">+{earnings.total_earnings_xof.toLocaleString()} XOF</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                <div>
                    <p className="text-body-md font-medium text-text-main">Bonus de performance</p>
                    <p className="text-body-sm text-text-muted">Taux de succès et fidélité</p>
                </div>
                <span className="text-body-lg font-bold text-tertiary-dark">+{earnings.bonus_xof.toLocaleString()} XOF</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border-t-2 border-burkina-green-deep">
                <div>
                    <p className="text-body-lg font-bold text-text-main">Total des gains</p>
                    <p className="text-body-sm text-text-muted">{earnings.date_from} - {earnings.date_to}</p>
                </div>
                <span className="text-body-lg font-bold text-burkina-green-deep">{(earnings.total_earnings_xof + earnings.bonus_xof).toLocaleString()} XOF</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-body-md text-text-muted">Pas de données pour cette période.</p>
        </div>
      )}
    </div>
  );
}
