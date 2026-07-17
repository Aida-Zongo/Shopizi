import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '../hooks/usePushNotifications';

// Evenement non standard expose par Chrome/Edge avant l'installation.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'shopizi_pwa_dismissed';

// Banniere d'installation de l'app. Sur Android/PC on declenche le vrai prompt
// natif ; sur iOS (pas de beforeinstallprompt) on affiche la marche a suivre.
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    // Deja installee : mode standalone (Android/PC) ou navigator.standalone (iOS).
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    setIsIOS(ios);

    if (ios) {
      // iOS n'emet pas beforeinstallprompt : on montre les instructions apres 5s.
      const t = setTimeout(() => setVisible(true), 5000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setVisible(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      // Geste utilisateur : bon moment pour demander les notifications.
      requestNotificationPermission().catch(() => {});
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-[0px_8px_30px_rgba(0,0,0,0.18)] border border-outline-variant/30 p-4 flex items-start gap-3">
        <img src="/logo-shopizi.png" alt="Shopizi" className="w-12 h-12 rounded-xl object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: '#0A504A' }}>Installer Shopizi</p>
          {isIOS ? (
            <p className="text-[13px] text-text-muted mt-1 leading-snug">
              Appuyez sur <span className="material-symbols-outlined align-middle text-[16px]">ios_share</span> puis
              « Sur l'ecran d'accueil » pour installer l'application.
            </p>
          ) : (
            <p className="text-[13px] text-text-muted mt-1 leading-snug">
              Ajoutez Shopizi a votre ecran d'accueil pour un acces rapide, meme hors ligne.
            </p>
          )}
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-3 inline-flex items-center gap-1.5 text-white text-[13px] font-semibold px-4 py-2 rounded-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#0A504A' }}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Installer
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Fermer" className="text-text-muted hover:text-text-main flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}
