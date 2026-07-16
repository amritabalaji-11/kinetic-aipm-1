import httpx
from fastapi import HTTPException
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from jose import jwt as jose_jwt

from utils.config import (
    GOOGLE_CLIENT_ID,
    APPLE_CLIENT_ID,
    FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET,
)

APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"


def verify_google_token(id_token_str: str) -> dict:
    try:
        info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    return {
        "sub": info["sub"],
        "email": info.get("email"),
        "name": info.get("name"),
    }


async def verify_apple_token(id_token_str: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(APPLE_KEYS_URL)
    resp.raise_for_status()
    apple_keys = resp.json()["keys"]

    try:
        header = jose_jwt.get_unverified_header(id_token_str)
        key = next(k for k in apple_keys if k["kid"] == header["kid"])
        payload = jose_jwt.decode(
            id_token_str,
            key,
            algorithms=["RS256"],
            audience=APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
        )
    except (StopIteration, Exception):
        raise HTTPException(status_code=401, detail="Invalid Apple token")

    return {
        "sub": payload["sub"],
        "email": payload.get("email"),
        "name": None,  # Apple only sends name on first login, from the client
    }


async def verify_facebook_token(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        # Confirm the token was issued for your app
        debug_resp = await client.get(
            "https://graph.facebook.com/debug_token",
            params={
                "input_token": access_token,
                "access_token": f"{FACEBOOK_APP_ID}|{FACEBOOK_APP_SECRET}",
            },
        )
        debug_data = debug_resp.json().get("data", {})
        if not debug_data.get("is_valid") or debug_data.get("app_id") != FACEBOOK_APP_ID:
            raise HTTPException(status_code=401, detail="Invalid Facebook token")

        profile_resp = await client.get(
            "https://graph.facebook.com/me",
            params={"fields": "id,name,email", "access_token": access_token},
        )
    profile = profile_resp.json()

    return {
        "sub": profile["id"],
        "email": profile.get("email"),
        "name": profile.get("name"),
    }