import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  MessageCircle, Send, MapPin, Navigation, User, Store, Bike, Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  content_type: 'text' | 'location' | 'image' | 'file' | 'system';
  created_at: string;
}

interface ChatRoom {
  id: string;
  type: string;
  title: string | null;
  last_message: string | null;
  unread_count: number;
  last_message_at: string | null;
}

interface ActiveDelivery {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  shop_name: string;
  shop_id: string;
  status: string;
}

function getRoomIcon(type: string) {
  if (type === 'driver_merchant') return <Store className="w-4 h-4 text-burkina-green-deep" />;
  if (type === 'driver_customer') return <User className="w-4 h-4 text-secondary" />;
  return <Bike className="w-4 h-4 text-text-muted" />;
}

function getRoomLabel(type: string) {
  if (type === 'driver_merchant') return 'Commerçant';
  if (type === 'driver_customer') return 'Client';
  return 'Conversation';
}

function LocationMessage({ content, isMe }: { content: string; isMe: boolean }) {
  let lat: number | null = null, lng: number | null = null;
  let label = 'Position partagée';
  try {
    const parsed = JSON.parse(content);
    lat = parsed.lat;
    lng = parsed.lng;
    label = parsed.label || label;
  } catch {
    // plain text fallback
    return <p className="text-sm">{content}</p>;
  }

  const mapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

  return (
    <div className={`rounded-lg p-3 space-y-2 ${isMe ? 'bg-burkina-green-light' : 'bg-surface-container-low'}`}>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-error" />
        <span className="text-body-sm font-medium">{label}</span>
      </div>
      {lat && lng && (
        <p className="text-xs text-text-muted">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-label-sm font-bold hover:shadow-md transition-all active:scale-95"
        >
          <Navigation className="w-4 h-4" />
          Ouvrir l'itinéraire
        </a>
      )}
    </div>
  );
}

