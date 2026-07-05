import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Loader2, MapPin, ShoppingBag,
} from 'lucide-react';
import api from '../lib/api';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Bonjour ! Je suis **Kèra**, votre assistante shopping. Je peux vous aider à trouver des produits disponibles chez nos commerçants partenaires.\n\nExemples de questions :\n• « Tu as du riz local à Ouagadougou ? »\n• « Où trouver du tissu faso dan fani ? »\n• « Quel commerçant vend des téléphones près de chez moi ? »',
  timestamp: new Date(),
};

function renderText(text: string) {
  // Basic markdown-like renderer (bold, links, line breaks)
  const parts = text.split(/(\*\*[^*]+\*\*|http\S+|\/shops\/\S+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('http')) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              className="text-burkina-green-deep underline font-medium hover:opacity-80">
              {part}
            </a>
          );
        }
        if (part.startsWith('/shops/')) {
          return (
            <Link key={i} to={part} className="text-burkina-green-deep underline font-medium hover:opacity-80">
              Voir la boutique
            </Link>
          );
        }
        // Split on newlines
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 ? <br /> : null}</span>
        ));
      })}
    </>
  );
}

interface AiAssistantWidgetProps {
  cityName?: string; // optional pre-set city context
}

export default function AiAssistantWidget({ cityName }: AiAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationCityName, setLocationCityName] = useState(cityName || '');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
      setHasNewMessage(false);
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        city_name: locationCityName || undefined,
      });

      const aiText = res.data.success && res.data.data?.text
        ? res.data.data.text
        : 'Je suis désolé, je n\'ai pas pu traiter votre demande. Veuillez réessayer.';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages(prev => [...prev, { id: 'sys-err', role: 'assistant', text: 'Erreur de connexion. Veuillez réessayer plus tard.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas disponible sur votre appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        // For the AI we just pass a city label; getting city from coords would need reverse geocoding
        setLocationCityName('Ouagadougou'); // fallback, could be enhanced with geocoding
        const sysMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          text: '📍 Position détectée ! Je vais maintenant prioriser les commerçants à **Ouagadougou** pour mes recommandations. Posez-moi votre question !',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, sysMsg]);
      },
      (err) => {
        alert(`Impossible d'obtenir votre position : ${err.message}`);
      }
    );
  };

  const quickQuestions = [
    'Où acheter du tissu faso dan fani ?',
    'Qui vend du riz local ?',
    'Produits électroniques disponibles',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(o => !o); setHasNewMessage(false); }}
        id="ai-assistant-toggle"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)' }}
        aria-label="Ouvrir l'assistant IA"
      >
        {isOpen
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-white animate-bounce" />
        )}
      </button>

      {/* Chat panel */}
      <div
        id="ai-assistant-panel"
        className={`fixed bottom-24 right-6 z-50 w-[350px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ maxHeight: '600px' }}
      >
        {/* Header */}
        <div className="p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)' }}>
          <img src="/kera-avatar.svg" alt="Kèra" className="w-9 h-9 rounded-full border border-white/20 shadow-sm flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white font-bold text-label-lg">Kèra</p>
            <p className="text-white/80 text-xs font-medium">Votre assistante shopping intelligente</p>
          </div>
          {locationCityName && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
              <MapPin className="w-3 h-3 text-white" />
              <span className="text-white text-xs">{locationCityName}</span>
            </div>
          )}
        </div>

        {/* Location bar */}
        {!locationCityName && (
          <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant/10 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary flex-shrink-0" />
            <div className="flex-1">
              <input
                type="text"
                placeholder="Votre ville (ex: Ouagadougou)"
                value={locationCityName}
                onChange={e => setLocationCityName(e.target.value)}
                className="w-full bg-transparent text-xs text-text-main outline-none placeholder:text-text-muted"
              />
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              className="text-xs text-burkina-green-deep font-bold hover:underline flex-shrink-0"
            >
              Détecter
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '200px', maxHeight: '360px' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <img src="/kera-avatar.svg" alt="Kèra" className="w-6 h-6 rounded-full mr-2 flex-shrink-0 mt-0.5 border border-black/5 shadow-sm" />
              )}
              <div
                className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-secondary-container text-on-secondary-container rounded-br-sm'
                    : 'bg-shopizi-light/30 text-shopizi-dark rounded-bl-sm'
                }`}
              >
                <div>{renderText(msg.text)}</div>
                <p className="text-[10px] text-text-muted mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2">
              <img src="/kera-avatar.svg" alt="Kèra" className="w-6 h-6 rounded-full border border-black/5 shadow-sm" />
              <div className="px-3 py-2.5 bg-surface-container-low rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                <span className="text-xs text-text-muted">Je cherche...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-text-muted mb-2">Suggestions rapides :</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs px-2.5 py-1 bg-surface-container-low text-text-muted rounded-full border border-outline-variant/20 hover:border-burkina-green-deep hover:text-burkina-green-deep hover:bg-burkina-green-light/30 transition-all"
                >
                  <ShoppingBag className="inline w-3 h-3 mr-1" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-outline-variant/20 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 px-3 py-2 text-sm border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-burkina-green-deep/40 focus:border-burkina-green-deep bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-shopizi-primary hover:bg-shopizi-dark"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </>
  );
}
