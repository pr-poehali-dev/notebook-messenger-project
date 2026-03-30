import { useState } from "react";
import { api } from "@/lib/api";
import { setUser } from "@/lib/store";

interface Props {
  onLogin: (user: { user_id: number; username: string; email: string; token: string; security_question?: string }) => void;
}

const SECURITY_QUESTIONS = [
  "Имя вашего первого питомца?",
  "Девичья фамилия матери?",
  "Название вашей первой школы?",
  "Любимая книга в детстве?",
  "Имя лучшего друга детства?",
  "Город, в котором вы родились?",
];

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [fetchedQuestion, setFetchedQuestion] = useState("");

  const handleGetQuestion = async () => {
    if (!email) { setError("Введите email"); return; }
    setLoading(true); setError("");
    const res = await api.auth.getSecurityQuestion(email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setFetchedQuestion(res.security_question);
    setStep(2);
  };

  const handleLogin = async () => {
    if (!password || !securityAnswer) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    const res = await api.auth.login({ email, password, security_answer: securityAnswer });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    const userData = { user_id: res.user_id, username: res.username, email: res.email, token: res.token, security_question: res.security_question };
    setUser(userData);
    onLogin(userData);
  };

  const handleRegister = async () => {
    if (!email || !password || !username || !securityAnswer) { setError("Заполните все поля"); return; }
    if (password.length < 6) { setError("Пароль не менее 6 символов"); return; }
    setLoading(true); setError("");
    const res = await api.auth.register({ email, password, username, security_question: securityQuestion, security_answer: securityAnswer });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    const userData = { user_id: res.user_id, username, email, token: res.token, security_question: securityQuestion };
    setUser(userData);
    onLogin(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block tape-strip mb-4">
            <span className="handwritten text-lg" style={{ color: 'var(--ink)' }}>личный дневник</span>
          </div>
          <h1 className="ink-stamp text-3xl mb-1" style={{ color: 'var(--ink)' }}>
            NOTEBOOK
          </h1>
          <p className="typewriter text-sm" style={{ color: 'var(--ink-faded)' }}>
            — защищённый мессенджер —
          </p>
        </div>

        {/* Paper card */}
        <div className="notebook-page p-8 relative">
          {/* Hole punch */}
          <div className="absolute left-5 top-8 w-3 h-3 rounded-full" style={{ background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
          <div className="absolute left-5 top-1/2 w-3 h-3 rounded-full" style={{ background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />

          <div className="ml-8">
            {/* Mode tabs */}
            <div className="flex gap-6 mb-6 border-b" style={{ borderColor: 'var(--rule-line)' }}>
              <button
                onClick={() => { setMode("login"); setStep(1); setError(""); }}
                className={`typewriter text-sm pb-2 transition-all ${mode === "login" ? "border-b-2 font-bold" : "opacity-50"}`}
                style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
              >
                Войти
              </button>
              <button
                onClick={() => { setMode("register"); setStep(1); setError(""); }}
                className={`typewriter text-sm pb-2 transition-all ${mode === "register" ? "border-b-2 font-bold" : "opacity-50"}`}
                style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
              >
                Регистрация
              </button>
            </div>

            {mode === "login" && (
              <div className="space-y-5 animate-fade-in">
                {step === 1 && (
                  <>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Email</label>
                      <input className="notebook-input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ваш@email.com" onKeyDown={e => e.key === 'Enter' && handleGetQuestion()} />
                    </div>
                    {error && <p className="typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                    <button className="notebook-btn w-full" onClick={handleGetQuestion} disabled={loading}>
                      {loading ? "Поиск..." : "Продолжить →"}
                    </button>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Контрольный вопрос</label>
                      <p className="handwritten text-sm mt-1" style={{ color: 'var(--ink)' }}>{fetchedQuestion}</p>
                    </div>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Ответ</label>
                      <input className="notebook-input mt-1" type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} placeholder="Ваш ответ..." />
                    </div>
                    <div>
                      <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Пароль</label>
                      <input className="notebook-input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                    {error && <p className="typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                    <div className="flex gap-3">
                      <button className="notebook-btn notebook-btn-outline flex-1" onClick={() => { setStep(1); setError(""); }}>← Назад</button>
                      <button className="notebook-btn flex-1" onClick={handleLogin} disabled={loading}>{loading ? "Вход..." : "Войти"}</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Имя пользователя</label>
                  <input className="notebook-input mt-1" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Как вас называть?" />
                </div>
                <div>
                  <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Email</label>
                  <input className="notebook-input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ваш@email.com" />
                </div>
                <div>
                  <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Пароль (мин. 6 символов)</label>
                  <input className="notebook-input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <hr className="section-divider" />
                <p className="handwritten text-sm" style={{ color: 'var(--ink-faded)' }}>
                  Двухфакторная защита — контрольный вопрос:
                </p>
                <div>
                  <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Вопрос</label>
                  <select
                    className="notebook-input mt-1 cursor-pointer"
                    value={securityQuestion}
                    onChange={e => setSecurityQuestion(e.target.value)}
                    style={{ background: 'transparent' }}
                  >
                    {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="typewriter text-xs uppercase tracking-widest" style={{ color: 'var(--ink-faded)' }}>Ответ</label>
                  <input className="notebook-input mt-1" type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} placeholder="Запомните этот ответ!" />
                </div>
                {error && <p className="typewriter text-xs" style={{ color: 'var(--destructive, #8b2222)' }}>{error}</p>}
                <button className="notebook-btn w-full" onClick={handleRegister} disabled={loading}>
                  {loading ? "Регистрация..." : "Создать аккаунт"}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center typewriter text-xs mt-4" style={{ color: 'var(--ink-very-faded)' }}>
          IP скрыт · Активность зашифрована · Чаты временные
        </p>
      </div>
    </div>
  );
}
