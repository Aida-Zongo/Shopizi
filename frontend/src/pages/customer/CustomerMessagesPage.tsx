import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import { MessageCircle, Send, Store, MapPin, ArrowLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  content_type: string;
  created_at: string;
}

interface ChatRoom {
  id: string;
  shop_name: string | null;
  title: string | null;
  last_message: string | null;
  unread_count: number;
}

export default function CustomerMessagesPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(searchParams.get('room'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      if (res.data.success) setRooms(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await api.get(`/chat/rooms/${roomId}/messages`);
      if (res.data.success) setMessages(res.data.data || []);
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
      api.put(`/chat/rooms/${selectedRoom}/read`).then(() => {
        setRooms(prev => prev.map(r => r.id === selectedRoom ? { ...r, unread_count: 0 } : r));
      }).catch(() => {});
    }
  }, [selectedRoom]);

  // Join every room the user is part of so live messages arrive even for rooms not currently open
  useEffect(() => {
    const socket = getSocket();
    rooms.forEach(r => socket.emit('chat:join', r.id));
  }, [rooms.map(r => r.id).join(',')]);

  useEffect(() => {
    const socket = getSocket();
    const handleMessage = (msg: ChatMessage & { room_id: string }) => {
      if (msg.room_id === selectedRoom) {
        setMessages(prev => [...prev, msg]);
        api.put(`/chat/rooms/${selectedRoom}/read`).catch(() => {});
      } else {
        setRooms(prev => prev.map(r => r.id === msg.room_id ? { ...r, unread_count: r.unread_count + 1, last_message: msg.content } : r));
      }
    };
    socket.on('chat:message', handleMessage);
    return () => { socket.off('chat:message', handleMessage); };
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;
    try {
      await api.post(`/chat/rooms/${selectedRoom}/messages`, { content: newMessage.trim() });
      setNewMessage('');
      fetchMessages(selectedRoom);
      fetchRooms();
    } catch (err: any) {
      setError(getApiError(err));
    }
  };

  const handleShareLocation = () => {
    if (!selectedRoom || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const content = `${pos.coords.latitude},${pos.coords.longitude}`;
      try {
        await api.post(`/chat/rooms/${selectedRoom}/messages`, { content, content_type: 'location' });
        fetchMessages(selectedRoom);
        fetchRooms();
      } catch (err: any) {
        setError(getApiError(err));
      }
    }, () => setError('Impossible de récupérer votre position.'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-headline-sm font-headline-sm text-text-main">Messagerie</h1>
        <p className="text-body-md text-text-muted mt-1">Vos conversations avec les boutiques</p>
      </div>

      {error && (
        <div className="p-3 bg-error-container border border-error/20 rounded-xl text-error text-body-sm mb-4">{error}</div>
      )}

      <div className="flex-1 flex bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {/* Rooms list (on mobile, hidden once a conversation is open) */}
        <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-outline-variant/20 flex-col`}>
          <div className="p-4 border-b border-outline-variant/20">
            <h2 className="text-label-lg font-label-lg text-text-main">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-body-md">Aucune conversation pour le moment</div>
            ) : (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-4 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors ${selectedRoom === room.id ? 'bg-surface-container-low' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                      <Store className="w-5 h-5 text-on-secondary-container" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-body-md font-medium text-text-main truncate">{room.shop_name || room.title || 'Conversation'}</span>
                        {room.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-burkina-green-deep text-white text-xs rounded-full">{room.unread_count}</span>
                        )}
                      </div>
                      <p className="text-body-sm text-text-muted truncate">{room.last_message || 'Nouvelle conversation'}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages area (on mobile, shown only when a conversation is open) */}
        <div className={`${selectedRoom ? 'flex' : 'hidden'} md:flex flex-1 flex-col w-full`}>
          {selectedRoom ? (
            <>
              <div className="flex items-center gap-2 p-3 border-b border-outline-variant/20 md:hidden">
                <button type="button" onClick={() => setSelectedRoom(null)} className="p-1 text-text-muted hover:text-text-main" aria-label="Retour aux conversations">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-body-md font-medium text-text-main truncate">
                  {rooms.find(r => r.id === selectedRoom)?.shop_name || rooms.find(r => r.id === selectedRoom)?.title || 'Conversation'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  const isLocation = msg.content_type === 'location';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-body-sm ${isMe ? 'bg-secondary-container text-on-secondary-container rounded-br-md' : 'bg-surface-container-low text-text-main rounded-bl-md'}`}>
                        {isLocation ? (
                          <a
                            href={`https://maps.google.com/?q=${msg.content}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 underline font-medium"
                          >
                            <MapPin className="w-4 h-4" /> Voir sur la carte
                          </a>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${isMe ? 'text-on-secondary-container/60' : 'text-text-muted'}`}>{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 border-t border-outline-variant/20 flex gap-2">
                <button
                  type="button"
                  onClick={handleShareLocation}
                  title="Partager ma position"
                  className="p-2.5 text-text-muted hover:text-burkina-green-deep rounded-xl transition-all active:scale-95"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/50 focus:border-burkina-green-deep bg-white"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-secondary-container text-on-secondary-container rounded-xl hover:shadow-md transition-all active:scale-95 shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p className="text-body-md">Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
