import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { showLocalNotification } from '../hooks/usePushNotifications';

// Ecoute globale du temps reel pour afficher une notification systeme lorsque
// l'onglet n'est PAS au premier plan (sinon l'UI de la page suffit). Utilise les
// vrais evenements du backend : 'new:order' (livreurs) et 'chat:message'.
export default function PushNotificationListener() {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();

    const onNewOrder = (payload: { order_number?: string } = {}) => {
      if (!document.hidden) return;
      showLocalNotification(
        'Nouvelle commande',
        payload.order_number ? `Commande ${payload.order_number} a livrer.` : 'Une nouvelle course est disponible.',
        '/deliveries'
      );
    };

    const onMessage = (msg: { sender_id?: string; sender_name?: string; content?: string } = {}) => {
      if (!document.hidden) return;
      if (msg.sender_id && user?.id && msg.sender_id === user.id) return;
      showLocalNotification(
        msg.sender_name || 'Nouveau message',
        msg.content || 'Vous avez recu un message.',
        user?.role === 'customer' ? '/messages' : '/chat'
      );
    };

    socket.on('new:order', onNewOrder);
    socket.on('chat:message', onMessage);
    return () => {
      socket.off('new:order', onNewOrder);
      socket.off('chat:message', onMessage);
    };
  }, [isAuthenticated, user?.id, user?.role]);

  return null;
}
