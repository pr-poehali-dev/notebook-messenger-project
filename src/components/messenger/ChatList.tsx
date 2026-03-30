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
    try {
      const res = await api.chats.list(user.token);
      if (res.chats) setChats(res.chats);
    } catch {
      // silent
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--rule-line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="ink-stamp" style={{ fontSize: '12px', color: 'var(--ink)' }}>ВРЕМЕННЫЕ ЧАТЫ</div>
          <div className="typewriter" style={{ fontSize: '11px', color: 'var(--ink-faded)' }}>удаляются через 24ч</div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="notebook-btn"
          style={{ padding: '4px 8px' }}
          title="Создать чат"
        >
          <Icon name="Plus" size={14} />
        </button>
      </div>

      {/* Create chat form */}
      {showCreate && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--rule-line)', background: 'rgba(44,31,14,0.04)', flexShrink: 0 }} className="animate-fade-in">
          <label className="typewriter" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-faded)' }}>
            Название чата
          </label>
          <input
            className="notebook-input"
            style={{ marginTop: '4px', fontSize: '13px' }}
            value={newChatName}
            onChange={e => setNewChatName(e.target.value)}
            placeholder="Введите название..."
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="notebook-btn notebook-btn-outline" style={{ flex: 1, fontSize: '12px' }} onClick={() => setShowCreate(false)}>Отмена</button>
            <button className="notebook-btn" style={{ flex: 1, fontSize: '12px' }} onClick={handleCreate} disabled={creating}>
              {creating ? "..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      {/* Chat list — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && chats.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <span className="handwritten" style={{ fontSize: '14px', color: 'var(--ink-faded)' }}>Загрузка...</span>
          </div>
        )}
        {!loading && chats.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div className="handwritten" style={{ fontSize: '18px', color: 'var(--ink-faded)', marginBottom: '6px' }}>Пусто</div>
            <p className="typewriter" style={{ fontSize: '11px', color: 'var(--ink-very-faded)' }}>
              Нажмите + чтобы создать<br />первый временный чат
            </p>
          </div>
        )}

        {chats.map(chat => {
          const unread = unreadCounts[String(chat.id)] || 0;
          const isSelected = selectedChatId === chat.id;
          return (
            <div
              key={chat.id}
              onClick={() => handleJoin(chat)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--rule-line)',
                background: isSelected ? 'rgba(44,31,14,0.12)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--ink)' : '3px solid transparent',
                transition: 'all 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="Clock" size={11} style={{ color: 'var(--ink-very-faded)', flexShrink: 0 }} />
                    <span className="typewriter" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.name}
                    </span>
                  </div>
                  <div className="typewriter" style={{ fontSize: '11px', marginTop: '3px', color: 'var(--ink-very-faded)', display: 'flex', gap: '6px' }}>
                    <span>{chat.member_count} уч.</span>
                    <span>·</span>
                    <span style={{ color: unread > 0 ? 'var(--destructive, #8b2222)' : 'var(--ink-very-faded)' }}>
                      ⏱ {getTimeLeft(chat.expires_at)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                  {!chat.is_member && (
                    <span className="typewriter" style={{ fontSize: '10px', color: 'var(--ink-very-faded)' }}>войти</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--rule-line)', flexShrink: 0 }}>
        <button
          onClick={loadChats}
          className="notebook-btn notebook-btn-outline"
          style={{ width: '100%', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Icon name="RefreshCw" size={11} />
          Обновить список
        </button>
      </div>
    </div>
  );
}
