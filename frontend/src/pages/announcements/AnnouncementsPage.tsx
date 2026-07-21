import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Announcement {
  id: string;
  type: 'promo' | 'price' | 'arrival';
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const TYPE_META: Record<Announcement['type'], { label: string; icon: string }> = {
  promo: { label: 'Promotion', icon: 'sell' },
  price: { label: 'Changement de prix', icon: 'payments' },
  arrival: { label: 'Nouvel arrivage', icon: 'inventory_2' },
};

export default function AnnouncementsPage() {
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [type, setType] = useState<Announcement['type']>('promo');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const sub = await api.get('/subscriptions/my');
      const business = sub.data?.data?.subscription?.plan_slug === 'business';
      setIsBusiness(business);
      if (business) {
        const res = await api.get('/announcements/my');
        if (res.data.success) setItems(res.data.data || []);
      }
    } catch (err: any) {
      setError(getApiError(err));
      setIsBusiness(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post('/announcements', { type, title: title.trim(), message: message.trim() });
      if (res.data.success) {
        setItems(prev => [res.data.data, ...prev]);
        setTitle('');
        setMessage('');
        setType('promo');
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: Announcement) => {
    try {
      const res = await api.patch(`/announcements/${item.id}`, { is_active: !item.is_active });
      if (res.data.success) {
        setItems(prev => prev.map(a => (a.id === item.id ? { ...a, is_active: !item.is_active } : a)));
      }
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/announcements/${id}`);
      if (res.data.success) setItems(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShopiziLoader />
      </div>
    );
  }

  if (!isBusiness) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-sm font-headline-sm text-text-main">Annonces</h1>
          <p className="text-body-md text-text-muted mt-1">Prevenez vos clients de vos promos, changements de prix et arrivages.</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">lock</span>
          <h2 className="text-title-md font-bold text-text-main mb-2">Fonctionnalite reservee au plan Business</h2>
          <p className="text-body-md text-text-muted mb-5 max-w-md mx-auto">
            Publiez des annonces (promotions, changements de prix, nouveaux arrivages) affichees sur votre boutique pour tous vos clients. Disponible avec le plan Business.
          </p>
          <Link
            to="/upgrade"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-label-lg transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: '#ca8a04' }}
          >
            <span className="material-symbols-outlined">workspace_premium</span>
            Passer au plan Business
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-sm font-headline-sm text-text-main">Annonces</h1>
        <p className="text-body-md text-text-muted mt-1">Vos annonces actives s'affichent en bandeau sur votre boutique.</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_META) as Announcement['type'][]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm font-medium transition-colors ${type === t ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-text-muted hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{TYPE_META[t].icon}</span>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Titre de l'annonce (ex: -20% ce week-end)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={150}
          className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep bg-white"
        />
        <textarea
          placeholder="Message a vos clients..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep bg-white resize-none"
        />
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !message.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-burkina-green-deep text-white rounded-xl font-bold text-label-lg transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          Publier l'annonce
        </button>
      </form>

      {items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-text-muted text-body-md">Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-outline-variant/10">
            {items.map(item => (
              <div key={item.id} className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-secondary-container text-[20px]">{TYPE_META[item.type].icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-label-sm text-burkina-green-deep font-medium">{TYPE_META[item.type].label}</span>
                    <span className="text-label-sm text-text-muted">·</span>
                    <time className="text-label-sm text-text-muted">{new Date(item.created_at).toLocaleDateString()}</time>
                    <span className={`px-2 py-0.5 rounded-full text-label-sm font-medium ${item.is_active ? 'bg-tertiary-container/30 text-tertiary-dark' : 'bg-surface-container text-text-muted'}`}>
                      {item.is_active ? 'Active' : 'Masquee'}
                    </span>
                  </div>
                  <p className="text-body-lg font-bold text-text-main">{item.title}</p>
                  <p className="text-body-md text-text-main mt-1 whitespace-pre-wrap">{item.message}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    title={item.is_active ? 'Masquer' : 'Afficher'}
                    className="p-2 rounded-lg text-text-muted hover:bg-surface-container hover:text-burkina-green-deep transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.is_active ? 'visibility_off' : 'visibility'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Supprimer"
                    className="p-2 rounded-lg text-text-muted hover:bg-error-container/50 hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
