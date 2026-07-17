import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { X } from 'lucide-react';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Tableau de Bord' },
  { to: '/products', icon: 'inventory_2', label: 'Produits' },
  { to: '/categories', icon: 'category', label: 'Catégories' },
  { to: '/orders', icon: 'shopping_cart', label: 'Commandes' },
  { to: '/digital', icon: 'cloud_download', label: 'Produits Digitaux' },
  { to: '/chat', icon: 'chat', label: 'Messages' },
  { to: '/reviews', icon: 'star', label: 'Avis' },
  { to: '/ads', icon: 'campaign', label: 'Publicités' },
  { to: '/subscription', icon: 'loyalty', label: 'Abonnement' },
  { to: '/settings', icon: 'settings', label: 'Paramètres' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [plan, setPlan] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    if (user?.role !== 'merchant') return;
    api.get('/subscriptions/my')
      .then(res => {
        const s = res.data?.data?.subscription;
        if (s?.plan_slug) setPlan({ name: s.plan_name, slug: s.plan_slug });
      })
      .catch(() => {});
  }, [user?.role]);

  const isPaid = plan ? plan.slug !== 'free' : false;

  return (
    <aside className={`h-full w-64 fixed left-0 top-0 flex flex-col border-r border-outline-variant/30 bg-surface shadow-[0px_4px_20px_rgba(0,0,0,0.04)] z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="px-6 py-8 flex items-center gap-3">
        <img src="/logo-shopizi.png" alt="Shopizi" className="h-8 object-contain" />
        <button onClick={onClose} className="ml-auto md:hidden p-2 text-text-muted hover:text-error rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-full transition-all ${
                isActive
                  ? 'bg-burkina-green-light text-burkina-green-deep'
                  : 'text-text-muted hover:text-burkina-green-deep hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>{item.icon}</span>
              <span className="text-label-lg font-label-lg">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        {!isPaid && (
          <div className="bg-primary-container p-4 rounded-xl text-white relative overflow-hidden group transition-transform hover:scale-[1.02] hidden md:block">
            <div className="fani-pattern absolute inset-0 opacity-10" />
            <div className="relative z-10">
              <p className="text-label-sm opacity-90 mb-1">Passer au niveau supérieur</p>
              <p className="text-label-lg font-bold mb-3">Shopizi Pro Plan</p>
              <Link to="/upgrade" onClick={onClose} className="inline-block bg-secondary-container text-on-secondary-container text-label-sm px-4 py-2 rounded-lg font-bold transition-all hover:bg-secondary-fixed">Passer à Pro</Link>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mt-6 px-2">
          <div className="w-10 h-10 rounded-full border-2 border-burkina-green-deep p-0.5 overflow-hidden">
            <img className="w-full h-full object-cover rounded-full" src={user?.avatar_url} alt={user?.full_name} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-label-lg font-bold leading-none">{user?.full_name || 'Utilisateur'}</span>
              {isPaid && plan && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none" style={{ backgroundColor: '#ca8a04' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>workspace_premium</span>
                  {plan.name}
                </span>
              )}
            </div>
            <span className="text-label-sm text-text-muted leading-none mt-1">
              {user?.role === 'merchant' ? (isPaid && plan ? `Marchand ${plan.name}` : 'Marchand Burkinabé') : 'Livreur'}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-label-lg font-label-lg text-error hover:bg-error-container/50 transition-colors mt-4"
        >
          <span className="material-symbols-outlined">logout</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
