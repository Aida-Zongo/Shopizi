import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AiAssistantWidget from '../components/AiAssistantWidget';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomepage = location.pathname === '/' || location.pathname === '/marketplace';
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return;
    const loadUnread = () => {
      api.get('/chat/rooms').then(res => {
        if (res.data.success) {
          const total = (res.data.data || []).reduce((sum: number, r: any) => sum + (r.unread_count || 0), 0);
          setUnreadCount(total);
        }
      }).catch(() => {});
    };
    loadUnread();

    const socket = getSocket();
    const handleMessage = () => {
      if (location.pathname !== '/messages') loadUnread();
    };
    socket.on('chat:message', handleMessage);
    return () => { socket.off('chat:message', handleMessage); };
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-shopizi-light shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo-shopizi.png" alt="Shopizi" className="h-8 object-contain" />
          </Link>

          {/* Search */}
          {!isHomepage && (
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Rechercher un produit, une boutique..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40 focus:border-burkina-green-deep"
                  onKeyDown={e => { if (e.key === 'Enter') navigate(`/search?q=${(e.target as HTMLInputElement).value}`); }}
                />
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex items-center gap-2">
            <Link to="/shops" className="hidden sm:flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-burkina-green-deep hover:bg-surface-container rounded-lg transition-all">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              Boutiques
            </Link>

            <Link to="/digital" className="hidden sm:flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-burkina-green-deep hover:bg-surface-container rounded-lg transition-all">
              <span className="material-symbols-outlined text-[18px]">cloud_download</span>
              Produits Digitaux
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container transition-all"
                >
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-burkina-green-deep to-secondary flex items-center justify-center text-white font-bold text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || 'C'}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-text-main">{user.full_name?.split(' ')[0]}</span>
                  <span className="material-symbols-outlined text-[18px] text-text-muted">expand_more</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-outline-variant/20 z-20 overflow-hidden">
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-sm text-text-main hover:bg-surface-container transition-all" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Mon profil
                      </Link>
                      <Link to="/orders" className="flex items-center gap-2 px-4 py-3 text-sm text-text-main hover:bg-surface-container transition-all" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined text-[18px]">package_2</span>
                        Mes commandes
                      </Link>
                      <Link to="/purchases" className="flex items-center gap-2 px-4 py-3 text-sm text-text-main hover:bg-surface-container transition-all" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                        Mes achats digitaux
                      </Link>
                      <Link to="/messages" className="flex items-center gap-2 px-4 py-3 text-sm text-text-main hover:bg-surface-container transition-all" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        Messagerie
                        {unreadCount > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 bg-burkina-green-deep text-white text-[10px] font-bold rounded-full">{unreadCount}</span>
                        )}
                      </Link>
                      <hr className="border-outline-variant/20" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-error hover:bg-error-container transition-all">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Se déconnecter
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-burkina-green-deep hover:bg-surface-container rounded-lg transition-all">
                  Connexion
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-shopizi-primary hover:bg-shopizi-dark rounded-lg transition-all">
                  S'inscrire
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0A504A' }} className="mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Partie haute */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
            {/* Logo + desc */}
            <div className="md:col-span-2">
              <span className="block font-black text-2xl text-white mb-4">Shopizi</span>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                La marketplace digitale du Burkina Faso. Connectons commerçants et clients pour une économie locale plus forte.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://wa.me/22666869010"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: '#F97316', color: 'white' }}
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Liens plateforme */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Plateforme</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Boutiques', href: '/shops' },
                  { label: 'Marketplace', href: '/marketplace' },
                  { label: 'Devenir marchand', href: '/register' },
                  { label: 'Devenir livreur', href: '/register' },
                ].map((link, i) => (
                  <li key={i}>
                    <Link
                      to={link.href}
                      className="text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs opacity-50">chevron_right</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: '#FDBA74' }}>location_on</span>
                  <span className="text-white/60 text-sm">Koudougou, Burkina Faso</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#FDBA74' }}>mail</span>
                  <a href="mailto:contact@shopizi.bf" className="text-white/60 text-sm hover:text-white transition-colors">
                    contact@shopizi.bf
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#FDBA74' }}>phone</span>
                  <a href="tel:+22666869010" className="text-white/60 text-sm hover:text-white transition-colors">
                    +226 66 86 90 10
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Partie basse */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-xs">
              © 2026 Shopizi · Tous droits réservés · Burkina Faso
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-white/40 text-xs hover:text-white/70 transition-colors">
                Conditions d'utilisation
              </Link>
              <Link to="/terms" className="text-white/40 text-xs hover:text-white/70 transition-colors">
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Assistant */}
      <AiAssistantWidget />
    </div>
  );
}
