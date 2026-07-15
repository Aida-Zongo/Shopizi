import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

interface Purchase {
  id: string;
  amount_paid: number;
  download_token: string;
  download_expires_at: string;
  download_count: number;
  payment_status: string;
  created_at: string;
  product_name: string;
  file_type: string;
  cover_image_url: string | null;
  shop_name: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  video: 'play_circle',
  audio: 'music_note',
  zip: 'folder_zip',
  image: 'image',
  word: 'description',
};

export default function MyPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/digital/my-purchases')
      .then(res => { if (res.data.success) setPurchases(res.data.data || []); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-headline-md font-headline-md text-text-main mb-1">Mes Achats Digitaux</h1>
      <p className="text-body-md text-text-muted mb-8">Vos fichiers achetés et leurs liens de téléchargement</p>

      {purchases.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-outline mb-2">cloud_download</span>
          <h2 className="text-title-lg font-bold text-text-main mb-2">Aucun achat digital</h2>
          <p className="text-body-md text-text-muted mb-6">Ebooks, formations, musique : téléchargement immédiat après paiement.</p>
          <Link to="/digital" className="inline-block px-6 py-3 bg-burkina-green-deep text-white rounded-xl font-medium">
            Découvrir les produits digitaux
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => {
            const isExpired = new Date(p.download_expires_at) < new Date();
            const isPaid = p.payment_status === 'completed';
            const disponible = isPaid && !isExpired;
            return (
              <div key={p.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-text-muted">
                      {FILE_TYPE_ICONS[p.file_type] || 'draft'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text-main truncate">{p.product_name}</h3>
                  <p className="text-sm text-text-muted">
                    {p.shop_name} · {new Date(p.created_at).toLocaleDateString('fr-FR')} · {Number(p.amount_paid).toLocaleString()} FCFA
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    disponible ? 'bg-green-100 text-green-700'
                    : !isPaid ? 'bg-surface-container text-text-muted'
                    : 'bg-error-container text-error'
                  }`}>
                    {disponible ? 'Disponible' : !isPaid ? 'En attente' : 'Expiré'}
                  </span>
                  {disponible && (
                    <Link
                      to={`/download/${p.download_token}`}
                      className="flex items-center gap-1 px-4 py-2 bg-burkina-green-deep text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Télécharger
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
