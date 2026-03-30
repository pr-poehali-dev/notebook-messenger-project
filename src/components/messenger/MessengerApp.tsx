import { useState, useEffect, useCallback } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import ProfilePanel from "./ProfilePanel";
import SettingsPanel from "./SettingsPanel";
import NotificationsPanel from "./NotificationsPanel";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface User {
  user_id: number;
  username: string;
  email: string;
  token: string;
  security_question?: string;
}

interface Props {
  user: User;
  onLogout: () => void;
}

type Tab = "chats" | "profile" | "settings" | "notifications";

export default function MessengerApp({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChatName, setSelectedChatName] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [_showChatOnMobile, setShowChatOnMobile] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.messages.unreadCounts(user.token);
      if (res.unread_counts) {
        setUnreadCounts(res.unread_counts);
        const total = Object.values(res.unread_counts as Record<string, number>).reduce((a, b) => a + b, 0);
        setTotalUnread(total);
        if (total > 0) {
          document.title = `(${total}) NOTEBOOK`;
        } else {
          document.title = "NOTEBOOK";
        }
      }
    } catch {
      // silent
    }
  }, [user.token]);

  useEffect(() => {
    // Запрашиваем разрешение на уведомления не блокируя UI
    setTimeout(() => {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }, 2000);

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      clearInterval(interval);
      document.title = "NOTEBOOK";
    };
  }, [fetchUnread]);

  const handleSelectChat = (id: number, name: string) => {
    setSelectedChatId(id);
    setSelectedChatName(name);
    setShowChatOnMobile(true);
  };

  const handleBackFromChat = () => {
    setShowChatOnMobile(false);
    setSelectedChatId(null);
  };

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "chats", label: "Чаты", icon: "MessageSquare" },
    { id: "notifications", label: "Уведомления", icon: "Bell" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "settings", label: "Настройки", icon: "Settings" },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }}>

      {/* LEFT SIDEBAR — навигация */}
      <div style={{
        width: '200px',
        flexShrink: 0,
        borderRight: '1px solid var(--rule-line)',
        background: 'var(--paper-dark)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--rule-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid var(--ink)', flexShrink: 0
            }}>
              <span className="ink-stamp" style={{ fontSize: '12px', color: 'var(--ink)' }}>N</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ink-stamp" style={{ fontSize: '13px', color: 'var(--ink)' }}>NOTEBOOK</div>
              <div className="typewriter" style={{ fontSize: '11px', color: 'var(--ink-faded)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '8px', flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== "chats") {
                  setSelectedChatId(null);
                  setShowChatOnMobile(false);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                cursor: 'pointer',
                background: activeTab === item.id ? 'rgba(44,31,14,0.12)' : 'transparent',
                borderLeft: activeTab === item.id ? '3px solid var(--ink)' : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: '1px solid transparent',
                color: 'var(--ink)',
                transition: 'all 0.15s',
              }}
            >
              <Icon name={item.icon} size={15} />
              <span className="typewriter" style={{ fontSize: '13px' }}>{item.label}</span>
              {item.id === "notifications" && totalUnread > 0 && (
                <span className="unread-badge" style={{ marginLeft: 'auto' }}>{totalUnread}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Privacy badge */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--rule-line)' }}>
          <div className="stamp-border" style={{ textAlign: 'center' }}>
            <p className="typewriter" style={{ fontSize: '10px', color: 'var(--ink-very-faded)', lineHeight: '1.8' }}>
              🔒 IP скрыт<br />
              📡 Трафик защищён<br />
              ⏱ Чаты временные
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', height: '100vh', overflow: 'hidden', minWidth: 0 }}>

        {activeTab === "chats" && (
          <>
            {/* Chat list — скрыт на мобиле когда открыт чат */}
            <div style={{
              width: '260px',
              flexShrink: 0,
              borderRight: '1px solid var(--rule-line)',
              display: 'flex',
              flexDirection: 'column',
              height: '100vh',
              overflow: 'hidden',
            }}>
              <ChatList
                user={user}
                selectedChatId={selectedChatId}
                onSelectChat={handleSelectChat}
                unreadCounts={unreadCounts}
                onRefreshUnread={fetchUnread}
              />
            </div>

            {/* Chat window or placeholder */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
              {selectedChatId ? (
                <ChatWindow
                  user={user}
                  chatId={selectedChatId}
                  chatName={selectedChatName}
                  onBack={handleBackFromChat}
                  onNewMessage={fetchUnread}
                />
              ) : (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '8px'
                }}>
                  <div className="handwritten" style={{ fontSize: '2rem', color: 'var(--ink-very-faded)' }}>
                    Выберите чат
                  </div>
                  <p className="typewriter" style={{ fontSize: '13px', color: 'var(--ink-very-faded)' }}>
                    или создайте новый временный чат →
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <div style={{ flex: 1, height: '100vh', overflow: 'auto' }}>
            <ProfilePanel user={user} onLogout={onLogout} />
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ flex: 1, height: '100vh', overflow: 'auto' }}>
            <SettingsPanel user={user} />
          </div>
        )}

        {activeTab === "notifications" && (
          <div style={{ flex: 1, height: '100vh', overflow: 'auto' }}>
            <NotificationsPanel unreadCounts={unreadCounts} totalUnread={totalUnread} />
          </div>
        )}
      </div>
    </div>
  );
}