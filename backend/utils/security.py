import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext

from utils.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, minutes: int | None = None, guest: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes or JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    if guest:
        payload["guest"] = True  # demo-profile login: short-lived, only ever issued for the sample profiles
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("missing sub")
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Who is logged in, read from the signed token. Never trust a user id sent in the request."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return decode_access_token(credentials.credentials)


def require_same_user(requested_user_id: str, current_user_id: str) -> None:
    """For URLs like /history/{user_id}: you may only ask for your own data."""
    if requested_user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own data")


def new_uuid() -> str:
    return str(uuid.uuid4())


def client_ip(request: Request) -> str:
    """The visitor's real address. On Cloud Run every request arrives through Google's proxy, so
    request.client is the proxy for everybody; the real address is the last entry of X-Forwarded-For
    (added by Google, so a visitor can't fake it). Only trusted when running on Cloud Run (K_SERVICE is set)."""
    if os.getenv("K_SERVICE"):
        forwarded = request.headers.get("x-forwarded-for", "")
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "unknown"


# Demo (guest) accounts can use features that cost money, but only a few times a day.
# Kept in memory, so it resets when the server restarts; real accounts are not limited.
_GUEST_USAGE: dict[tuple[str, str, str], int] = {}


def limit_guest(action: str, per_day: int):
    """Like get_current_user_id, but demo accounts get at most `per_day` uses of `action` a day."""

    async def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> str:
        user_id = await get_current_user_id(credentials)
        payload = jwt.get_unverified_claims(credentials.credentials)  # already verified just above
        if payload.get("guest"):
            today = datetime.now(timezone.utc).date().isoformat()
            for key in [k for k in _GUEST_USAGE if k[2] != today]:  # forget yesterday's counts
                del _GUEST_USAGE[key]
            key = (user_id, action, today)
            if _GUEST_USAGE.get(key, 0) >= per_day:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demo accounts are limited to {per_day} {action} a day. Sign in to keep going.",
                )
            _GUEST_USAGE[key] = _GUEST_USAGE.get(key, 0) + 1
        return user_id

    return dependency
