import os
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel

from database.db import DEFAULT_USER_ID, create_user, get_user_by_email, set_user_password_hash

router = APIRouter()

_SECRET = os.getenv("JWT_SECRET", "dory-hackathon-secret-change-in-prod")
_ALGO = "HS256"
_DEMO_PASSWORD = "demo123"


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _make_token(user_id: str, email: str, name: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "name": name,
         "exp": datetime.utcnow() + timedelta(days=30)},
        _SECRET, algorithm=_ALGO,
    )


def setup_demo_user() -> None:
    """Called at startup — ensures the demo user has a real bcrypt hash and a display name."""
    from database.db import get_connection
    conn = get_connection()
    conn.execute(
        "UPDATE users SET name = 'Demo User' WHERE id = ? AND (name IS NULL OR name = '')",
        (DEFAULT_USER_ID,),
    )
    conn.commit()
    conn.close()

    user = get_user_by_email("demo@dory.md")
    if user and not user["password_hash"]:
        set_user_password_hash(DEFAULT_USER_ID, _hash(_DEMO_PASSWORD))


class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
def register(body: RegisterBody):
    if len(body.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if get_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="An account with that email already exists.")
    user_id = create_user(body.email, body.name.strip(), _hash(body.password))
    return {"token": _make_token(user_id, body.email, body.name.strip()),
            "name": body.name.strip(), "email": body.email}


@router.post("/auth/login")
def login(body: LoginBody):
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    pwd_hash = user["password_hash"]
    if not pwd_hash or not _verify(body.password, pwd_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    name = user["name"] or ""
    return {"token": _make_token(user["id"], user["email"], name),
            "name": name, "email": user["email"]}
