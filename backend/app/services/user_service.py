from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from app.schemas.user import UserCreate, UserUpdate

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_pw = get_password_hash(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_pw,
        bio=user_in.bio or "",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def update_user_profile(db: Session, user: User, user_in: UserUpdate) -> User:
    if user_in.username:
        user.username = user_in.username
    if user_in.email:
        user.email = user_in.email
    if user_in.bio is not None:
        user.bio = user_in.bio
    if user_in.profile_picture is not None:
        user.profile_picture = user_in.profile_picture
    db.commit()
    db.refresh(user)
    return user

def update_last_seen(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if user:
        user.last_seen = datetime.now(timezone.utc)
        db.commit()

def search_users(db: Session, query_str: str, current_user_id: int) -> List[User]:
    search = f"%{query_str}%"
    return db.query(User).filter(
        User.id != current_user_id,
        or_(
            User.username.ilike(search),
            User.email.ilike(search)
        )
    ).limit(20).all()
