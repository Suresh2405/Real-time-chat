from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    conversation_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
