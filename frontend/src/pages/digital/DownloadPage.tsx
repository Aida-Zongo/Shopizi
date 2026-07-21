import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

interface PurchaseInfo {
  payment_status: string;
  download_expires_at: string;
  download_count: number;
  product_name: string;
  file_type: string;
  file_size_bytes: number;
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

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function formatRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export default function DownloadPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PurchaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/digital/purchase/${token}`)
      .then(res => { if (res.data.success) setInfo(res.data.data); })
      .catch(err => setError(getApiError(err)))
      .finally(() => setIsLoading(false));
  }, [token]);

  // Le compte à rebours est la seule info qui change sans action : on le
  // rafraîchit pour que le client ne se fie pas à une valeur figée.
  useEffect(() => {
    if (!info) return;
    const tick = () => setRemaining(formatRemaining(info.download_expires_at));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [info]);

  const handleDownload = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.location.href = `${base}/digital/download/${token}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ShopiziLoader />
      </div>
    );
  }

  const isExpired = info ? remaining === null : false;
  const isPaid = info?.payment_status === 'completed';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center border border-outline-variant/20">
        {error || !info ? (
          <>
            <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[48px] text-error">error</span>
            </div>
            <h1 className="text-2xl font-bold text-text-main mb-2">Lien invalide</h1>
            <p className="text-sm text-text-muted mb-6">{error || 'Ce lien de téléchargement n\'existe pas.'}</p>
            <Link to="/digital" className="inline-block px-6 py-3 bg-burkina-green-deep text-white rounded-xl font-medium">
              Voir les produits digitaux
            </Link>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-burkina-green-light flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {info.cover_image_url ? (
                <img src={info.cover_image_url} alt={info.product_name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[48px] text-burkina-green-deep">
                  {FILE_TYPE_ICONS[info.file_type] || 'draft'}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-text-main mb-1">{info.product_name}</h1>
            <p className="text-sm text-text-muted mb-6">
              {info.shop_name} · {formatSize(info.file_size_bytes)}
            </p>

            {!isPaid ? (
              <div className="bg-surface-container rounded-xl p-4 text-sm text-text-muted">
                Le paiement de cet achat n'est pas encore confirmé. Le téléchargement sera disponible dès sa validation.
              </div>
            ) : isExpired ? (
              <div className="bg-error-container border border-error/20 rounded-xl p-4 text-sm text-error">
                Ce lien de téléchargement a expiré.
              </div>
            ) : (
              <>
                <button
                  onClick={handleDownload}
                  className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold transition-all hover:bg-opacity-90 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">download</span>
                  Télécharger maintenant
                </button>
                <p className="text-sm text-text-main mt-4 font-medium">Temps restant : {remaining}</p>
                <p className="text-xs text-text-muted mt-1">Ce lien expire dans 48h après l'achat</p>
                {info.download_count > 0 && (
                  <p className="text-xs text-text-muted mt-2">Déjà téléchargé {info.download_count} fois</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
