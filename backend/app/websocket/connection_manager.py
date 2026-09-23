import asyncio
import json
import logging
from typing import Dict, List, Set, Optional
from fastapi import WebSocket
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # active_connections: dict mapping conversation_id -> list of (user_id, WebSocket)
        self.active_connections: Dict[int, List[dict]] = {}
        # user_sockets: dict mapping user_id -> list of WebSockets
        self.user_sockets: Dict[int, List[WebSocket]] = {}
        # Redis client
        self.redis: Optional[aioredis.Redis] = None
        self.pubsub = None

    async def init_redis(self):
        try:
            self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await self.redis.ping()
            logger.info("Connected to Redis for WebSockets")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to in-memory mode.")
            self.redis = None

    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        await websocket.accept()
        conn_info = {"user_id": user_id, "websocket": websocket}
        
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(conn_info)

        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = []
        self.user_sockets[user_id].append(websocket)

        # Mark user as online in Redis
        if self.redis:
            try:
                await self.redis.sadd("online_users", str(user_id))
            except Exception as e:
                logger.error(f"Redis error setting online status: {e}")

        # Broadcast user_online event to conversation
        await self.broadcast_to_conversation(conversation_id, {
            "type": "user_online",
            "user_id": user_id,
            "conversation_id": conversation_id
        })

    async def disconnect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id] = [
                c for c in self.active_connections[conversation_id] if c["websocket"] != websocket
            ]
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        if user_id in self.user_sockets:
            self.user_sockets[user_id] = [
                ws for ws in self.user_sockets[user_id] if ws != websocket
            ]
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]
                # If no sockets left for this user, mark offline in Redis
                if self.redis:
                    try:
                        await self.redis.srem("online_users", str(user_id))
                    except Exception as e:
                        logger.error(f"Redis error setting offline status: {e}")

        # Broadcast user_offline event
        await self.broadcast_to_conversation(conversation_id, {
            "type": "user_offline",
            "user_id": user_id,
            "conversation_id": conversation_id
        })

    async def broadcast_to_conversation(self, conversation_id: int, message: dict):
        payload = json.dumps(message)
        
        # In-memory broadcast to connected websockets for this conversation
        if conversation_id in self.active_connections:
            disconnected = []
            for conn in self.active_connections[conversation_id]:
                try:
                    await conn["websocket"].send_text(payload)
                except Exception:
                    disconnected.append(conn)
            
            for d in disconnected:
                if d in self.active_connections[conversation_id]:
                    self.active_connections[conversation_id].remove(d)

        # Also publish to Redis for multi-instance scalability
        if self.redis:
            try:
                await self.redis.publish(f"chat:{conversation_id}", payload)
            except Exception as e:
                logger.error(f"Redis publish error: {e}")

    async def send_personal_notification(self, user_id: int, notification: dict):
        payload = json.dumps({
            "type": "notification",
            "data": notification
        })
        if user_id in self.user_sockets:
            for ws in self.user_sockets[user_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass

        if self.redis:
            try:
                await self.redis.publish(f"user:{user_id}", payload)
            except Exception as e:
                logger.error(f"Redis notification publish error: {e}")

    async def is_user_online(self, user_id: int) -> bool:
        if user_id in self.user_sockets and len(self.user_sockets[user_id]) > 0:
            return True
        if self.redis:
            try:
                return await self.redis.sismember("online_users", str(user_id))
            except Exception:
                return False
        return False

manager = ConnectionManager()
