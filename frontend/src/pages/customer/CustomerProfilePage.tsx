import { useState, type FormEvent } from 'react';
import api, { getApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function CustomerProfilePage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const res = await api.put('/auth/me', { full_name: fullName.trim(), phone_number: phoneNumber.trim() });
      if (res.data.success) {
        setUser(res.data.data);
        setSuccess('Profil mis à jour avec succès');
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-headline-sm font-headline-sm text-text-main mb-6">Mon profil</h1>

      {success && (
        <div className="p-3 bg-tertiary-container/30 border border-burkina-green-deep/20 rounded-xl text-tertiary-dark text-body-sm mb-4">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">Nom complet</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">Téléphone</label>
          <input
            type="text"
            required
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">Email</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container text-text-muted cursor-not-allowed"
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-all disabled:opacity-50 text-label-sm font-medium shadow-sm active:scale-95"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
