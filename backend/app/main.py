from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.journal import router as journal_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router 
from app.api.ai import router as ai_router
from app.api.ws import router as ws_router
from app.api.stats import router as stats_router
from app.api.ai_models import router as ai_models_router
from app.api import permissions

app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router) 
app.include_router(ai_router)
app.include_router(journal_router)
app.include_router(ws_router)
app.include_router(stats_router)
app.include_router(ai_models_router)
app.include_router(permissions.router)
app.mount("/media", StaticFiles(directory="media"), name="media")
app.mount("/stream-images", StaticFiles(directory="stream_images"), name="stream_images")
