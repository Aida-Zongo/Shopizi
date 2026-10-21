import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Détection du mode standalone (déjà installé)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
    if (isAppleDevice && isSafari) {
      setIsIOS(true);
    }

    // 3. Écoute de l'événement beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Ne rien afficher si l'app est déjà installée en mode standalone ou masquée par l'utilisateur
  if (isStandalone || dismissed) {
    return null;
  }

  // Ne rien afficher si pas sur iOS et qu'aucun événement d'installation natif n'est disponible
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Installation de l'application Shopizi"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <img
          src="/icon-192.png"
          alt="Logo Shopizi"
          className="h-12 w-12 flex-shrink-0 rounded-xl object-contain border border-slate-100"
        />

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Shopizi</h2>

          {deferredPrompt && (
            <>
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                Installez l'application sur votre écran d'accueil pour un accès rapide et une utilisation hors ligne.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95"
                  style={{ backgroundColor: '#00A86B' }}
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Installer l'application
                </button>
              </div>
            </>
          )}

          {!deferredPrompt && isIOS && (
            <div className="mt-1 text-xs text-slate-600 leading-relaxed space-y-1">
              <p>Pour installer Shopizi sur votre iPhone ou iPad :</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-700 font-medium">
                <li>
                  Appuyez sur Partager{' '}
                  <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">
                    ios_share
                  </span>
                </li>
                <li>
                  Sélectionnez Sur l'écran d'accueil{' '}
                  <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">
                    add_box
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer la notification d'installation"
          className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
