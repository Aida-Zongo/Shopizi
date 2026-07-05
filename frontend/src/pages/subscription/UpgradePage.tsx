import { useEffect, useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import SandboxPaymentModal from '../../components/SandboxPaymentModal';

const plans = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    features: ['1 Boutique', '10 Produits maximum', 'Support standard', 'Visibilité locale'],
    isPopular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 7500,
    features: ['1 Boutique', 'Produits illimités', 'Badge Pro', 'Support prioritaire', 'Publicité (accès aux Ads)'],
    isPopular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 20000,
    features: ['Multi-boutiques', 'Produits illimités', 'Badge VIP doré', 'Gestion d\'équipe', 'Statistiques avancées', 'Priorité absolue sur Ads'],
    isPopular: false,
  }
];

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ transactionId: string; amount: number; description: string } | null>(null);

  useEffect(() => {
    api.get('/shops/my').then(res => setShopId(res.data.data?.id || null)).catch(() => setShopId(null));
  }, []);

  const handleUpgrade = async (planId: string, price: number) => {
    if (price === 0) return; // Already on free or handled differently
    if (!shopId) {
      alert('Boutique introuvable.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/payments/initiate', {
        type: 'subscription',
        amount: price,
        shop_id: shopId,
        metadata: { shop_id: shopId, plan_slug: planId },
      });

      const { mode, transaction_id, payment_url } = res.data.data;
      if (mode === 'sandbox') {
        setPayment({ transactionId: transaction_id, amount: price, description: `Abonnement ${planId}` });
      } else if (payment_url) {
        window.location.href = payment_url;
      } else {
        alert('Erreur lors de l\'initialisation du paiement.');
      }
    } catch (error) {
      alert(getApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPayment(null);
    alert('Paiement réussi ! Votre plan a été mis à jour.');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-body-md">
      <div className="text-center mb-12">
        <h1 className="text-headline-lg font-headline-lg text-text-main mb-4">Passez à la vitesse supérieure</h1>
        <p className="text-body-lg text-text-muted">
          Débloquez toutes les fonctionnalités de Kèra et du système publicitaire pour propulser vos ventes.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`relative rounded-3xl p-8 border ${
              plan.isPopular 
                ? 'bg-burkina-green-deep text-white border-transparent shadow-xl transform md:-translate-y-4' 
                : 'bg-surface-container border-outline-variant/30'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full text-label-sm font-bold uppercase tracking-wider">
                Le plus choisi
              </div>
            )}
            
            <h3 className={`text-headline-md font-bold mb-2 ${plan.isPopular ? 'text-white' : 'text-text-main'}`}>
              {plan.name}
            </h3>
            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
              <span className={`ml-2 ${plan.isPopular ? 'text-white/80' : 'text-text-muted'}`}>FCFA / mois</span>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className={`w-5 h-5 flex-shrink-0 ${plan.isPopular ? 'text-secondary-fixed' : 'text-burkina-green-deep'}`} />
                  <span className={plan.isPopular ? 'text-white/90' : 'text-text-main'}>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.id, plan.price)}
              disabled={isLoading || plan.price === 0}
              className={`w-full py-4 rounded-xl font-label-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                plan.isPopular
                  ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90'
                  : plan.price === 0
                  ? 'bg-surface-container-high text-text-muted cursor-not-allowed'
                  : 'bg-burkina-green-deep text-white hover:bg-opacity-90'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : plan.price === 0 ? (
                'Plan actuel'
              ) : (
                <>
                  Payer via Orange Money <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

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
