from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router
from app.routes.health import router as health_router
from app.routes.admin import router as admin_router
from app.services.logger import init_db

app = FastAPI(
    title="AI Receptionist API",
    version="1.0.0"
)

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

@app.get("/")
def root():
    return {
        "message": "AI Receptionist Backend"
    }



app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(admin_router)