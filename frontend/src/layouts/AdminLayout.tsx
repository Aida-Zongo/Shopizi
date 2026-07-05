import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function AdminLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-gutter sticky top-0 z-40">
        <div>
          <img src="/logo-shopizi.png" alt="Shopizi" className="h-8 object-contain" />
          <p className="text-label-sm text-text-muted">Administration</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-label-lg font-label-lg leading-none">{user?.full_name || 'Admin'}</p>
            <p className="text-[12px] text-text-muted">{user?.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-burkina-green-light flex items-center justify-center text-burkina-green-deep font-bold">
            A
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-label-sm font-label-sm text-error hover:bg-error-container/50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Déconnexion
          </button>
        </div>
      </header>
      <main className="max-w-container-max mx-auto p-gutter">
        <Outlet />
      </main>
    </div>
  );
}
