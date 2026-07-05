import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6 font-body-md text-text-main text-center">
      <div className="w-24 h-24 rounded-full bg-error-container text-error flex items-center justify-center mb-6">
        <Search className="w-12 h-12" />
      </div>
      
      <h1 className="text-headline-lg font-headline-lg mb-2">404</h1>
      <h2 className="text-headline-sm font-headline-sm mb-4">Cette page n'existe pas</h2>
      
      <p className="text-body-lg text-text-muted max-w-md mb-8">
        La page que vous recherchez a peut-être été supprimée, a changé de nom ou est temporairement indisponible.
      </p>
      
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 px-6 py-3 bg-burkina-green-deep text-white rounded-xl hover:bg-opacity-90 transition-colors font-label-lg uppercase tracking-wider"
      >
        <Home className="w-5 h-5" />
        Retour à l'accueil
      </Link>
    </div>
  );
}
