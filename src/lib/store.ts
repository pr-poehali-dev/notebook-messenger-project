export interface User {
  user_id: number;
  username: string;
  email: string;
  token: string;
  security_question?: string;
}

export function getUser(): User | null {
  const raw = localStorage.getItem("nm_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: User) {
  localStorage.setItem("nm_user", JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem("nm_user");
}
