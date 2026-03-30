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
    """Сообщения: отправка, получение, отметка прочитанными"""
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

        if action == "send":
            chat_id = body.get("chat_id")
            content = body.get("content", "").strip()
            if not content:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Сообщение не может быть пустым"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE id = %s AND expires_at > NOW()", (chat_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Чат не найден или истёк"})}

            cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (chat_id, user_id))
            cur.execute(
                f"INSERT INTO {SCHEMA}.messages (chat_id, user_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
                (chat_id, user_id, content)
            )
            msg = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({
                "id": msg[0], "chat_id": chat_id, "user_id": user_id,
                "username": username, "content": content, "created_at": str(msg[1])
            })}

        elif action == "list":
            chat_id = body.get("chat_id")
            limit = body.get("limit", 50)
            offset = body.get("offset", 0)

            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE id = %s AND expires_at > NOW()", (chat_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Чат не найден"})}

            cur.execute(f"""
                SELECT m.id, m.user_id, u.username, m.content, m.is_read, m.created_at
                FROM {SCHEMA}.messages m
                LEFT JOIN {SCHEMA}.users u ON m.user_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
                LIMIT %s OFFSET %s
            """, (chat_id, limit, offset))
            rows = cur.fetchall()
            messages = []
            for r in rows:
                messages.append({
                    "id": r[0], "user_id": r[1], "username": r[2] or "Анонимный",
                    "content": r[3], "is_read": r[4], "created_at": str(r[5]),
                    "is_mine": r[1] == user_id
                })

            cur.execute(
                f"UPDATE {SCHEMA}.messages SET is_read = TRUE WHERE chat_id = %s AND user_id != %s AND is_read = FALSE",
                (chat_id, user_id)
            )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"messages": messages})}

        elif action == "unread_counts":
            cur.execute(f"""
                SELECT m.chat_id, COUNT(*) as unread
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.chat_members cm ON m.chat_id = cm.chat_id AND cm.user_id = %s
                WHERE m.user_id != %s AND m.is_read = FALSE
                GROUP BY m.chat_id
            """, (user_id, user_id))
            rows = cur.fetchall()
            counts = {str(r[0]): r[1] for r in rows}
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"unread_counts": counts})}

        else:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
