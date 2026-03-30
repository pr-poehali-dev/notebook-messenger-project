import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface User {
  user_id: number;
  username: string;
  email: string;
  token: string;
}

interface Props {
  user: User;
}

export default function SettingsPanel({ user }: Props) {
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("nm_sound") !== "false");
  const [autoClean, setAutoClean] = useState(() => localStorage.getItem("nm_autoclean") !== "false");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotifPermission(Notification.permission);
    setNotifEnabled(Notification.permission === "granted");
  }, []);

  const requestNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    setNotifEnabled(perm === "granted");
  };

  const handleSave = () => {
    localStorage.setItem("nm_sound", String(soundEnabled));
    localStorage.setItem("nm_autoclean", String(autoClean));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const settingSections = [
    {
      title: "Конфиденциальность",
      icon: "Shield",
      items: [
        { label: "Скрытие IP адреса", description: "Ваш реальный IP не передаётся собеседникам. Сервер видит только проксированный адрес.", active: true, readonly: true },
        { label: "Шифрование трафика", description: "Все данные передаются по HTTPS. Оператор видит только факт соединения, не содержимое.", active: true, readonly: true },
        { label: "Временные чаты", description: "Все сообщения автоматически удаляются через 24 часа с момента создания чата.", active: true, readonly: true },
      ]
    },
    {
      title: "Уведомления",
      icon: "Bell",
      items: []
    },
    {
      title: "Данные",
      icon: "Database",
      items: [
        { label: "Автоочистка истёкших чатов", description: "Автоматически убирать истёкшие чаты из списка.", active: autoClean, readonly: false, toggle: () => setAutoClean(!autoClean) },
        { label: "Звуковые уведомления", description: "Воспроизводить системный звук при новом сообщении.", active: soundEnabled, readonly: false, toggle: () => setSoundEnabled(!soundEnabled) },
      ]
    }
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <div className="inline-block tape-strip mb-3">
            <span className="handwritten" style={{ color: 'var(--ink)' }}>параметры системы</span>
          </div>
          <h1 className="ink-stamp text-2xl" style={{ color: 'var(--ink)' }}>НАСТРОЙКИ</h1>
        </div>

        {settingSections.map(section => (
          <div key={section.title} className="notebook-page p-5 mb-5">
            <div className="ml-4">
              <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid var(--rule-line)' }}>
                <Icon name={section.icon} size={16} style={{ color: 'var(--ink-faded)' }} />
                <span className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>{section.title.toUpperCase()}</span>
              </div>

              {section.title === "Уведомления" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="typewriter text-sm font-bold" style={{ color: 'var(--ink)' }}>
                        Браузерные уведомления
                      </div>
                      <div className="typewriter text-xs mt-0.5" style={{ color: 'var(--ink-faded)' }}>
                        Уведомления о новых сообщениях через браузер
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notifPermission === "denied" ? (
                        <span className="stamp-border typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>Заблокированы</span>
                      ) : notifEnabled ? (
                        <span className="stamp-border typewriter text-xs" style={{ color: '#3a7a3a' }}>Включены ✓</span>
                      ) : (
                        <button className="notebook-btn text-xs" onClick={requestNotifications}>
                          Включить
                        </button>
                      )}
                    </div>
                  </div>

                  {notifPermission === "denied" && (
                    <div className="p-3" style={{ background: 'rgba(139,34,34,0.06)', border: '1px solid rgba(139,34,34,0.2)' }}>
                      <p className="typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>
                        Уведомления заблокированы в браузере. Разрешите их в настройках браузера → Настройки сайта.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {section.items.map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="typewriter text-sm font-bold" style={{ color: 'var(--ink)' }}>{item.label}</div>
                    <div className="typewriter text-xs mt-0.5" style={{ color: 'var(--ink-faded)' }}>{item.description}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.readonly ? (
                      <span className="stamp-border typewriter text-xs" style={{ color: '#3a7a3a' }}>Активно ✓</span>
                    ) : (
                      <button
                        onClick={item.toggle}
                        className={`w-10 h-5 relative rounded-sm transition-all ${item.active ? 'bg-opacity-100' : 'bg-opacity-20'}`}
                        style={{
                          background: item.active ? 'var(--ink)' : 'var(--rule-line)',
                          border: '1px solid var(--ink-faded)'
                        }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 transition-all"
                          style={{
                            background: 'var(--paper)',
                            left: item.active ? '20px' : '2px',
                            borderRadius: '1px'
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Info section */}
        <div className="notebook-page p-5 mb-5">
          <div className="ml-4">
            <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid var(--rule-line)' }}>
              <Icon name="Info" size={16} style={{ color: 'var(--ink-faded)' }} />
              <span className="ink-stamp text-sm" style={{ color: 'var(--ink)' }}>О СИСТЕМЕ</span>
            </div>
            <div className="space-y-2">
              {[
                ["Пользователь", `${user.username} (#${user.user_id})`],
                ["Email", user.email],
                ["Хранение данных", "Только на сервере, без облачных копий"],
                ["Тип чатов", "Только временные (24ч)"],
                ["Шифрование", "HTTPS + хэширование паролей (SHA-256)"],
                ["2FA", "Контрольный вопрос + пароль"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="typewriter text-xs w-36 flex-shrink-0" style={{ color: 'var(--ink-faded)' }}>{k}:</span>
                  <span className="typewriter text-xs" style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="notebook-btn w-full flex items-center justify-center gap-2">
          <Icon name="Save" size={14} />
          {saved ? "Сохранено ✓" : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}