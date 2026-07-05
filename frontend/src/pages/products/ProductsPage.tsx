import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle, Edit3, Trash2, Search } from 'lucide-react';
import api, { getApiError } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_xof: number;
  stock_quantity: number;
  is_active: boolean;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category_id: '' });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data.data as Product[],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.data as Category[],
  });

  const createMut = useMutation({
    mutationFn: async (data: any) => (await api.post('/products', data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); reset(); setShowForm(false); },
    onError: (err: any) => setError(getApiError(err)),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/products/${id}`, data)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); reset(); setShowForm(false); setEditing(null); },
    onError: (err: any) => setError(getApiError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => await api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (err: any) => setError(getApiError(err)),
  });

  const reset = () => { setForm({ name: '', description: '', price: '', stock: '', category_id: '' }); setError(''); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { name: form.name.trim(), description: form.description.trim() || null, price_xof: Number(form.price), stock_quantity: Number(form.stock), category_id: form.category_id || null };
    if (editing) { updateMut.mutate({ id: editing.id, data }); } else { createMut.mutate(data); }
  };

  const handleEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description || '', price: String(p.price_xof), stock: String(p.stock_quantity), category_id: p.category_id || '' }); setShowForm(true); };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const isSubmitting = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-sm text-text-main">Mes Produits</h1>
          <p className="text-body-md text-text-muted mt-1">{products.length} produit{products.length !== 1 && 's'}</p>
        </div>
        <button onClick={() => { reset(); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg text-label-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </div>

      {error && <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {showForm && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <h3 className="font-headline-sm text-headline-sm text-text-main mb-4">{editing ? 'Modifier' : 'Nouveau'} produit</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="block text-label-lg font-label-lg text-on-surface-variant">Nom</label><input required className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="space-y-2"><label className="block text-label-lg font-label-lg text-on-surface-variant">Prix (XOF)</label><input required type="number" min={0} className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></div>
              <div className="space-y-2"><label className="block text-label-lg font-label-lg text-on-surface-variant">Stock</label><input required type="number" min={0} className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div>
              <div className="space-y-2"><label className="block text-label-lg font-label-lg text-on-surface-variant">Catégorie</label><select className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="md:col-span-2 space-y-2"><label className="block text-label-lg font-label-lg text-on-surface-variant">Description</label><textarea rows={3} className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="flex gap-3 pt-2"><button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-label-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">{isSubmitting ? '...' : editing ? 'Mettre à jour' : 'Enregistrer'}</button><button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 py-3 bg-surface-container-high text-text-main rounded-xl font-label-lg font-bold border border-outline-variant hover:bg-surface-container transition-all">Annuler</button></div>
          </form>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="p-4 border-b border-outline-variant/20 flex items-center gap-2">
          <Search className="w-5 h-5 text-text-muted" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent w-full text-body-md outline-none" />
        </div>
        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full text-left">
              <thead><tr className="border-b border-outline-variant/20 text-label-sm text-text-muted uppercase"><th className="px-6 py-3 font-medium">Produit</th><th className="px-6 py-3 font-medium">Prix</th><th className="px-6 py-3 font-medium">Stock</th><th className="px-6 py-3 font-medium">Action</th></tr></thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 text-body-md font-medium text-text-main">{p.name}</td>
                    <td className="px-6 py-4 text-body-md text-text-muted">{p.price_xof.toLocaleString()} XOF</td>
                    <td className="px-6 py-4 text-body-md text-text-muted">{p.stock_quantity}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-burkina-green-deep hover:bg-burkina-green-light rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => deleteMut.mutate(p.id)} className="p-2 text-error hover:bg-error-container/50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-text-muted text-body-md">
              {search ? 'Aucun produit ne correspond a votre recherche.' : 'Aucun produit ajoute pour le moment.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}