import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __openShopiziInstall?: () => void;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    // 1. Détection du mode standalone (déjà installé)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // 2. Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
    if (isAppleDevice && isSafari) {
      setIsIOS(true);
    }

    // 3. Écoute de l'événement natif beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowManualGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Permet d'ouvrir la boîte d'installation depuis n'importe quel bouton de l'app
    window.__openShopiziInstall = () => {
      setDismissed(false);
      setShowManualGuide(true);
    };

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delete window.__openShopiziInstall;
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else {
      // Si le navigateur n'a pas encore émis l'événement natif ou ne le supporte pas directement
      setShowManualGuide(true);
    }
  };

  // Ne rien afficher si l'application est déjà lancée en mode standalone ou masquée
  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Installation de l'application Shopizi"
      className="pwa-hide-standalone fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <img
          src="/icon-192.png"
          alt="Logo Shopizi"
          className="h-12 w-12 flex-shrink-0 rounded-xl object-contain border border-slate-100 shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Shopizi</h2>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#00A86B] bg-[#00A86B]/10 px-1.5 py-0.5 rounded">
              PWA
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Installez l'application sur votre écran d'accueil pour un accès ultra-rapide et sécurisé.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95 hover:opacity-95"
              style={{ backgroundColor: '#00A86B' }}
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Installer l'application
            </button>
          </div>

          {/* Guide manuel si le prompt natif n'est pas supporté (iOS ou attente navigateur) */}
          {showManualGuide && (
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 space-y-1.5">
              {isIOS ? (
                <>
                  <p className="font-semibold text-slate-900">Installation sur iPhone / iPad :</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>
                      Appuyez sur <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">ios_share</span> (Partager).
                    </li>
                    <li>
                      Sélectionnez <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">add_box</span> « Sur l'écran d'accueil ».
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900">Installation sur Android / Navigateur :</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>
                      Ouvrez le menu du navigateur <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">more_vert</span> (les 3 points en haut).
                    </li>
                    <li>
                      Appuyez sur <span className="material-symbols-outlined align-middle text-[15px] text-slate-900">add_to_home_screen</span> « Installer l'application » ou « Ajouter à l'écran d'accueil ».
                    </li>
                  </ol>
                </>
              )}
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
