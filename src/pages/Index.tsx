import { useState, useEffect } from "react";
import AuthPage from "@/components/messenger/AuthPage";
import MessengerApp from "@/components/messenger/MessengerApp";
import { getUser, clearUser } from "@/lib/store";
import { api } from "@/lib/api";

export default function Index() {
  const [user, setUser] = useState<{ user_id: number; username: string; email: string; token: string; security_question?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getUser();
    if (stored) {
      api.auth.verifyToken(stored.token).then((res) => {
        if (res.user_id) {
          setUser({ ...stored, ...res });
        } else {
          clearUser();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="handwritten text-2xl" style={{ color: 'var(--ink-faded)' }}>
          Загрузка дневника...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  return <MessengerApp user={user} onLogout={() => { clearUser(); setUser(null); }} />;
}
