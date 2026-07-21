import { useEffect, useState, type FormEvent } from 'react';
import api, { getApiError } from '../../lib/api';
import ShopiziLoader from '../../components/ShopiziLoader';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setEditingId(null);
    setFormError('');
  };

  const handleEdit = (cat: Category) => {
    setForm({ name: cat.name, description: cat.description || '' });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };

      let res;
      if (editingId) {
        res = await api.put(`/categories/${editingId}`, payload);
      } else {
        res = await api.post('/categories', payload);
      }

      if (res.data.success) {
        await fetchCategories();
        resetForm();
        setShowForm(false);
      }
    } catch (err: any) {
      setFormError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      alert(getApiError(err));
    }
  };

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
          <h1 className="text-headline-sm font-headline-sm text-text-main">Catégories</h1>
          <p className="text-body-md text-text-muted mt-1">{categories.length} catégorie{categories.length !== 1 && 's'}</p>
        </div>
        <button
          onClick={() => {
            if (showForm) resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-colors text-sm font-medium"
        >
          {showForm ? 'Annuler' : 'Ajouter une catégorie'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 mb-6 space-y-4">
          <h3 className="font-headline-sm text-text-main">{editingId ? 'Modifier' : 'Nouvelle catégorie'}</h3>
          {formError && (
            <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Nom</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Description</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm mb-4">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          {categories.length > 0 ? (
            <table className="min-w-full divide-y divide-outline-variant/10">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Produits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">{cat.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{cat.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{cat.product_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-burkina-green-deep hover:underline font-medium mr-4"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-error hover:underline font-medium"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-text-muted text-body-md">
              Aucune catégorie pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
