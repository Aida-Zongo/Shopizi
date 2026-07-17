// Notifications locales (Notification API). Utilisees pour alerter le marchand
// d'une nouvelle commande ou d'un nouveau message quand l'onglet n'est pas actif.

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showLocalNotification(title: string, body: string, url?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Passe par le service worker si disponible (notification cliquable/persistante),
  // sinon repli sur une notification simple.
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(title, {
          body,
          icon: '/logo-shopizi.png',
          badge: '/logo-shopizi.png',
          data: { url: url || '/' },
        })
      )
      .catch(() => {
        new Notification(title, { body, icon: '/logo-shopizi.png' });
      });
  } else {
    new Notification(title, { body, icon: '/logo-shopizi.png' });
  }
}
