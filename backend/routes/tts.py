import os

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

import utils.config  # makes sure backend/.env is loaded

router = APIRouter()

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


class TTSRequest(BaseModel):
    text: str


@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID")

    if not api_key or not voice_id:
        raise HTTPException(status_code=500, detail="ElevenLabs key or voice ID missing in backend/.env")

    # Safety cap so one huge request can't burn through your ElevenLabs credits
    text = body.text.strip()[:1500]
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{ELEVENLABS_URL}/{voice_id}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": text, "model_id": "eleven_multilingual_v2"},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error: {response.text}")

    return Response(content=response.content, media_type="audio/mpeg")
