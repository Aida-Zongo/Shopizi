import { useEffect, useState } from 'react';
import api, { getApiError } from '../../lib/api';
import { AlertCircle } from 'lucide-react';
import StarRating from '../../components/StarRating';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  product_name: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchReviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const res = await api.get(`/reviews${statusParam}`);
      if (res.data.success) {
        setReviews(res.data.data || []);
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await api.patch(`/reviews/${id}/status`, { status });
      if (res.data.success) {
        setReviews(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      }
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
         <ShopiziLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-sm font-headline-sm text-text-main">Avis & Évaluations</h1>
          <p className="text-body-md text-text-muted mt-1">{reviews.length} avis · Note moyenne: {avgRating}/5</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-colors ${filter === f ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-text-muted hover:bg-surface-container'}`}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Rejetés'}
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-8 text-center">
          <p className="text-text-muted text-body-md">Aucun avis pour le moment.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-outline-variant/10">
            {reviews.map(review => (
              <div key={review.id} className="p-6 hover:bg-surface-container-low/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StarRating rating={review.rating} />
                      <span className="text-label-sm text-text-muted">{review.customer_name}</span>
                      <span className="text-label-sm text-text-muted">·</span>
                      <time className="text-label-sm text-text-muted">{new Date(review.created_at).toLocaleDateString()}</time>
                    </div>
                    {review.product_name && (
                      <p className="text-body-sm text-burkina-green-deep mb-2">{review.product_name}</p>
                    )}
                    {review.comment && <p className="text-body-md text-text-main">{review.comment}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-medium ${
                      review.status === 'approved' ? 'bg-tertiary-container/30 text-tertiary-dark' :
                      review.status === 'rejected' ? 'bg-error-container/30 text-error' :
                      'bg-surface-container text-text-muted'
                    }`}>
                      {review.status === 'pending' ? 'En attente' : review.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </div>
                </div>
                {review.status === 'pending' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                    <button
                      onClick={() => handleStatusChange(review.id, 'approved')}
                      className="px-3 py-1.5 bg-tertiary-container/30 text-tertiary-dark rounded-lg text-label-sm hover:bg-tertiary-container/50 transition-colors"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleStatusChange(review.id, 'rejected')}
                      className="px-3 py-1.5 bg-error-container/30 text-error rounded-lg text-label-sm hover:bg-error-container/50 transition-colors"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
