import json
import os
import psycopg2

SCHEMA = "t_p76912206_notebook_messenger_p"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
        "Content-Type": "application/json"
    }


def get_user_from_token(cur, token):
    cur.execute(
        f"SELECT s.user_id, u.username FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Управление временными чатами: создание, список, вступление, удаление истёкших"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")
    token = body.get("token", "")
    conn = get_conn()
    cur = conn.cursor()

    try:
        row = get_user_from_token(cur, token)
        if not row:
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Не авторизован"})}
        user_id, username = row

        if action == "cleanup_expired":
            cur.execute(f"UPDATE {SCHEMA}.messages SET content = '[Сообщение удалено]' WHERE chat_id IN (SELECT id FROM {SCHEMA}.chats WHERE is_temporary = TRUE AND expires_at < NOW())")
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "create":
            name = body.get("name", "").strip()
            if not name:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Название чата обязательно"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.chats (name, created_by, is_temporary, expires_at) VALUES (%s, %s, TRUE, NOW() + INTERVAL '1 day') RETURNING id, name, expires_at",
                (name, user_id)
            )
            chat = cur.fetchone()
            chat_id = chat[0]
            cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({
                "id": chat[0], "name": chat[1], "expires_at": str(chat[2])
            })}

        elif action == "list":
            cur.execute(f"""
                SELECT c.id, c.name, c.expires_at, c.created_at,
                       COUNT(DISTINCT cm.user_id) as member_count,
                       COUNT(DISTINCT CASE WHEN m.is_read = FALSE AND m.user_id != %s THEN m.id END) as unread_count,
                       CASE WHEN cm2.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_member
                FROM {SCHEMA}.chats c
                LEFT JOIN {SCHEMA}.chat_members cm ON c.id = cm.chat_id
                LEFT JOIN {SCHEMA}.messages m ON c.id = m.chat_id
                LEFT JOIN {SCHEMA}.chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = %s
                WHERE c.is_temporary = TRUE AND c.expires_at > NOW()
                GROUP BY c.id, c.name, c.expires_at, c.created_at, cm2.user_id
                ORDER BY c.created_at DESC
            """, (user_id, user_id))
            rows = cur.fetchall()
            chats = []
            for r in rows:
                chats.append({
                    "id": r[0], "name": r[1], "expires_at": str(r[2]),
                    "created_at": str(r[3]), "member_count": r[4],
                    "unread_count": r[5], "is_member": r[6]
                })
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"chats": chats})}

        elif action == "join":
            chat_id = body.get("chat_id")
            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE id = %s AND expires_at > NOW()", (chat_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Чат не найден или истёк"})}
            cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "leave":
            chat_id = body.get("chat_id")
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET user_id = user_id WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        else:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
