import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import InviteModal from "./InviteModal";

interface Message {
  id: number;
  user_id: number;
  username: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

interface User {
  user_id: number;
  username: string;
  email: string;
  token: string;
}

interface Props {
  user: User;
  chatId: number;
  chatName: string;
  onBack: () => void;
  onNewMessage: () => void;
}

export default function ChatWindow({ user, chatId, chatName, onBack, onNewMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    const res = await api.messages.list(user.token, chatId);
    if (res.messages) {
      const newCount = res.messages.length;
      if (newCount > prevCountRef.current) {
        if (prevCountRef.current > 0 && Notification.permission === "granted") {
          const lastMsg = res.messages[res.messages.length - 1];
          if (!lastMsg.is_mine) {
            new Notification(`NOTEBOOK — ${chatName}`, {
              body: `${lastMsg.username}: ${lastMsg.content.slice(0, 60)}`,
              icon: "/favicon.svg"
            });
          }
        }
        prevCountRef.current = newCount;
      }
      setMessages(res.messages);
      onNewMessage();
    }
  }, [user.token, chatId, chatName, onNewMessage]);

  useEffect(() => {
    setMessages([]);
    prevCountRef.current = 0;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [chatId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");
    const res = await api.messages.send(user.token, chatId, text);
    setSending(false);
    if (res.id) {
      await loadMessages();
    }
  };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dt: string) => {
    return new Date(dt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  let lastDate = "";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-line)', background: 'var(--paper-dark)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ink-stamp" style={{ fontSize: '13px', color: 'var(--ink)' }}>{chatName}</div>
          <div className="typewriter" style={{ fontSize: '11px', color: 'var(--ink-faded)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="Clock" size={10} />
            <span>Временный · исчезнет через 24ч</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div className="stamp-border">
            <span className="typewriter" style={{ fontSize: '10px', color: 'var(--ink-very-faded)' }}>🔒 IP скрыт</span>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="notebook-btn"
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px' }}
            title="Пригласить пользователя"
          >
            <Icon name="UserPlus" size={12} />
            Пригласить
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && (
          <div className="text-center py-8">
            <span className="handwritten text-lg" style={{ color: 'var(--ink-faded)' }}>Загрузка...</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="handwritten text-2xl mb-2" style={{ color: 'var(--ink-very-faded)' }}>
              Начните разговор
            </div>
            <p className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
              Все сообщения исчезнут через 24 часа
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const msgDate = formatDate(msg.created_at);
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="typewriter text-xs px-3 py-1" style={{ color: 'var(--ink-very-faded)', background: 'rgba(200,184,154,0.3)', borderRadius: '1px' }}>
                    {msgDate}
                  </span>
                </div>
              )}
              <div className={`flex ${msg.is_mine ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${msg.is_mine ? "chat-bubble-mine" : "chat-bubble-other"} p-2.5`}>
                  {!msg.is_mine && (
                    <div className="typewriter text-xs font-bold mb-1" style={{ color: 'var(--ink-faded)' }}>
                      {msg.username}
                    </div>
                  )}
                  <p className="typewriter text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--ink)' }}>
                    {msg.content}
                  </p>
                  <div className="flex items-center justify-between mt-1 gap-3">
                    <span className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.is_mine && (
                      <Icon name={msg.is_read ? "CheckCheck" : "Check"} size={12} style={{ color: 'var(--ink-very-faded)' }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--rule-line)', background: 'var(--paper-dark)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            className="notebook-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Напишите сообщение... (Enter — отправить)"
            rows={2}
            style={{ flex: 1, resize: 'none', fontSize: '13px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="notebook-btn"
            style={{ padding: '6px 10px', opacity: !input.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Icon name="Send" size={14} />
          </button>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          token={user.token}
          chatId={chatId}
          chatName={chatName}
          currentUserId={user.user_id}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}