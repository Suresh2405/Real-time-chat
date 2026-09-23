from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, ConversationType, MemberRole, ConversationMember
from app.schemas.conversation import (
    ConversationOut,
    ConversationCreate,
    ConversationMemberOut,
    AddMemberRequest,
    ConversationUpdate
)
from app.schemas.message import MessageOut, MessageCreate
from app.services.chat_service import (
    get_or_create_private_conversation,
    create_group_conversation,
    get_user_conversations,
    get_conversation_by_id,
    is_user_in_conversation,
    get_conversation_messages,
    create_message,
    mark_messages_as_read
)
from app.services.notification_service import create_notification
from app.websocket.connection_manager import manager

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("", response_model=List[ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raw_convs = get_user_conversations(db, current_user.id)
    result = []
    for item in raw_convs:
        conv = item["conversation"]
        last_msg = item["last_message"]
        unread_count = item["unread_count"]

        # Populate name for private conversation if empty
        conv_name = conv.name
        conv_pic = conv.group_picture
        if conv.type == ConversationType.PRIVATE:
            other_mem = next((m for m in conv.members if m.user_id != current_user.id), None)
            if other_mem and other_mem.user:
                conv_name = other_mem.user.username
                conv_pic = other_mem.user.profile_picture

        out = ConversationOut(
            id=conv.id,
            type=conv.type.value if hasattr(conv.type, 'value') else str(conv.type),
            name=conv_name,
            group_picture=conv_pic,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            members=[ConversationMemberOut.model_validate(m) for m in conv.members],
            last_message=MessageOut.model_validate(last_msg) if last_msg else None,
            unread_count=unread_count
        )
        result.append(out)
    return result

@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_new_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.type == "private":
        if not payload.target_user_id:
            raise HTTPException(status_code=400, detail="target_user_id is required for private conversation.")
        if payload.target_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot start a private conversation with yourself.")
        
        conv = get_or_create_private_conversation(db, current_user.id, payload.target_user_id)
    elif payload.type == "group":
        if not payload.name:
            raise HTTPException(status_code=400, detail="Group name is required.")
        conv = create_group_conversation(
            db,
            creator_id=current_user.id,
            name=payload.name,
            member_ids=payload.member_ids or [],
            group_picture=payload.group_picture
        )
        
        # Notify added members
        for member_id in (payload.member_ids or []):
            if member_id != current_user.id:
                create_notification(
                    db,
                    user_id=member_id,
                    title="Group Invitation",
                    message=f"You were added to group '{payload.name}' by {current_user.username}",
                    n_type="group_invite",
                    conversation_id=conv.id
                )
    else:
        raise HTTPException(status_code=400, detail="Invalid conversation type.")

    # Format return name & picture
    conv_name = conv.name
    conv_pic = conv.group_picture
    if conv.type == ConversationType.PRIVATE:
        other_mem = next((m for m in conv.members if m.user_id != current_user.id), None)
        if other_mem and other_mem.user:
            conv_name = other_mem.user.username
            conv_pic = other_mem.user.profile_picture

    return ConversationOut(
        id=conv.id,
        type=conv.type.value if hasattr(conv.type, 'value') else str(conv.type),
        name=conv_name,
        group_picture=conv_pic,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=[ConversationMemberOut.model_validate(m) for m in conv.members],
        last_message=None,
        unread_count=0
    )

@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_user_in_conversation(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this conversation.")
    
    conv = get_conversation_by_id(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv_name = conv.name
    conv_pic = conv.group_picture
    if conv.type == ConversationType.PRIVATE:
        other_mem = next((m for m in conv.members if m.user_id != current_user.id), None)
        if other_mem and other_mem.user:
            conv_name = other_mem.user.username
            conv_pic = other_mem.user.profile_picture

    return ConversationOut(
        id=conv.id,
        type=conv.type.value if hasattr(conv.type, 'value') else str(conv.type),
        name=conv_name,
        group_picture=conv_pic,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=[ConversationMemberOut.model_validate(m) for m in conv.members],
        unread_count=0
    )

@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
def list_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_user_in_conversation(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this conversation.")

    # Mark conversation as read for current user
    mark_messages_as_read(db, conversation_id, current_user.id)
    
    messages = get_conversation_messages(db, conversation_id, limit=limit, offset=offset)
    return [MessageOut.model_validate(m) for m in messages]

@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_new_message(
    conversation_id: int,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_user_in_conversation(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this conversation.")

    msg = create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=msg_in.content or "",
        attachment_id=msg_in.attachment_id
    )

    msg_out = MessageOut.model_validate(msg)

    # Broadcast via WebSocket
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "message",
        "data": msg_out.model_dump(mode="json")
    })

    return msg_out

@router.post("/{conversation_id}/members", status_code=status.HTTP_200_OK)
def add_member_to_group(
    conversation_id: int,
    req: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = get_conversation_by_id(db, conversation_id)
    if not conv or conv.type != ConversationType.GROUP:
        raise HTTPException(status_code=400, detail="Not a group conversation.")

    if not is_user_in_conversation(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    # Check if already a member
    if is_user_in_conversation(db, conversation_id, req.user_id):
        raise HTTPException(status_code=400, detail="User is already in group.")

    role = MemberRole.ADMIN if req.role == "admin" else MemberRole.MEMBER
    mem = ConversationMember(conversation_id=conversation_id, user_id=req.user_id, role=role)
    db.add(mem)
    db.commit()

    # Create notification
    create_notification(
        db,
        user_id=req.user_id,
        title="Added to Group",
        message=f"You were added to group '{conv.name}'",
        n_type="group_member_add",
        conversation_id=conversation_id
    )

    return {"message": "Member added successfully."}

@router.delete("/{conversation_id}/members/{target_user_id}", status_code=status.HTTP_200_OK)
def remove_group_member(
    conversation_id: int,
    target_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = get_conversation_by_id(db, conversation_id)
    if not conv or conv.type != ConversationType.GROUP:
        raise HTTPException(status_code=400, detail="Not a group conversation.")

    # User can remove themselves (leave) or admin can remove member
    curr_mem = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()

    if not curr_mem:
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    if target_user_id != current_user.id and curr_mem.role != MemberRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can remove members.")

    target_mem = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == target_user_id
    ).first()

    if not target_mem:
        raise HTTPException(status_code=404, detail="Target member not found in group.")

    db.delete(target_mem)
    db.commit()
    return {"message": "Member removed successfully."}
