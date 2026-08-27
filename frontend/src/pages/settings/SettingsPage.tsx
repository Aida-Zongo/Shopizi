import { useEffect, useState, type FormEvent } from 'react';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  whatsapp_number: string;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  city_id: string | null;
  neighborhood: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function SettingsPage() {
  const [, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<Partial<Shop>>({});
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);

  const fetchShop = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shops/my');
      if (res.data.success) {
        const data = res.data.data;
        setShop(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          whatsapp_number: data.whatsapp_number || '',
          phone_number: data.phone_number || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          city_id: data.city_id || '',
          neighborhood: data.neighborhood || '',
          primary_color: data.primary_color || '#D97706',
          secondary_color: data.secondary_color || '#92400E',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        });
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
    api.get('/cities').then(res => setCities(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.city_id) {
      setError('Veuillez selectionner votre ville pour que les clients sachent ou vous etes situe.');
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        description: form.description?.trim() || null,
        phone_number: form.phone_number?.trim() || null,
        email: form.email?.trim() || null,
        address: form.address?.trim() || null,
        city: undefined,
        city_id: form.city_id || null,
        neighborhood: form.neighborhood?.trim() || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };

      const res = await api.patch('/shops/my', payload);
      if (res.data.success) {
        setSuccess('Parametres mis a jour avec succes');
        setShop(res.data.data);
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShopiziLoader />
      </div>
    );
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        alert("Position détectée avec succès !");
      },
      (_error) => {
        alert("Impossible de récupérer votre position. Vérifiez vos autorisations.");
      }
    );
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-headline-sm font-headline-sm text-text-main mb-6">Parametres de la boutique</h1>

      {success && (
        <div className="p-3 bg-burkina-green-light border border-burkina-green-deep/20 rounded-xl text-burkina-green-deep text-body-sm mb-4">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Nom de la boutique</label>
            <input
              type="text" required
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">WhatsApp</label>
            <input
              type="text" required
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.whatsapp_number || ''}
              onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-main mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Telephone</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.phone_number || ''}
              onChange={e => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.email || ''}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-text-main">Adresse</label>
              <button
                type="button"
                onClick={handleGetLocation}
                className="text-xs text-burkina-green-deep font-bold hover:underline flex items-center gap-1"
              >
                📍 Détecter ma position GPS
              </button>
            </div>
            <input
              type="text"
              placeholder="Ex: Secteur 15, Ouagadougou"
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.address || ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
            {form.latitude && form.longitude ? (
              <p className="text-xs text-burkina-green-deep mt-1 font-medium">
                ✅ Position GPS enregistrée ({form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}) — les frais de livraison seront calculés précisément.
              </p>
            ) : (
              <p className="text-xs mt-1 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 font-medium">
                ⚠️ Position GPS non configurée. Les frais de livraison affichés aux clients seront estimés (tarif minimum). Cliquez sur "Détecter ma position GPS" puis enregistrez.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Ville <span className="text-error">*</span></label>
            <select
              required
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep bg-white ${form.city_id ? 'border-outline-variant' : 'border-[#ca8a04]'}`}
              value={form.city_id || ''}
              onChange={e => setForm({ ...form, city_id: e.target.value })}
            >
              <option value="">Choisir une ville</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!form.city_id && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#ca8a04' }}>
                <span className="material-symbols-outlined text-[14px]">warning</span>
                Ajoutez votre ville pour que les clients sachent où vous êtes situé
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Quartier</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
              value={form.neighborhood || ''}
              onChange={e => setForm({ ...form, neighborhood: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Couleur principale</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-16 border border-outline-variant rounded-xl cursor-pointer"
                value={form.primary_color || '#D97706'}
                onChange={e => setForm({ ...form, primary_color: e.target.value })}
              />
              <span className="text-sm text-text-muted">{form.primary_color || '#D97706'}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Couleur secondaire</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-16 border border-outline-variant rounded-xl cursor-pointer"
                value={form.secondary_color || '#92400E'}
                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
              />
              <span className="text-sm text-text-muted">{form.secondary_color || '#92400E'}</span>
            </div>
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
