import { useState, useEffect } from 'react';
import api, { getApiError } from '../../lib/api';

interface MerchantDigitalProduct {
  id: string;
  name: string;
  price_xof: number;
  file_type: string;
  file_size_bytes: number;
  cover_image_url: string | null;
  category: string | null;
  total_sales: number;
  ventes: string;
  revenus_xof: string;
}

const CATEGORIES = ['Livre/Roman', 'Formation', 'Musique', 'Design/Graphisme', 'Template', 'Logiciel', 'Autre'];

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  video: 'play_circle',
  audio: 'music_note',
  zip: 'folder_zip',
  image: 'image',
  word: 'description',
};

// Doit rester aligné sur DIGITAL_MAX_FILE_SIZE_MB côté API : au-delà, le
// serveur rejette l'upload après avoir transféré tout le fichier pour rien.
const MAX_FILE_MB = 100;

export default function MerchantDigitalPage() {
  const [products, setProducts] = useState<MerchantDigitalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadProducts = () => {
    setIsLoading(true);
    api.get('/digital/merchant/products')
      .then(res => { if (res.data.success) setProducts(res.data.data || []); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(loadProducts, []);

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setCategory(CATEGORIES[0]);
    setFile(null); setProgress(0); setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setFormError('Le fichier du produit est obligatoire.'); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFormError(`Fichier trop volumineux (max ${MAX_FILE_MB} Mo).`);
      return;
    }
    const priceXof = Number(price);
    if (!priceXof || priceXof <= 0) { setFormError('Prix invalide.'); return; }

    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    form.append('price_xof', String(priceXof));
    form.append('category', category);
    form.append('file', file);

    setIsUploading(true);
    setFormError('');
    try {
      // L'instance api impose Content-Type: application/json, ce qui pousse axios
      // a serialiser le FormData en JSON et a perdre le fichier. On neutralise ce
      // defaut ici : axios laisse alors le navigateur poser le boundary multipart.
      await api.post('/digital/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setShowForm(false);
      resetForm();
      loadProducts();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setIsUploading(false);
    }
  };

  const totalRevenus = products.reduce((sum, p) => sum + Number(p.revenus_xof || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-headline-sm font-headline-sm text-text-main">Produits Digitaux</h1>
          <p className="text-body-md text-text-muted mt-1">
            Vendez vos fichiers en téléchargement instantané · Revenus : {totalRevenus.toLocaleString()} FCFA
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-burkina-green-deep text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Ajouter un produit
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-outline mb-2">cloud_upload</span>
          <h2 className="text-title-lg font-bold text-text-main mb-2">Aucun produit digital</h2>
          <p className="text-body-md text-text-muted">
            Ebook, formation, musique, template : vendez sans stock ni livraison.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-surface-container text-text-muted text-label-sm uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Prix</th>
                <th className="px-4 py-3 font-medium">Ventes</th>
                <th className="px-4 py-3 font-medium text-right">Revenus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {products.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-text-muted">
                          {FILE_TYPE_ICONS[p.file_type] || 'draft'}
                        </span>
                      )}
                      <div>
                        <span className="font-medium text-text-main">{p.name}</span>
                        <span className="block text-xs text-text-muted">{p.category || 'Autre'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{Number(p.price_xof).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-text-muted">{p.ventes}</td>
                  <td className="px-4 py-3 text-right font-medium text-burkina-green-deep">
                    {Number(p.revenus_xof).toLocaleString()} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-headline-sm font-headline-sm">Nouveau produit digital</h2>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-text-muted hover:text-text-main">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3} value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prix (FCFA)</label>
                <input
                  type="number" min={1} required value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select
                  value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:ring-2 focus:ring-burkina-green-deep"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fichier à vendre</label>
                <input
                  type="file" required
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-text-muted"
                />
                <p className="text-xs text-text-muted mt-1">PDF, ZIP, audio, vidéo, Word · max {MAX_FILE_MB} Mo</p>
                <p className="text-xs text-text-muted mt-1">
                  Pour un PDF, la première page sert automatiquement de couverture.
                </p>
              </div>

              {isUploading && (
                <div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-burkina-green-deep transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-text-muted mt-1">Envoi : {progress}%</p>
                </div>
              )}

              {formError && <p className="text-sm text-error">{formError}</p>}

              <button
                type="submit" disabled={isUploading}
                className="w-full py-3 bg-burkina-green-deep text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isUploading ? 'Envoi en cours...' : 'Publier le produit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
