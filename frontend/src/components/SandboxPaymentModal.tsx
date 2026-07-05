import { useState } from 'react';
import api, { getApiError } from '../lib/api';

interface SandboxPaymentModalProps {
  transactionId: string;
  description: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function SandboxPaymentModal({
  transactionId,
  description,
  amount,
  onSuccess,
  onClose,
}: SandboxPaymentModalProps) {
  const [loading, setLoading] = useState<'completed' | 'failed' | null>(null);
  const [error, setError] = useState('');

  const simulate = async (status: 'completed' | 'failed') => {
    setLoading(status);
    setError('');
    try {
      await api.post(`/payments/sandbox/confirm/${transactionId}`, { status });
      if (status === 'completed') {
        onSuccess();
      } else {
        setError('Paiement simulé comme échoué.');
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-headline-sm font-headline-sm">🧪 Mode Test</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-main">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <p className="text-body-md text-text-muted mb-4">
            Paiement en mode simulation (sandbox). Aucune vraie transaction n'a lieu.
          </p>

          <div className="bg-surface-container rounded-xl p-4 mb-4 space-y-1">
            <p className="text-sm text-text-main">{description}</p>
            <p className="text-lg font-bold text-burkina-green-deep">{amount.toLocaleString()} FCFA</p>
            <p className="text-xs text-text-muted break-all">ID transaction : {transactionId}</p>
          </div>

          {error && (
            <div className="bg-error-container border border-error/20 rounded-xl p-3 mb-4 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => simulate('completed')}
              disabled={loading !== null}
              className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold disabled:opacity-50"
            >
              {loading === 'completed' ? 'Simulation...' : '✅ Simuler paiement réussi'}
            </button>
            <button
              onClick={() => simulate('failed')}
              disabled={loading !== null}
              className="w-full py-3 bg-white border border-error text-error rounded-xl font-bold disabled:opacity-50"
            >
              {loading === 'failed' ? 'Simulation...' : '❌ Simuler paiement échoué'}
            </button>
            <button
              onClick={onClose}
              disabled={loading !== null}
              className="w-full py-2.5 text-text-muted font-medium disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
