import Icon from "@/components/ui/icon";

interface Props {
  unreadCounts: Record<string, number>;
  totalUnread: number;
}

export default function NotificationsPanel({ unreadCounts, totalUnread }: Props) {
  const entries = Object.entries(unreadCounts).filter(([, count]) => count > 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: '100vh' }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <div className="inline-block tape-strip mb-3">
            <span className="handwritten" style={{ color: 'var(--ink)' }}>входящие</span>
          </div>
          <h1 className="ink-stamp text-2xl" style={{ color: 'var(--ink)' }}>УВЕДОМЛЕНИЯ</h1>
        </div>

        {/* Summary */}
        <div className="notebook-page p-5 mb-5">
          <div className="ml-4 flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center border-2 ink-stamp text-2xl" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>
              {totalUnread}
            </div>
            <div>
              <div className="ink-stamp text-lg" style={{ color: 'var(--ink)' }}>
                {totalUnread === 0 ? "ВСЁ ПРОЧИТАНО" : `НЕПРОЧИТАННЫХ`}
              </div>
              <div className="handwritten text-sm" style={{ color: 'var(--ink-faded)' }}>
                {totalUnread === 0
                  ? "Нет новых сообщений"
                  : `${totalUnread} сообщений ждут вас`}
              </div>
            </div>
          </div>
        </div>

        {/* Per-chat breakdown */}
        {entries.length > 0 && (
          <div className="notebook-page p-5 mb-5">
            <div className="ml-4">
              <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--rule-line)' }}>
                <Icon name="MessageSquare" size={16} style={{ color: 'var(--ink-faded)' }} />
                <span className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>ПО ЧАТАМ</span>
              </div>
              <div className="space-y-3">
                {entries.map(([chatId, count]) => (
                  <div key={chatId} className="flex items-center justify-between">
                    <div className="typewriter text-sm" style={{ color: 'var(--ink)' }}>
                      Чат #{chatId}
                    </div>
                    <span className="unread-badge">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notification settings info */}
        <div className="notebook-page p-5">
          <div className="ml-4">
            <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--rule-line)' }}>
              <Icon name="Bell" size={16} style={{ color: 'var(--ink-faded)' }} />
              <span className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>ЗВУКОВЫЕ УВЕДОМЛЕНИЯ</span>
            </div>

            <div className="space-y-3">
              <p className="typewriter text-sm" style={{ color: 'var(--ink-faded)', lineHeight: '1.6' }}>
                Браузер отправляет push-уведомления о новых сообщениях в реальном времени.
              </p>

              <div className="flex items-center gap-3">
                <div className="stamp-border">
                  <span className="typewriter text-xs" style={{ color: Notification.permission === "granted" ? '#3a7a3a' : 'var(--destructive, #8b2222)' }}>
                    {Notification.permission === "granted" ? "🔔 Включены" : "🔕 Отключены"}
                  </span>
                </div>
                {Notification.permission !== "granted" && (
                  <button
                    className="notebook-btn text-xs"
                    onClick={() => Notification.requestPermission()}
                  >
                    Включить уведомления
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--rule-line)' }}>
                <p className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>
                  Уведомления обновляются каждые 15 секунд автоматически.
                </p>
                <p className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>
                  Внутри чата — каждые 5 секунд.
                </p>
              </div>
            </div>
          </div>
        </div>

        {totalUnread === 0 && entries.length === 0 && (
          <div className="text-center py-8">
            <div className="handwritten text-3xl mb-3" style={{ color: 'var(--ink-very-faded)' }}>
              Тишина
            </div>
            <p className="typewriter text-sm" style={{ color: 'var(--ink-very-faded)' }}>
              Все сообщения прочитаны
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
