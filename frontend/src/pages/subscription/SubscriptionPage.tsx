import { useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly_xof: number;
  max_products: number;
  max_categories: number;
  storage_mb: number;
  custom_domain: boolean;
  remove_branding: boolean;
  priority_support: boolean;
}

interface SubscriptionData {
  subscription: {
    plan_name: string;
    status: string;
    ends_at: string;
  };
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/subscriptions/plans').catch(() => null),
        api.get('/subscriptions/my').catch(() => null),
      ]);
      if (plansRes?.data?.success) setPlans(plansRes.data.data || []);
      if (subRes?.data?.success) setCurrent(subRes.data.data);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setActionLoading(true);
    try {
      const res = await api.post('/subscriptions/subscribe', { plan_id: planId });
      if (res.data.success) {
        alert('Abonnement mis a jour avec succes');
        fetchData();
      }
    } catch (err: any) {
      alert(getApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

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
        <h1 className="text-headline-sm font-headline-sm text-text-main">Abonnement</h1>
        <p className="text-body-md text-text-muted mt-1">Gerez votre plan et vos avantages</p>
      </div>

      {error && <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {current?.subscription && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <h2 className="text-headline-sm font-headline-sm text-text-main mb-2">Abonnement actuel</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-md text-text-muted">Plan : <span className="font-bold text-text-main">{current.subscription.plan_name}</span></p>
              <p className="text-label-sm text-text-muted mt-1">Statut : {current.subscription.status}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-surface-container-lowest rounded-xl border-2 p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex flex-col ${current?.subscription.plan_name === plan.name ? 'border-burkina-green-deep' : 'border-outline-variant/20'}`}>
            <h3 className="text-headline-sm font-headline-sm text-text-main">{plan.name}</h3>
            <p className="text-headline-lg font-headline-lg text-burkina-green-deep mt-2">{plan.price_monthly_xof.toLocaleString()} <span className="text-label-lg font-normal text-text-muted">XOF/mois</span></p>
            {plan.description && <p className="text-body-md text-text-muted mb-4">{plan.description}</p>}
            <ul className="mt-4 space-y-3 text-body-md text-text-muted flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> {plan.max_products} produits max</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> {plan.max_categories} categories max</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> {plan.storage_mb} Mo de stockage</li>
              {plan.custom_domain && <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> Domaine personnalise</li>}
              {plan.remove_branding && <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> Sans marque Shopizi</li>}
              {plan.priority_support && <li className="flex items-center gap-2"><Check className="w-4 h-4 text-burkina-green-deep" /> Support prioritaire</li>}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={actionLoading || current?.subscription.plan_name === plan.name}
              className="mt-6 w-full px-4 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-label-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {current?.subscription.plan_name === plan.name ? 'Plan actuel' : 'Choisir'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
