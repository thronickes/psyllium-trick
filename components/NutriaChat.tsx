import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { getNutriaResponse } from '../geminiService';

interface Props {
  onClose: () => void;
  profile: UserProfile;
}

const NutriaChat: React.FC<Props> = ({ onClose, profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `¡Hola ${profile.name}! Soy Nutria. ¿En qué puedo ayudarte con tu bienestar hoy?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const botFullResponse = await getNutriaResponse(userMsg, profile);

      // Split response into chunks (by double newline or sentence ends if very long)
      const chunks = botFullResponse
        .split(/\n\n|(?<=[.!?])\s+(?=[A-Z¡¿])/)
        .filter(c => c.trim().length > 0);

      setIsTyping(false);

      // Deliver chunks with 3s delay
      for (let i = 0; i < chunks.length; i++) {
        if (i > 0) {
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 3000));
          setIsTyping(false);
        }
        setMessages(prev => [...prev, { role: 'model', text: chunks[i] }]);
      }
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Ops… hubo un problema para generar mi respuesta. Intenta de nuevo en unos segundos.'
        }
      ]);
      console.error('NutriaChat error:', err?.message || err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-300 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] md:rounded-3xl md:shadow-2xl md:border md:border-pink-50 overflow-hidden">
      {/* Header */}
      <div className="bg-[#E8A2AF] p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <span className="text-xl">🦦</span>
          </div>
          <div>
            <h3 className="font-bold">Chat con Nutria</h3>
            <p className="text-[10px] text-pink-50 uppercase tracking-widest">IA Nutricional Activa</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-[#FDF8F5] space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user'
                ? 'bg-[#E8A2AF] text-white rounded-tr-none'
                : 'bg-white text-slate-700 border border-pink-50 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="bg-white text-slate-400 p-3 rounded-2xl text-xs italic flex items-center gap-2 shadow-sm border border-pink-50">
              <Loader2 size={12} className="animate-spin text-[#E8A2AF]" />
              Nutria está escribiendo...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-pink-50 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu duda nutricional..."
            className="flex-1 py-4 px-5 bg-slate-50 rounded-2xl text-sm outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#E8A2AF] transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-4 bg-[#E8A2AF] text-white rounded-2xl shadow-lg active:scale-90 transition-transform disabled:opacity-30"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NutriaChat;
