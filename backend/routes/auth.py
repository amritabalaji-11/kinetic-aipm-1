import secrets
import time

from fastapi import APIRouter, HTTPException, Depends, Request
from db.database import db
from schemas.auth import (
    SignUpRequest, LoginRequest, SocialLoginRequest, DemoLoginRequest,
    TokenResponse, UserOut,
)
from utils.config import ALLOW_DEMO_LOGIN, DEMO_USER_IDS, DEMO_PASSCODE
from utils.security import (
    hash_password, verify_password, create_access_token,
    get_current_user_id, new_uuid,
)
from utils.oauth_providers import (
    verify_google_token, verify_apple_token, verify_facebook_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_user_by_email(email: str):
    return await db.fetch_one(
        "SELECT * FROM user_profiles WHERE email = :email", {"email": email}
    )


async def _get_user_by_oauth(provider: str, sub: str):
    return await db.fetch_one(
        """SELECT * FROM user_profiles
           WHERE auth_provider = :provider AND oauth_sub = :sub""",
        {"provider": provider, "sub": sub},
    )


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignUpRequest):
    existing = await _get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = new_uuid()
    profile_id = new_uuid()
    await db.execute(
        """
        INSERT INTO user_profiles (
            profile_id, user_id, email, hashed_password,
            display_name, auth_provider, email_verified
        ) VALUES (
            :profile_id, :user_id, :email, :hashed_password,
            :display_name, 'email', 0
        )
        """,
        {
            "profile_id": profile_id,
            "user_id": user_id,
            "email": payload.email,
            "hashed_password": hash_password(payload.password),
            "display_name": payload.display_name,
        },
    )
    token = create_access_token(user_id)
    return TokenResponse(access_token=token, user_id=user_id)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await _get_user_by_email(payload.email)
    if not user or not user["hashed_password"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["user_id"])
    return TokenResponse(access_token=token, user_id=user["user_id"])


async def _social_login(provider: str, sub: str, email: str | None, name: str | None):
    # 1. already linked to this provider?
    user = await _get_user_by_oauth(provider, sub)
    if user:
        token = create_access_token(user["user_id"])
        return TokenResponse(access_token=token, user_id=user["user_id"])

    # 2. same email already exists under a different method? link it.
    if email:
        existing = await _get_user_by_email(email)
        if existing:
            await db.execute(
                """UPDATE user_profiles
                   SET auth_provider = :provider, oauth_sub = :sub
                   WHERE user_id = :user_id""",
                {"provider": provider, "sub": sub, "user_id": existing["user_id"]},
            )
            token = create_access_token(existing["user_id"])
            return TokenResponse(access_token=token, user_id=existing["user_id"])

    # 3. brand-new user
    user_id = new_uuid()
    profile_id = new_uuid()
    await db.execute(
        """
        INSERT INTO user_profiles (
            profile_id, user_id, email, display_name,
            auth_provider, oauth_sub, email_verified
        ) VALUES (
            :profile_id, :user_id, :email, :display_name,
            :provider, :sub, :verified
        )
        """,
        {
            "profile_id": profile_id,
            "user_id": user_id,
            "email": email,
            "display_name": name,
            "provider": provider,
            "sub": sub,
            "verified": 1 if email else 0,
        },
    )
    token = create_access_token(user_id)
    return TokenResponse(access_token=token, user_id=user_id)


# Too many wrong passcodes from one address = locked out for a while (kept in memory, resets on restart)
_FAILED_PASSCODES: dict[str, list[float]] = {}
_MAX_FAILURES, _WINDOW_SECONDS = 8, 10 * 60


def _recent_failures(host: str) -> list[float]:
    cutoff = time.time() - _WINDOW_SECONDS
    recent = [t for t in _FAILED_PASSCODES.get(host, []) if t > cutoff]
    _FAILED_PASSCODES[host] = recent
    return recent


@router.get("/demo/status")
async def demo_status():
    """Tells the login screen whether demo is available and whether it asks for a passcode."""
    return {"enabled": ALLOW_DEMO_LOGIN, "passcode_required": bool(DEMO_PASSCODE)}


@router.post("/demo", response_model=TokenResponse)
async def login_demo(payload: DemoLoginRequest, request: Request):
    """Guest login for the three sample profiles only (needs the demo passcode when one is set).
    The token lasts 12 hours and only ever grants access to that one sample profile's data."""
    if not ALLOW_DEMO_LOGIN or payload.user_id not in DEMO_USER_IDS:
        raise HTTPException(status_code=404, detail="Not found")
    if DEMO_PASSCODE:
        host = request.client.host if request.client else "unknown"
        if len(_recent_failures(host)) >= _MAX_FAILURES:
            raise HTTPException(status_code=429, detail="Too many wrong passcodes. Try again in a few minutes.")
        if not payload.passcode:
            raise HTTPException(status_code=401, detail="Demo passcode required")
        if not secrets.compare_digest(payload.passcode.encode(), DEMO_PASSCODE.encode()):
            _FAILED_PASSCODES.setdefault(host, []).append(time.time())
            raise HTTPException(status_code=403, detail="Wrong demo passcode")
    token = create_access_token(payload.user_id, minutes=60 * 12, guest=True)
    return TokenResponse(access_token=token, user_id=payload.user_id)


@router.post("/google", response_model=TokenResponse)
async def login_google(payload: SocialLoginRequest):
    info = verify_google_token(payload.token)
    return await _social_login("google", info["sub"], info["email"], info["name"])


@router.post("/apple", response_model=TokenResponse)
async def login_apple(payload: SocialLoginRequest):
    info = await verify_apple_token(payload.token)
    name = payload.display_name or info["name"]  # Apple sends name only client-side
    return await _social_login("apple", info["sub"], info["email"], name)


@router.post("/facebook", response_model=TokenResponse)
async def login_facebook(payload: SocialLoginRequest):
    info = await verify_facebook_token(payload.token)
    return await _social_login("facebook", info["sub"], info["email"], info["name"])


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    user = await db.fetch_one(
        "SELECT * FROM user_profiles WHERE user_id = :user_id", {"user_id": user_id}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        user_id=user["user_id"],
        email=user["email"],
        display_name=user["display_name"],
        auth_provider=user["auth_provider"],
    )