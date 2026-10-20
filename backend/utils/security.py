import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
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