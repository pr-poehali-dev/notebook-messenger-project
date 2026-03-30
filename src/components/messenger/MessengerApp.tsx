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

  const fetchUnread = useCallback(async () => {
    const res = await api.messages.unreadCounts(user.token);
    if (res.unread_counts) {
      setUnreadCounts(res.unread_counts);
      const total = Object.values(res.unread_counts as Record<string, number>).reduce((a, b) => a + b, 0);
      setTotalUnread(total);
      if (total > 0) {
        document.title = `(${total}) NOTEBOOK`;
        if (Notification.permission === "granted") {
          new Notification("NOTEBOOK", { body: `${total} непрочитанных сообщений`, icon: "/favicon.svg" });
        }
      } else {
        document.title = "NOTEBOOK";
      }
    }
  }, [user.token]);

  useEffect(() => {
    Notification.requestPermission();
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => { clearInterval(interval); document.title = "NOTEBOOK"; };
  }, [fetchUnread]);

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "chats", label: "Чаты", icon: "MessageSquare" },
    { id: "notifications", label: "Уведомления", icon: "Bell" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "settings", label: "Настройки", icon: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--paper)' }}>
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 border-r" style={{ borderColor: 'var(--rule-line)', background: 'var(--paper-dark)' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--rule-line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border-2" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>
              <span className="ink-stamp text-xs">N</span>
            </div>
            <div>
              <div className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>NOTEBOOK</div>
              <div className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>{user.username}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id !== "chats") setSelectedChatId(null); }}
              className={`sidebar-item w-full text-left flex items-center gap-3 rounded-sm ${activeTab === item.id ? "active" : ""}`}
              style={{ color: 'var(--ink)' }}
            >
              <Icon name={item.icon} size={16} />
              <span className="typewriter text-sm">{item.label}</span>
              {item.id === "notifications" && totalUnread > 0 && (
                <span className="ml-auto unread-badge">{totalUnread}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Privacy notice */}
        <div className="p-4 mt-auto">
          <div className="stamp-border text-center">
            <p className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)', lineHeight: '1.6' }}>
              🔒 IP скрыт<br />
              📡 Трафик защищён<br />
              ⏱ Чаты временные
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "chats" && (
          <>
            <ChatList
              user={user}
              selectedChatId={selectedChatId}
              onSelectChat={(id, name) => { setSelectedChatId(id); setSelectedChatName(name); }}
              unreadCounts={unreadCounts}
              onRefreshUnread={fetchUnread}
            />
            {selectedChatId ? (
              <ChatWindow
                user={user}
                chatId={selectedChatId}
                chatName={selectedChatName}
                onBack={() => setSelectedChatId(null)}
                onNewMessage={fetchUnread}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center animate-fade-in">
                  <div className="handwritten text-4xl mb-3" style={{ color: 'var(--ink-very-faded)' }}>
                    Выберите чат
                  </div>
                  <p className="typewriter text-sm" style={{ color: 'var(--ink-very-faded)' }}>
                    или создайте новый временный чат
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "profile" && (
          <ProfilePanel user={user} onLogout={onLogout} />
        )}

        {activeTab === "settings" && (
          <SettingsPanel user={user} />
        )}

        {activeTab === "notifications" && (
          <NotificationsPanel unreadCounts={unreadCounts} totalUnread={totalUnread} />
        )}
      </div>
    </div>
  );
}
