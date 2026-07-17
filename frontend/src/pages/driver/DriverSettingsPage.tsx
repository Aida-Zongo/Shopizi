import { useEffect, useState, type FormEvent } from 'react';
import api, { getApiError } from '../../lib/api';

interface DriverProfile {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  city_name: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  status: string;
  avg_rating: number;
  total_deliveries: number;
  balance_xof: number;
}

const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto' },
  { value: 'tricycle', label: 'Tricycle' },
  { value: 'voiture', label: 'Voiture' },
  { value: 'camionette', label: 'Camionnette' },
  { value: 'bicycle', label: 'Vélo' },
  { value: 'a_pied', label: 'À pied' },
];

export default function DriverSettingsPage() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    city_name: '',
    vehicle_type: 'moto',
    vehicle_plate: '',
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const profileRes = await api.get('/auth/me');
      if (profileRes.data.success) {
        const u = profileRes.data.data;
        setForm({
          full_name: u.full_name || '',
          phone_number: u.phone_number || '',
          email: u.email || '',
          city_name: u.driver_city_name || '',
          vehicle_type: u.driver_vehicle_type || 'moto',
          vehicle_plate: u.driver_vehicle_plate || '',
        });
        // Build a minimal profile from flat fields
        setProfile({
          id: u.driver_id || '',
          full_name: u.full_name || '',
          phone_number: u.phone_number || '',
          email: u.email || null,
          city_name: u.driver_city_name || '',
          vehicle_type: u.driver_vehicle_type || 'moto',
          vehicle_plate: u.driver_vehicle_plate || null,
          status: u.driver_status || 'pending',
          avg_rating: parseFloat(u.driver_rating) || 0,
          total_deliveries: u.driver_total_deliveries || 0,
          balance_xof: u.driver_balance || 0,
        });
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      // Update user profile
      await api.patch('/auth/profile', {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
      });
      setSuccess('Profil mis à jour avec succès !');
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-headline-sm font-headline-sm text-text-main">Paramètres du profil</h1>

      {/* Status badge */}
      <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        <div className={`w-3 h-3 rounded-full ${
          profile?.status === 'approved' ? 'bg-green-500' :
          profile?.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
        } animate-pulse`} />
        <div>
          <p className="text-label-md font-medium text-text-main">
            Statut du compte : {' '}
            <span className={`font-bold ${
              profile?.status === 'approved' ? 'text-green-600' :
              profile?.status === 'pending' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {profile?.status === 'approved' ? 'Approuvé ✓' :
               profile?.status === 'pending' ? 'En attente de validation' :
               profile?.status || 'Inconnu'}
            </span>
          </p>
          {profile?.status === 'pending' && (
            <p className="text-xs text-text-muted mt-1">
              Votre compte est en cours de validation par l'administrateur. Vous pourrez recevoir des livraisons dès approbation.
            </p>
          )}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-center">
          <p className="text-headline-sm font-bold text-burkina-green-deep">{profile?.total_deliveries || 0}</p>
          <p className="text-xs text-text-muted">Livraisons</p>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-center">
          <p className="text-headline-sm font-bold text-secondary">
            {profile?.avg_rating ? Number(profile.avg_rating).toFixed(1) : '—'}
          </p>
          <p className="text-xs text-text-muted">Note <span className="material-symbols-outlined text-[12px] inline-block align-middle">star</span></p>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-center">
          <p className="text-headline-sm font-bold text-burkina-green-deep">
            {(profile?.balance_xof || 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-muted">Solde (FCFA)</p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-burkina-green-light border border-burkina-green-deep/20 rounded-xl text-burkina-green-deep text-body-sm">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 space-y-4">
        <h2 className="text-title-md font-semibold text-text-main mb-2">Informations personnelles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Nom complet</label>
            <input
              type="text" required
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Téléphone</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.phone_number}
              onChange={e => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Email</label>
            <input
              type="email"
              disabled
              className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container text-text-muted cursor-not-allowed"
              value={form.email}
            />
            <p className="text-xs text-text-muted mt-1">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Ville de service</label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container text-text-muted cursor-not-allowed"
              value={form.city_name}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Type de véhicule</label>
            <select
              disabled
              className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container text-text-muted cursor-not-allowed"
              value={form.vehicle_type}
            >
              {VEHICLE_TYPES.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">Contactez l'admin pour changer votre véhicule</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Plaque d'immatriculation</label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container text-text-muted cursor-not-allowed"
              value={form.vehicle_plate}
              placeholder="Non renseignée"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-all disabled:opacity-50 text-label-sm font-medium shadow-sm active:scale-95"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
