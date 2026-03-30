import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = "t_p76912206_notebook_messenger_p"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_value(value: str) -> str:
    return hashlib.sha256(value.lower().strip().encode()).hexdigest()


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
        "Content-Type": "application/json"
    }


def handler(event: dict, context) -> dict:
    """Аутентификация: регистрация, вход, выход, смена пароля, удаление аккаунта"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == "register":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")
            username = body.get("username", "").strip()
            security_question = body.get("security_question", "").strip()
            security_answer = body.get("security_answer", "").strip()

            if not all([email, password, username, security_question, security_answer]):
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Все поля обязательны"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": cors_headers(), "body": json.dumps({"error": "Email уже зарегистрирован"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.users (email, password_hash, username, security_question, security_answer_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (email, hash_value(password), username, security_question, hash_value(security_answer))
            )
            user_id = cur.fetchone()[0]
            token = secrets.token_hex(32)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, token))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"token": token, "user_id": user_id, "username": username, "email": email})}

        elif action == "login":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")
            security_answer = body.get("security_answer", "").strip()

            cur.execute(
                f"SELECT id, username, email, password_hash, security_question, security_answer_hash FROM {SCHEMA}.users WHERE email = %s",
                (email,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный email или пароль"})}

            user_id, username, user_email, pw_hash, sec_q, sec_a_hash = row
            if hash_value(password) != pw_hash:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный email или пароль"})}
            if hash_value(security_answer) != sec_a_hash:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный ответ на контрольный вопрос", "security_question": sec_q})}

            token = secrets.token_hex(32)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, token))
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = %s", (user_id,))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"token": token, "user_id": user_id, "username": username, "email": user_email, "security_question": sec_q})}

        elif action == "get_security_question":
            email = body.get("email", "").strip().lower()
            cur.execute(f"SELECT security_question FROM {SCHEMA}.users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Пользователь не найден"})}
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"security_question": row[0]})}

        elif action == "logout":
            token = body.get("token", "")
            password = body.get("password", "")
            cur.execute(
                f"SELECT s.user_id, u.password_hash FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Сессия не найдена"})}
            user_id, pw_hash = row
            if hash_value(password) != pw_hash:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный пароль"})}
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "change_password":
            token = body.get("token", "")
            old_password = body.get("old_password", "")
            new_password = body.get("new_password", "")
            cur.execute(
                f"SELECT s.user_id, u.password_hash FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Не авторизован"})}
            user_id, pw_hash = row
            if hash_value(old_password) != pw_hash:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный текущий пароль"})}
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (hash_value(new_password), user_id))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "delete_account":
            token = body.get("token", "")
            password = body.get("password", "")
            cur.execute(
                f"SELECT s.user_id, u.password_hash FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Не авторизован"})}
            user_id, pw_hash = row
            if hash_value(password) != pw_hash:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный пароль"})}
            cur.execute(f"UPDATE {SCHEMA}.users SET email = 'deleted_' || id || '@deleted.com', password_hash = 'deleted', username = 'Удалённый пользователь' WHERE id = %s", (user_id,))
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        elif action == "verify_token":
            token = body.get("token", "")
            cur.execute(
                f"SELECT s.user_id, u.username, u.email FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Сессия истекла"})}
            user_id, username, email = row
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"user_id": user_id, "username": username, "email": email})}

        else:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
