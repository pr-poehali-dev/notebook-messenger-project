const AUTH_URL = "https://functions.poehali.dev/ab3f775c-e587-423a-85ff-13c484227ac7";
const CHATS_URL = "https://functions.poehali.dev/5c496716-4c3f-407d-960e-61721aa1d0e6";
const MESSAGES_URL = "https://functions.poehali.dev/efef0460-b895-4dcb-8555-b5a8f6340626";

async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; username: string; security_question: string; security_answer: string }) =>
      post(AUTH_URL, { action: "register", ...data }),
    login: (data: { email: string; password: string; security_answer: string }) =>
      post(AUTH_URL, { action: "login", ...data }),
    getSecurityQuestion: (email: string) =>
      post(AUTH_URL, { action: "get_security_question", email }),
    logout: (token: string, password: string) =>
      post(AUTH_URL, { action: "logout", token, password }),
    changePassword: (token: string, old_password: string, new_password: string) =>
      post(AUTH_URL, { action: "change_password", token, old_password, new_password }),
    deleteAccount: (token: string, password: string) =>
      post(AUTH_URL, { action: "delete_account", token, password }),
    verifyToken: (token: string) =>
      post(AUTH_URL, { action: "verify_token", token }),
  },
  chats: {
    list: (token: string) =>
      post(CHATS_URL, { action: "list", token }),
    create: (token: string, name: string) =>
      post(CHATS_URL, { action: "create", token, name }),
    join: (token: string, chat_id: number) =>
      post(CHATS_URL, { action: "join", token, chat_id }),
    cleanup: (token: string) =>
      post(CHATS_URL, { action: "cleanup_expired", token }),
  },
  messages: {
    list: (token: string, chat_id: number, limit?: number, offset?: number) =>
      post(MESSAGES_URL, { action: "list", token, chat_id, limit: limit || 50, offset: offset || 0 }),
    send: (token: string, chat_id: number, content: string) =>
      post(MESSAGES_URL, { action: "send", token, chat_id, content }),
    unreadCounts: (token: string) =>
      post(MESSAGES_URL, { action: "unread_counts", token }),
  },
};
