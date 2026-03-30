import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Chat {
  id: number;
  name: string;
  expires_at: string;
  member_count: number;
  unread_count: number;
  is_member: boolean;
}

interface User {
  user_id: number;
  username: string;
  email: string;
  token: string;
}

interface Props {
  user: User;
  selectedChatId: number | null;
  onSelectChat: (id: number, name: string) => void;
  unreadCounts: Record<string, number>;
  onRefreshUnread: () => void;
}

export default function ChatList({ user, selectedChatId, onSelectChat, unreadCounts, onRefreshUnread }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadChats = useCallback(async () => {
    setLoading(true);
    const res = await api.chats.list(user.token);
    if (res.chats) setChats(res.chats);
    setLoading(false);
  }, [user.token]);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 30000);
    return () => clearInterval(interval);
  }, [loadChats]);

  const handleCreate = async () => {
    if (!newChatName.trim()) return;
    setCreating(true);
    const res = await api.chats.create(user.token, newChatName.trim());
    setCreating(false);
    if (res.id) {
      setNewChatName("");
      setShowCreate(false);
      await loadChats();
      onSelectChat(res.id, res.name);
    }
  };

  const handleJoin = async (chat: Chat) => {
    if (!chat.is_member) {
      await api.chats.join(user.token, chat.id);
    }
    onSelectChat(chat.id, chat.name);
    onRefreshUnread();
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "истёк";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins}м`;
  };

  return (
    <div className="w-full md:w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--rule-line)', maxHeight: '100vh' }}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--rule-line)' }}>
        <div>
          <div className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>ВРЕМЕННЫЕ ЧАТЫ</div>
          <div className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>удаляются через 24ч</div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="notebook-btn p-1.5 flex items-center gap-1"
          title="Создать чат"
        >
          <Icon name="Plus" size={14} />
        </button>
      </div>

      {/* Create chat form */}
      {showCreate && (
        <div className="p-3 border-b animate-fade-in" style={{ borderColor: 'var(--rule-line)', background: 'rgba(44,31,14,0.04)' }}>
          <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>
            Название чата
          </label>
          <input
            className="notebook-input mt-1 text-sm"
            value={newChatName}
            onChange={e => setNewChatName(e.target.value)}
            placeholder="Введите название..."
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button className="notebook-btn notebook-btn-outline flex-1 text-xs" onClick={() => setShowCreate(false)}>Отмена</button>
            <button className="notebook-btn flex-1 text-xs" onClick={handleCreate} disabled={creating}>
              {creating ? "..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 && (
          <div className="p-4 text-center">
            <span className="handwritten text-sm" style={{ color: 'var(--ink-faded)' }}>Загрузка...</span>
          </div>
        )}
        {!loading && chats.length === 0 && (
          <div className="p-6 text-center">
            <div className="handwritten text-lg mb-2" style={{ color: 'var(--ink-faded)' }}>Пусто</div>
            <p className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>Создайте первый временный чат</p>
          </div>
        )}
        {chats.map(chat => {
          const unread = unreadCounts[String(chat.id)] || 0;
          return (
            <div
              key={chat.id}
              onClick={() => handleJoin(chat)}
              className={`sidebar-item cursor-pointer ${selectedChatId === chat.id ? "active" : ""}`}
              style={{ borderBottom: `1px solid var(--rule-line)` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon name="Clock" size={12} style={{ color: 'var(--ink-very-faded)', flexShrink: 0 }} />
                    <span className="typewriter text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
                      {chat.name}
                    </span>
                  </div>
                  <div className="typewriter text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--ink-very-faded)' }}>
                    <span>{chat.member_count} уч.</span>
                    <span>·</span>
                    <span style={{ color: unread > 0 ? 'var(--destructive, #8b2222)' : 'var(--ink-very-faded)' }}>
                      ⏱ {getTimeLeft(chat.expires_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                  {!chat.is_member && (
                    <span className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>войти</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--rule-line)' }}>
        <button
          onClick={loadChats}
          className="w-full notebook-btn notebook-btn-outline text-xs flex items-center justify-center gap-2"
        >
          <Icon name="RefreshCw" size={12} />
          Обновить
        </button>
      </div>
    </div>
  );
}
