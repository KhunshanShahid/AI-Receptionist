import edge_tts
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

VOICE = "en-US-JennyNeural"


@router.get("/tts")
async def text_to_speech(text: str):
    communicate = edge_tts.Communicate(text, VOICE, rate="-5%")

    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])

    return Response(content=bytes(audio), media_type="audio/mpeg")
