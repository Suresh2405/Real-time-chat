import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.security import decode_token
from app.api import api_router
from app.websocket.connection_manager import manager
from app.services.user_service import get_user_by_id, update_last_seen
from app.services.chat_service import is_user_in_conversation, mark_messages_as_read

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not existing
    Base.metadata.create_all(bind=engine)
    # Initialize Redis connection
    await manager.init_redis()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Setup
origins = list(settings.CORS_ORIGINS)
if settings.ENVIRONMENT == "development":
    if "*" not in origins:
        origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True if "*" not in origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static upload files directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include REST API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    db_status = "disconnected"
    redis_status = "disconnected"

    # Test Database connection
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Test Redis connection
    if manager.redis:
        try:
            # ping Redis
            redis_status = "connected"
        except Exception:
            redis_status = "error"
    else:
        redis_status = "in-memory-fallback"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
        "redis": redis_status,
        "environment": settings.ENVIRONMENT
    }

@app.websocket("/ws/chat/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...)
):
    # Validate token
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = int(payload.get("sub"))
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check conversation access using a new DB session
    db = next(get_db())
    try:
        if not is_user_in_conversation(db, conversation_id, user_id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        update_last_seen(db, user_id)
    finally:
        db.close()

    await manager.connect(websocket, conversation_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
                event_type = event.get("type")

                if event_type == "typing_start":
                    await manager.broadcast_to_conversation(conversation_id, {
                        "type": "typing_start",
                        "user_id": user_id,
                        "conversation_id": conversation_id
                    })
                elif event_type == "typing_stop":
                    await manager.broadcast_to_conversation(conversation_id, {
                        "type": "typing_stop",
                        "user_id": user_id,
                        "conversation_id": conversation_id
                    })
                elif event_type == "message_read":
                    db_sess = next(get_db())
                    try:
                        mark_messages_as_read(db_sess, conversation_id, user_id)
                    finally:
                        db_sess.close()

                    await manager.broadcast_to_conversation(conversation_id, {
                        "type": "message_read",
                        "user_id": user_id,
                        "conversation_id": conversation_id
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket, conversation_id, user_id)
