import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import SandboxPaymentModal from '../../components/SandboxPaymentModal';

interface DigitalProduct {
  id: string;
  name: string;
  description: string | null;
  price_xof: number;
  file_type: string;
  cover_image_url: string | null;
  category: string | null;
  total_sales: number;
  shop_name: string;
}

const CATEGORIES = ['Tous', 'Livres', 'Formations', 'Musique', 'Design', 'Autres'];

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  video: 'play_circle',
  audio: 'music_note',
  zip: 'folder_zip',
  image: 'image',
  word: 'description',
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  video: 'VIDÉO',
  audio: 'AUDIO',
  zip: 'ZIP',
  image: 'IMAGE',
  word: 'WORD',
};

export default function DigitalMarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [category, setCategory] = useState('Tous');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ transactionId: string; amount: number; description: string; token?: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get('/digital/marketplace', { params: { category } })
      .then(res => { if (res.data.success) setProducts(res.data.data || []); })
      .catch(err => setError(getApiError(err)))
      .finally(() => setIsLoading(false));
  }, [category]);

  const handleBuy = async (product: DigitalProduct) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBuying(product.id);
    setError('');
    try {
      const res = await api.post(`/digital/${product.id}/purchase`, {});
      const { payment: pay, download_token } = res.data.data;
      if (pay.mode === 'sandbox') {
        setPayment({
          transactionId: pay.transaction_id,
          amount: product.price_xof,
          description: `Produit digital — ${product.name}`,
          token: download_token,
        });
      } else if (pay.payment_url) {
        window.location.href = pay.payment_url;
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBuying(null);
    }
  };

  // Après paiement, le lien de téléchargement est immédiatement utilisable :
  // c'est tout l'intérêt du digital face à une livraison physique.
  const handlePaymentSuccess = () => {
    const token = payment?.token;
    setPayment(null);
    navigate(token ? `/download/${token}` : '/purchases');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-headline-md font-headline-md text-text-main">Produits Digitaux</h1>
        <p className="text-body-lg text-text-muted mt-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-burkina-green-deep">bolt</span>
          Livraison instantanée
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              category === cat
                ? 'bg-burkina-green-deep text-white'
                : 'bg-surface-container text-text-muted hover:text-burkina-green-deep'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-error-container border border-error/20 rounded-xl p-3 mb-6 text-sm text-error">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-outline mb-2">cloud_download</span>
          <h2 className="text-title-lg font-bold text-text-main mb-2">Aucun produit digital</h2>
          <p className="text-body-md text-text-muted">
            {category === 'Tous' ? 'Revenez bientôt, les premiers produits arrivent.' : `Aucun produit dans la catégorie ${category}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm flex flex-col">
              <div className="relative h-40 bg-surface-container flex items-center justify-center">
                {p.cover_image_url ? (
                  // object-contain : la couverture est la page 1 du document, en
                  // portrait dans une carte en paysage. object-cover la rognerait
                  // jusqu'a n'en montrer que le milieu, titre compris.
                  <img src={p.cover_image_url} alt={p.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-[56px] text-outline">
                    {FILE_TYPE_ICONS[p.file_type] || 'draft'}
                  </span>
                )}
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded-full">
                  {FILE_TYPE_LABELS[p.file_type] || p.file_type.toUpperCase()}
                </span>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-text-main line-clamp-2">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1">{p.shop_name}</p>
                <p className="text-xs text-text-muted mt-2">
                  {p.total_sales > 0 ? `${p.total_sales} ${p.total_sales > 1 ? 'ventes' : 'vente'}` : 'Nouveau'}
                </p>

                <div className="mt-auto pt-4">
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={buying === p.id}
                    className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-opacity-90"
                  >
                    {buying === p.id ? 'Initialisation...' : `Acheter — ${Number(p.price_xof).toLocaleString()} FCFA`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
