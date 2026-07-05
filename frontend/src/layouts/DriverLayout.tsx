import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Menu } from 'lucide-react';
import AiAssistantWidget from '../components/AiAssistantWidget';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Tableau de Bord' },
  { to: '/deliveries', icon: 'inventory_2', label: 'Commandes' },
  { to: '/chat', icon: 'chat', label: 'Messagerie' },
  { to: '/earnings', icon: 'account_balance_wallet', label: 'Mes Gains' },
  { to: '/history', icon: 'history', label: 'Historique' },
  { to: '/settings', icon: 'settings', label: 'Paramètres' },
];

function DriverSidebar({ user, logout, isOpen, onClose }: { user: any; logout: () => void; isOpen: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  return (
    <aside className={`h-full w-64 fixed left-0 top-0 flex flex-col border-r border-outline-variant/30 bg-surface shadow-[0px_4px_20px_rgba(0,0,0,0.04)] z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-lg flex items-center justify-between">
        <div>
          <img src="/logo-shopizi.png" alt="Shopizi" className="h-8 object-contain" />
          <p className="text-label-sm text-text-muted">Burkinabé Deliveries</p>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-text-muted hover:text-error rounded-lg">✕</button>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-full transition-all ${
                isActive
                  ? 'bg-burkina-green-light text-burkina-green-deep'
                  : 'text-text-muted hover:text-burkina-green-deep hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-lg text-label-lg">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-md mt-auto border-t border-outline-variant/20 faso-pattern">
        <div className="bg-burkina-green-deep rounded-xl p-md text-on-primary shadow-lg">
          <p className="text-label-sm font-medium opacity-80">Niveau de Livreur</p>
          <h3 className="text-headline-sm font-headline-sm mb-2">Expert</h3>
          <div className="w-full bg-white/20 h-1 rounded-full mb-2">
            <div className="bg-secondary-container h-full w-[85%] rounded-full"></div>
          </div>
          <p className="text-[11px] opacity-90">Prochain bonus à 500 points</p>
        </div>
        <div className="flex items-center gap-3 mt-6 px-2">
          <div className="w-10 h-10 rounded-full border-2 border-burkina-green-deep p-0.5 overflow-hidden">
            <img className="w-full h-full object-cover rounded-full" src={user?.avatar_url} alt={user?.full_name} />
          </div>
          <div className="flex flex-col">
            <span className="text-label-lg font-bold leading-none">{user?.full_name || 'Livreur'}</span>
            <span className="text-label-sm text-burkina-green-deep font-semibold leading-none mt-1">En ligne</span>
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

function DriverHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface/80 backdrop-blur-md flex justify-between items-center px-gutter z-40">
      <button onClick={onMenuToggle} className="md:hidden p-2 text-text-muted hover:text-text-main rounded-lg">
        <Menu className="w-6 h-6" />
      </button>
      <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96">
        <span className="material-symbols-outlined text-outline">search</span>
        <input className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none" type="text" placeholder="Rechercher une commande..." />
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-text-muted hover:bg-surface-container-highest/50 rounded-full transition-all">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
          <div className="text-right">
            <p className="text-label-lg font-label-lg leading-none">Actions</p>
            <p className="text-[12px] text-burkina-green-deep font-semibold">En ligne</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-burkina-green-deep p-0.5 overflow-hidden">
            <span className="w-full h-full bg-burkina-green-light rounded-full flex items-center justify-center text-burkina-green-deep text-label-lg font-bold">D</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function DriverLayout() {
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="bg-surface font-body-md text-on-surface">
      <DriverSidebar user={user} logout={logout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <DriverHeader onMenuToggle={() => setIsSidebarOpen(true)} />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen">
        <div className="max-w-container-max mx-auto p-gutter">
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}
          <Outlet />
        </div>
      </main>
      <AiAssistantWidget />
    </div>
  );
}
