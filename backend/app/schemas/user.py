from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    username: str
    email: EmailStr
    bio: Optional[str] = ""

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str] = ""
    profile_picture: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_seen: datetime

    model_config = ConfigDict(from_attributes=True)
