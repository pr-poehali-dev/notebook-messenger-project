import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface FoundUser {
  id: number;
  username: string;
  email_hint: string;
  last_seen: string;
}

interface Member {
  id: number;
  username: string;
  last_seen: string;
}

interface Props {
  token: string;
  chatId: number;
  chatName: string;
  currentUserId: number;
  onClose: () => void;
}

export default function InviteModal({ token, chatId, chatName, currentUserId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<number | null>(null);
  const [invited, setInvited] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"search" | "members">("search");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const res = await api.users.chatMembers(token, chatId);
    if (res.members) {
      setMembers(res.members);
      const memberIds = new Set<number>(res.members.map((m: Member) => m.id));
      setInvited(memberIds);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true); setError("");
      const res = await api.users.search(token, query);
      setSearching(false);
      if (res.error) { setError(res.error); return; }
      setResults(res.users || []);
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, token]);

  const handleInvite = async (userId: number) => {
    setInviting(userId); setError("");
    const res = await api.users.inviteToChat(token, chatId, userId);
    setInviting(null);
    if (res.error) { setError(res.error); return; }
    setInvited(prev => new Set([...prev, userId]));
    await loadMembers();
  };

  const formatLastSeen = (dt: string) => {
    const d = new Date(dt);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    return d.toLocaleDateString("ru-RU");
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(44,31,14,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="notebook-page w-full max-w-md mx-4 animate-scale-in" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--rule-line)' }}>
          <div className="flex items-center justify-between ml-4">
            <div>
              <div className="ink-stamp text-lg" style={{ color: 'var(--ink)' }}>ПРИГЛАСИТЬ</div>
              <div className="handwritten text-sm" style={{ color: 'var(--ink-faded)' }}>в чат «{chatName}»</div>
            </div>
            <button onClick={onClose} className="notebook-btn notebook-btn-outline p-1.5">
              <Icon name="X" size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 ml-4">
            <button
              onClick={() => setTab("search")}
              className={`typewriter text-sm pb-1 transition-all ${tab === "search" ? "border-b-2 font-bold" : "opacity-50"}`}
              style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
            >
              Поиск людей
            </button>
            <button
              onClick={() => setTab("members")}
              className={`typewriter text-sm pb-1 transition-all flex items-center gap-2 ${tab === "members" ? "border-b-2 font-bold" : "opacity-50"}`}
              style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
            >
              Участники
              <span className="unread-badge" style={{ fontSize: '0.6rem' }}>{members.length}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "search" && (
            <div className="p-5 ml-4">
              {/* Search input */}
              <div className="relative mb-4">
                <Icon name="Search" size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-very-faded)' }} />
                <input
                  className="notebook-input pl-5"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Введите имя или email..."
                  autoFocus
                />
              </div>

              {error && (
                <p className="typewriter text-xs mb-3" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>
              )}

              {searching && (
                <div className="text-center py-4">
                  <span className="handwritten text-sm" style={{ color: 'var(--ink-faded)' }}>Поиск...</span>
                </div>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <div className="text-center py-6">
                  <div className="handwritten text-lg mb-1" style={{ color: 'var(--ink-very-faded)' }}>Никого не найдено</div>
                  <p className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>Попробуйте другой запрос</p>
                </div>
              )}

              {query.length < 2 && !searching && (
                <div className="text-center py-6">
                  <div className="handwritten text-xl mb-2" style={{ color: 'var(--ink-very-faded)' }}>
                    Кого позовём?
                  </div>
                  <p className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
                    Начните вводить имя или email пользователя
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {results.map(user => {
                  const isInChat = invited.has(user.id);
                  const isLoading = inviting === user.id;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 p-2 animate-fade-in"
                      style={{ borderBottom: '1px solid var(--rule-line)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 flex items-center justify-center border ink-stamp text-sm flex-shrink-0"
                          style={{ borderColor: 'var(--ink-faded)', color: 'var(--ink)' }}
                        >
                          {user.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="typewriter text-sm font-bold" style={{ color: 'var(--ink)' }}>
                            {user.username}
                          </div>
                          <div className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
                            {user.email_hint} · {formatLastSeen(user.last_seen)}
                          </div>
                        </div>
                      </div>
                      <div>
                        {isInChat ? (
                          <span className="stamp-border typewriter text-xs" style={{ color: '#3a7a3a' }}>
                            В чате ✓
                          </span>
                        ) : (
                          <button
                            className="notebook-btn text-xs flex items-center gap-1"
                            onClick={() => handleInvite(user.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Icon name="Loader" size={12} />
                            ) : (
                              <Icon name="UserPlus" size={12} />
                            )}
                            {isLoading ? "..." : "Пригласить"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="p-5 ml-4">
              {members.length === 0 ? (
                <div className="text-center py-6">
                  <span className="handwritten text-lg" style={{ color: 'var(--ink-very-faded)' }}>Нет участников</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 animate-fade-in"
                      style={{ borderBottom: '1px solid var(--rule-line)' }}
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center border ink-stamp text-sm flex-shrink-0"
                        style={{
                          borderColor: member.id === currentUserId ? 'var(--ink)' : 'var(--ink-faded)',
                          color: 'var(--ink)',
                          background: member.id === currentUserId ? 'rgba(44,31,14,0.08)' : 'transparent'
                        }}
                      >
                        {member.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="typewriter text-sm font-bold" style={{ color: 'var(--ink)' }}>
                          {member.username}
                          {member.id === currentUserId && (
                            <span className="ml-2 handwritten text-xs" style={{ color: 'var(--ink-faded)' }}>
                              (вы)
                            </span>
                          )}
                        </div>
                        <div className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
                          {formatLastSeen(member.last_seen)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--rule-line)' }}>
          <p className="typewriter text-xs text-center" style={{ color: 'var(--ink-very-faded)' }}>
            Email показывается частично · приватность защищена
          </p>
        </div>
      </div>
    </div>
  );
}
