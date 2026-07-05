import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const isHomepage = location.pathname === '/' || location.pathname === '/marketplace';

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface/80 backdrop-blur-md flex justify-between items-center px-4 z-40">
      <button onClick={onMenuToggle} className="md:hidden p-2 text-text-muted hover:text-text-main rounded-lg">
        <Menu className="w-6 h-6" />
      </button>
      {!isHomepage && (
        <div className="hidden md:flex items-center gap-4 bg-surface-container-low rounded-full px-4 py-2 w-96">
          <span className="material-symbols-outlined text-text-muted">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none"
            type="text"
            placeholder="Rechercher des produits, clients..."
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest/50 transition-all text-text-muted">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest/50 transition-all text-text-muted">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="h-8 w-[1px] bg-outline-variant/30 mx-1"></div>
        <div className="flex items-center gap-3 pl-2">
          <span className="text-label-md font-label-md text-burkina-green-deep bg-burkina-green-light px-3 py-1 rounded-full">Boutique Ouverte</span>
        </div>
      </div>
    </header>
  );
}
