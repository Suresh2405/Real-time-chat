from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut
from app.schemas.message import MessageOut

class ConversationMemberOut(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    last_read_at: datetime
    user: UserOut

    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    type: str = "private"  # "private" or "group"
    target_user_id: Optional[int] = None  # for private conversation
    name: Optional[str] = None  # for group
    group_picture: Optional[str] = None  # for group
    member_ids: Optional[List[int]] = []  # for group

class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    group_picture: Optional[str] = None

class AddMemberRequest(BaseModel):
    user_id: int
    role: Optional[str] = "member"

class ConversationOut(BaseModel):
    id: int
    type: str
    name: Optional[str] = None
    group_picture: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberOut] = []
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)
