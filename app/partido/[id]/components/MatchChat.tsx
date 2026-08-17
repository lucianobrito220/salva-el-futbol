'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Message } from '@/lib/types';
import { Send, MessageCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';

export default function MatchChat({ 
  matchId, 
  chatUnlocked, 
  session, 
  participants 
}: { 
  matchId: string;
  chatUnlocked: boolean;
  session: any;
  participants: Record<string, { name: string; avatar_url: string | null }>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [optimisticMsg, setOptimisticMsg] = useState('');
  const [contactPhone, setContactPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!chatUnlocked) return;

    // Load initial messages
    supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []));

    // Listen for new messages
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, chatUnlocked]);

  async function sendMessage() {
    if (!chatInput.trim() || !session) return;
    const msg = chatInput.trim();
    setChatInput('');
    setOptimisticMsg(msg);
    await supabase.from('messages').insert({ match_id: matchId, sender_id: session.user.id, body: msg });
    setOptimisticMsg('');
  }

  async function loadWhatsApp() {
    const { data, error } = await supabase.rpc('get_contact_phone', { p_match_id: matchId });
    if (error || !data) {
      alert('El contacto se habilita cuando el organizador acepta al jugador.');
      return;
    }
    setContactPhone(data as string);
  }

  if (!chatUnlocked) return null;

  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-3 font-display font-bold">Chat</h3>
      <div className="mb-3 flex max-h-72 flex-col gap-2.5 overflow-y-auto">
        {messages.map((m, i) => {
          const isMe = m.sender_id === session?.user?.id;
          const sender = participants[m.sender_id];
          const showName = !isMe && (i === 0 || messages[i - 1].sender_id !== m.sender_id);
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && (
                <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                  <Avatar name={sender?.name || 'Jugador'} url={sender?.avatar_url} size={16} />
                  <span className="text-[10.5px] font-bold text-inksoft">{sender?.name || 'Jugador'}</span>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMe ? 'bg-brand text-white' : 'border border-line'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        {optimisticMsg && (
          <div className="flex flex-col items-end opacity-60">
            <div className="max-w-[75%] rounded-2xl bg-brand px-3.5 py-2 text-sm text-white">
              {optimisticMsg}
            </div>
          </div>
        )}
        {messages.length === 0 && !optimisticMsg && <p className="text-xs text-inksoft">Todavía no hay mensajes. ¡Saludá!</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribí un mensaje…"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
        />
        <button onClick={sendMessage} className="press-fx flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
          <Send size={16} />
        </button>
      </div>

      {!contactPhone ? (
        <button
          onClick={loadWhatsApp}
          className="press-fx mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
        >
          <MessageCircle size={18} /> Contactar por WhatsApp
        </button>
      ) : (
        <a
          href={`https://wa.me/${contactPhone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="press-fx mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
        >
          <MessageCircle size={18} /> Abrir WhatsApp
        </a>
      )}
    </div>
  );
}
