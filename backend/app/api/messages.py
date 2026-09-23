from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, Message
from app.schemas.message import MessageSearchResult
from app.services.chat_service import delete_message, mark_messages_as_read, search_messages

router = APIRouter(prefix="/messages", tags=["Messages"])

@router.put("/{message_id}/read")
def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    read_list = list(msg.read_by or [])
    if current_user.id not in read_list:
        read_list.append(current_user.id)
        msg.read_by = read_list
        db.commit()

    mark_messages_as_read(db, msg.conversation_id, current_user.id)
    return {"message": "Message marked as read."}

@router.delete("/{message_id}")
def delete_own_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = delete_message(db, message_id=message_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=403,
            detail="Could not delete message. Either message does not exist or you are not the sender."
        )
    return {"message": "Message deleted successfully."}

@router.get("/search")
def search_messages_endpoint(
    q: str = Query(..., min_length=1),
    conversation_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results, total = search_messages(
        db,
        user_id=current_user.id,
        query_str=q,
        conversation_id=conversation_id,
        limit=limit,
        offset=offset
    )
    return {
        "total": total,
        "items": results
    }
