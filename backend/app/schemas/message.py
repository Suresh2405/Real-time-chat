from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut
from app.schemas.attachment import AttachmentOut

class MessageCreate(BaseModel):
    content: Optional[str] = ""
    attachment_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: Optional[str] = ""
    is_deleted: bool
    read_by: List[int] = []
    created_at: datetime
    sender: Optional[UserOut] = None
    attachments: List[AttachmentOut] = []

    model_config = ConfigDict(from_attributes=True)

class MessageSearchResult(BaseModel):
    id: int
    conversation_id: int
    conversation_name: Optional[str] = ""
    sender_name: str
    content: str
    created_at: datetime