export default function DriverChatPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(searchParams.get('room'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [error, setError] = useState('');
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      if (res.data.success) setRooms(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await api.get(`/chat/rooms/${roomId}/messages`);
      if (res.data.success) {
        const msgs: ChatMessage[] = res.data.data || [];
        setMessages(msgs.reverse()); // API returns DESC, we want ASC for display
      }
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/delivery/my');
      if (res.data.success) setActiveDeliveries(res.data.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchRooms();
    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
      // Poll for new messages every 5 seconds
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => fetchMessages(selectedRoom), 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || isSending) return;
    setIsSending(true);
    try {
      await api.post(`/chat/rooms/${selectedRoom}/messages`, {
        content: newMessage.trim(),
        content_type: 'text',
      });
      setNewMessage('');
      fetchMessages(selectedRoom);
      fetchRooms();
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleShareLocation = async () => {
    if (!selectedRoom || isSharingLocation) return;

    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const locationPayload = JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: '📍 Ma position actuelle',
          });
          await api.post(`/chat/rooms/${selectedRoom}/messages`, {
            content: locationPayload,
            content_type: 'location',
          });
          fetchMessages(selectedRoom);
        } catch (err: any) {
          setError(getApiError(err));
        } finally {
          setIsSharingLocation(false);
        }
      },
      (err) => {
        setError(`Impossible d'obtenir la position : ${err.message}`);
        setIsSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startChatWithDelivery = async (delivery: ActiveDelivery, chatType: 'driver_merchant' | 'driver_customer') => {
    try {
      const payload: Record<string, string> = {
        type: chatType,
        title: chatType === 'driver_merchant'
          ? `Livraison #${delivery.order_number} — Commerçant`
          : `Livraison #${delivery.order_number} — Client`,
      };
      if (chatType === 'driver_merchant') payload.shop_id = delivery.shop_id;

      const res = await api.post('/chat/rooms', payload);
      if (res.data.success) {
        setSelectedRoom(res.data.data.id);
        fetchRooms();
      }
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-headline-sm font-headline-sm text-text-main">Messagerie</h1>
        <p className="text-body-md text-text-muted mt-1">Discutez avec les commerçants et les clients</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline text-xs">Fermer</button>
        </div>
      )}

      {/* Quick start buttons from active deliveries */}
      {activeDeliveries.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 shadow-sm">
          <p className="text-label-lg font-bold text-text-main mb-3 flex items-center gap-2">
            <Bike className="w-4 h-4 text-burkina-green-deep" />
            Livraisons actives — Démarrer un chat
          </p>
          <div className="space-y-2">
            {activeDeliveries.map(d => (
              <div key={d.id} className="flex flex-col sm:flex-row gap-2 p-3 bg-surface-container-low rounded-lg">
                <div className="flex-1">
                  <p className="text-body-sm font-semibold text-text-main">Commande #{d.order_number}</p>
                  <p className="text-xs text-text-muted">{d.shop_name} → {d.customer_name}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startChatWithDelivery(d, 'driver_merchant')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-burkina-green-light text-burkina-green-deep rounded-lg text-label-sm font-bold hover:shadow transition-all"
                  >
                    <Store className="w-3 h-3" />
                    Commerçant
                  </button>
                  <button
                    onClick={() => startChatWithDelivery(d, 'driver_customer')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-label-sm font-bold hover:shadow transition-all"
                  >
                    <User className="w-3 h-3" />
                    Client
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="flex bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
        {/* Room list */}
        <div className="w-64 flex-shrink-0 border-r border-outline-variant/20 flex flex-col">
          <div className="p-3 border-b border-outline-variant/20">
            <p className="text-label-lg font-bold text-text-main">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingRooms ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-body-sm text-text-muted">Aucune conversation</p>
                <p className="text-xs text-text-muted mt-1">Utilisez les boutons ci-dessus pour commencer</p>
              </div>
            ) : (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-3 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors ${selectedRoom === room.id ? 'bg-surface-container-low border-l-2 border-l-burkina-green-deep' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary-container/30 flex items-center justify-center flex-shrink-0">
                      {getRoomIcon(room.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm font-semibold text-text-main truncate">
                          {room.title || getRoomLabel(room.type)}
                        </span>
                        {room.unread_count > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-burkina-green-deep text-white text-xs rounded-full flex-shrink-0">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate">{room.last_message || 'Nouvelle conversation'}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedRoom ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-outline-variant/20 flex items-center gap-2">
                {rooms.find(r => r.id === selectedRoom) && (
                  <>
                    {getRoomIcon(rooms.find(r => r.id === selectedRoom)!.type)}
                    <span className="text-label-lg font-bold text-text-main">
                      {rooms.find(r => r.id === selectedRoom)!.title || getRoomLabel(rooms.find(r => r.id === selectedRoom)!.type)}
                    </span>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted">
                    <MessageCircle className="w-10 h-10 mb-2" />
                    <p className="text-body-sm">Aucun message. Commencez la conversation !</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isMe && (
                            <span className="text-xs text-text-muted mb-1 px-1">{msg.sender_name}</span>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-body-sm ${isMe
                            ? 'bg-secondary-container text-on-secondary-container rounded-br-sm'
                            : 'bg-surface-container-low text-text-main rounded-bl-sm'
                          }`}>
                            {msg.content_type === 'location' ? (
                              <LocationMessage content={msg.content} isMe={isMe} />
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-on-secondary-container/60 text-right' : 'text-text-muted'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-3 border-t border-outline-variant/20 flex gap-2 items-end">
                <button
                  type="button"
                  onClick={handleShareLocation}
                  disabled={isSharingLocation}
                  title="Partager ma position GPS"
                  className="p-2.5 rounded-xl border border-outline-variant/30 text-text-muted hover:text-burkina-green-deep hover:border-burkina-green-deep hover:bg-burkina-green-light/30 transition-all active:scale-95 flex-shrink-0 disabled:opacity-50"
                >
                  {isSharingLocation
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Navigation className="w-5 h-5" />
                  }
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 px-4 py-2.5 border border-outline-variant/30 rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40 focus:border-burkina-green-deep bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="p-2.5 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-all active:scale-95 shadow-sm flex-shrink-0 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-3">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-body-md font-medium">Sélectionnez une conversation</p>
                <p className="text-body-sm text-text-muted mt-1">ou démarrez-en une depuis vos livraisons actives</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
