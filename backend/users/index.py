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
    """Поиск пользователей по имени и приглашение в чат"""
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

        if action == "search":
            query = body.get("query", "").strip()
            if len(query) < 2:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Минимум 2 символа для поиска"})}

            like_query = f"%{query}%"
            cur.execute(f"""
                SELECT id, username, email, last_seen
                FROM {SCHEMA}.users
                WHERE (username ILIKE %s OR email ILIKE %s)
                  AND id != %s
                  AND email NOT LIKE 'deleted_%%'
                ORDER BY last_seen DESC
                LIMIT 20
            """, (like_query, like_query, user_id))
            rows = cur.fetchall()
            users = [
                {
                    "id": r[0],
                    "username": r[1],
                    "email_hint": r[2][:3] + "***@" + r[2].split("@")[-1] if "@" in r[2] else "***",
                    "last_seen": str(r[3])
                }
                for r in rows
            ]
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"users": users})}

        elif action == "invite_to_chat":
            chat_id = body.get("chat_id")
            invite_user_id = body.get("invite_user_id")

            if not chat_id or not invite_user_id:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "chat_id и invite_user_id обязательны"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE id = %s AND expires_at > NOW()", (chat_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Чат не найден или истёк"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 403, "headers": cors_headers(), "body": json.dumps({"error": "Вы не состоите в этом чате"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND email NOT LIKE 'deleted_%%'", (invite_user_id,))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Пользователь не найден"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (chat_id, invite_user_id)
            )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "chat_members":
            chat_id = body.get("chat_id")
            cur.execute(f"""
                SELECT u.id, u.username, u.last_seen
                FROM {SCHEMA}.chat_members cm
                JOIN {SCHEMA}.users u ON cm.user_id = u.id
                WHERE cm.chat_id = %s AND u.email NOT LIKE 'deleted_%%'
                ORDER BY cm.joined_at ASC
            """, (chat_id,))
            rows = cur.fetchall()
            members = [{"id": r[0], "username": r[1], "last_seen": str(r[2])} for r in rows]
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"members": members})}

        else:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
