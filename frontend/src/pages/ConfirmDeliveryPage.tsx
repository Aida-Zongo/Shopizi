import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';

export default function ConfirmDeliveryPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  // React StrictMode double-fires effects in dev; the second POST would hit a
  // cleared token and flip success into error
  const hasConfirmed = useRef(false);

  useEffect(() => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;

    if (!orderId || !token) {
      setStatus('error');
      setErrorMessage('Lien de confirmation invalide.');
      return;
    }

    api.post(`/orders/${orderId}/confirm-delivery`, { token })
      .then(res => {
        if (res.data.success) setStatus('success');
        else {
          setStatus('error');
          setErrorMessage('Réponse inattendue du serveur.');
        }
      })
      .catch(err => {
        setStatus('error');
        const errData = err.response?.data?.error;
        setErrorMessage(errData?.message || errData || 'Impossible de confirmer la livraison. Le lien a peut-être déjà été utilisé.');
      });
  }, [orderId, token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F7F2' }}>
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center border border-[#D6E9E2]">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-[#0A504A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#0A504A] mb-2">Confirmation en cours...</h1>
            <p className="text-sm text-gray-500">Veuillez patienter pendant que nous confirmons votre livraison.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-[#D6E9E2] flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[48px]" style={{ color: '#0A504A' }}>check_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0A504A] mb-2">Livraison confirmée !</h1>
            <p className="text-sm text-gray-600 mb-6">
              Merci d'avoir confirmé la réception de votre commande. Le livreur et le commerçant ont été notifiés.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-[#0A504A] text-white rounded-xl font-medium"
            >
              Retour à l'accueil
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[48px] text-red-500">error</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0A504A] mb-2">Confirmation impossible</h1>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-[#0A504A] text-white rounded-xl font-medium"
            >
              Retour à l'accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
