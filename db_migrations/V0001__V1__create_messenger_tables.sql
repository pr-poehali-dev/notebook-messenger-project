
CREATE TABLE IF NOT EXISTS t_p76912206_notebook_messenger_p.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  security_question VARCHAR(500) NOT NULL,
  security_answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p76912206_notebook_messenger_p.sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p76912206_notebook_messenger_p.users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TABLE IF NOT EXISTS t_p76912206_notebook_messenger_p.chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES t_p76912206_notebook_messenger_p.users(id),
  is_temporary BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 day'),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p76912206_notebook_messenger_p.chat_members (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES t_p76912206_notebook_messenger_p.chats(id),
  user_id INTEGER REFERENCES t_p76912206_notebook_messenger_p.users(id),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p76912206_notebook_messenger_p.messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES t_p76912206_notebook_messenger_p.chats(id),
  user_id INTEGER REFERENCES t_p76912206_notebook_messenger_p.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nm_messages_chat ON t_p76912206_notebook_messenger_p.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_nm_sessions_tok ON t_p76912206_notebook_messenger_p.sessions(token);
CREATE INDEX IF NOT EXISTS idx_nm_chats_exp ON t_p76912206_notebook_messenger_p.chats(expires_at);
