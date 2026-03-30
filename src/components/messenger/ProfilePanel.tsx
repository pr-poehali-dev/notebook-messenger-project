import { useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

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

type Modal = null | "logout" | "delete" | "change_password";

export default function ProfilePanel({ user, onLogout }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [password, setPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetFields = () => {
    setPassword(""); setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setError(""); setSuccess("");
  };

  const openModal = (m: Modal) => { resetFields(); setModal(m); };

  const handleLogout = async () => {
    if (!password) { setError("Введите пароль"); return; }
    setLoading(true); setError("");
    const res = await api.auth.logout(user.token, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onLogout();
  };

  const handleDeleteAccount = async () => {
    if (!password) { setError("Введите пароль"); return; }
    setLoading(true); setError("");
    const res = await api.auth.deleteAccount(user.token, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onLogout();
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { setError("Заполните все поля"); return; }
    if (newPassword.length < 6) { setError("Новый пароль — минимум 6 символов"); return; }
    if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    setLoading(true); setError("");
    const res = await api.auth.changePassword(user.token, oldPassword, newPassword);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSuccess("Пароль успешно изменён!");
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block tape-strip mb-3">
            <span className="handwritten" style={{ color: 'var(--ink)' }}>страница профиля</span>
          </div>
          <h1 className="ink-stamp text-2xl" style={{ color: 'var(--ink)' }}>МОЙ ПРОФИЛЬ</h1>
        </div>

        {/* User info */}
        <div className="notebook-page p-6 mb-6">
          <div className="ml-4 space-y-4">
            <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--rule-line)' }}>
              <div className="w-12 h-12 flex items-center justify-center border-2 ink-stamp text-xl" style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}>
                {user.username[0]?.toUpperCase()}
              </div>
              <div>
                <div className="ink-stamp text-lg" style={{ color: 'var(--ink)' }}>{user.username}</div>
                <div className="typewriter text-sm" style={{ color: 'var(--ink-faded)' }}>{user.email}</div>
              </div>
            </div>

            {user.security_question && (
              <div>
                <div className="typewriter text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-faded)' }}>Контрольный вопрос</div>
                <div className="handwritten text-sm" style={{ color: 'var(--ink)' }}>{user.security_question}</div>
              </div>
            )}

            <div className="stamp-border inline-block">
              <span className="typewriter text-xs" style={{ color: 'var(--ink-very-faded)' }}>
                ID: #{user.user_id} · защищён 2FA
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="typewriter text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faded)' }}>
            Управление аккаунтом
          </div>

          <button
            onClick={() => openModal("change_password")}
            className="w-full notebook-btn notebook-btn-outline flex items-center gap-3 text-left p-3"
          >
            <Icon name="Key" size={16} />
            <div>
              <div className="ink-stamp text-sm">СМЕНИТЬ ПАРОЛЬ</div>
              <div className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>Изменить пароль от аккаунта</div>
            </div>
          </button>

          <button
            onClick={() => openModal("logout")}
            className="w-full notebook-btn notebook-btn-outline flex items-center gap-3 text-left p-3"
          >
            <Icon name="LogOut" size={16} />
            <div>
              <div className="ink-stamp text-sm">ВЫЙТИ ИЗ АККАУНТА</div>
              <div className="typewriter text-xs" style={{ color: 'var(--ink-faded)' }}>Потребуется подтверждение паролем</div>
            </div>
          </button>

          <button
            onClick={() => openModal("delete")}
            className="w-full notebook-btn notebook-btn-danger flex items-center gap-3 text-left p-3"
          >
            <Icon name="Trash2" size={16} />
            <div>
              <div className="ink-stamp text-sm">УДАЛИТЬ АККАУНТ</div>
              <div className="typewriter text-xs" style={{ opacity: 0.7 }}>Необратимое действие</div>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(44,31,14,0.5)' }}>
          <div className="notebook-page p-6 w-full max-w-sm mx-4 animate-scale-in">
            <div className="ml-4">
              {modal === "change_password" && (
                <>
                  <h2 className="ink-stamp text-xl mb-4" style={{ color: 'var(--ink)' }}>СМЕНИТЬ ПАРОЛЬ</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Текущий пароль</label>
                      <input className="notebook-input mt-1" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Новый пароль</label>
                      <input className="notebook-input mt-1" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="мин. 6 символов" />
                    </div>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Подтвердите новый пароль</label>
                      <input className="notebook-input mt-1" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    {error && <p className="typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                    {success && <p className="typewriter text-xs" style={{ color: '#3a7a3a' }}>{success}</p>}
                    <div className="flex gap-3 pt-2">
                      <button className="notebook-btn notebook-btn-outline flex-1" onClick={() => { setModal(null); resetFields(); }}>Отмена</button>
                      <button className="notebook-btn flex-1" onClick={handleChangePassword} disabled={loading}>
                        {loading ? "..." : "Изменить"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {modal === "logout" && (
                <>
                  <h2 className="ink-stamp text-xl mb-2" style={{ color: 'var(--ink)' }}>ВЫХОД</h2>
                  <p className="handwritten text-sm mb-4" style={{ color: 'var(--ink-faded)' }}>
                    Для подтверждения введите пароль:
                  </p>
                  <input className="notebook-input mb-3" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ваш пароль" onKeyDown={e => e.key === 'Enter' && handleLogout()} autoFocus />
                  {error && <p className="typewriter text-xs mb-3" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                  <div className="flex gap-3">
                    <button className="notebook-btn notebook-btn-outline flex-1" onClick={() => { setModal(null); resetFields(); }}>Отмена</button>
                    <button className="notebook-btn flex-1" onClick={handleLogout} disabled={loading}>
                      {loading ? "..." : "Выйти"}
                    </button>
                  </div>
                </>
              )}

              {modal === "delete" && (
                <>
                  <h2 className="ink-stamp text-xl mb-2" style={{ color: 'var(--destructive, #8b2222)' }}>УДАЛЕНИЕ АККАУНТА</h2>
                  <p className="handwritten text-sm mb-4" style={{ color: 'var(--ink-faded)' }}>
                    Это необратимо! Введите пароль для подтверждения:
                  </p>
                  <input className="notebook-input mb-3" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ваш пароль" autoFocus />
                  {error && <p className="typewriter text-xs mb-3" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                  <div className="flex gap-3">
                    <button className="notebook-btn notebook-btn-outline flex-1" onClick={() => { setModal(null); resetFields(); }}>Отмена</button>
                    <button className="notebook-btn notebook-btn-danger flex-1" onClick={handleDeleteAccount} disabled={loading}>
                      {loading ? "..." : "Удалить"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}