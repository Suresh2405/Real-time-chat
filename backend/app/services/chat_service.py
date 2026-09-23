from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc
from app.models import Conversation, ConversationMember, ConversationType, MemberRole, Message, Attachment, User

def get_or_create_private_conversation(db: Session, user1_id: int, user2_id: int) -> Conversation:
    # Check if a private conversation between user1 and user2 already exists
    conversations = (
        db.query(Conversation)
        .filter(Conversation.type == ConversationType.PRIVATE)
        .join(ConversationMember)
        .filter(ConversationMember.user_id.in_([user1_id, user2_id]))
        .all()
    )

    for conv in conversations:
        member_user_ids = {m.user_id for m in conv.members}
        if member_user_ids == {user1_id, user2_id}:
            return conv

    # Create new private conversation
    conv = Conversation(type=ConversationType.PRIVATE)
    db.add(conv)
    db.flush()

    mem1 = ConversationMember(conversation_id=conv.id, user_id=user1_id, role=MemberRole.ADMIN)
    mem2 = ConversationMember(conversation_id=conv.id, user_id=user2_id, role=MemberRole.MEMBER)
    db.add_all([mem1, mem2])
    db.commit()
    db.refresh(conv)
    return conv

def create_group_conversation(
    db: Session, creator_id: int, name: str, member_ids: List[int], group_picture: Optional[str] = None
) -> Conversation:
    conv = Conversation(
        type=ConversationType.GROUP,
        name=name,
        group_picture=group_picture
    )
    db.add(conv)
    db.flush()

    # Add creator as admin
    creator_member = ConversationMember(
        conversation_id=conv.id, user_id=creator_id, role=MemberRole.ADMIN
    )
    db.add(creator_member)

    # Add other members
    all_member_ids = set(member_ids) - {creator_id}
    for m_id in all_member_ids:
        mem = ConversationMember(
            conversation_id=conv.id, user_id=m_id, role=MemberRole.MEMBER
        )
        db.add(mem)

    db.commit()
    db.refresh(conv)
    return conv

def get_user_conversations(db: Session, user_id: int) -> List[dict]:
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == user_id)
        .all()
    )
    
    conv_list = []
    for mem in memberships:
        conv = mem.conversation
        # Fetch last message
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .first()
        )
        
        # Calculate unread count (messages created after last_read_at where sender is not user)
        unread_count = 0
        if mem.last_read_at:
            unread_count = (
                db.query(Message)
                .filter(
                    Message.conversation_id == conv.id,
                    Message.sender_id != user_id,
                    Message.created_at > mem.last_read_at
                )
                .count()
            )
        
        conv_dict = {
            "conversation": conv,
            "last_message": last_msg,
            "unread_count": unread_count,
            "user_role": mem.role
        }
        conv_list.append(conv_dict)
    
    # Sort conversations by last_message created_at or conversation created_at desc
    conv_list.sort(
        key=lambda c: c["last_message"].created_at if c["last_message"] else c["conversation"].created_at,
        reverse=True
    )
    return conv_list

def get_conversation_by_id(db: Session, conversation_id: int) -> Optional[Conversation]:
    return (
        db.query(Conversation)
        .options(joinedload(Conversation.members).joinedload(ConversationMember.user))
        .filter(Conversation.id == conversation_id)
        .first()
    )

def is_user_in_conversation(db: Session, conversation_id: int, user_id: int) -> bool:
    mem = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        )
        .first()
    )
    return mem is not None

def get_conversation_messages(
    db: Session, conversation_id: int, limit: int = 50, offset: int = 0
) -> List[Message]:
    return (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.attachments)
        )
        .filter(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )[::-1]  # Return in chronological order (oldest to newest)

def create_message(
    db: Session, conversation_id: int, sender_id: int, content: str = "", attachment_id: Optional[int] = None
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        read_by=[sender_id]
    )
    db.add(msg)
    db.flush()

    if attachment_id:
        attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
        if attachment:
            attachment.message_id = msg.id

    # Update conversation updated_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)
    return msg

def delete_message(db: Session, message_id: int, user_id: int) -> bool:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        return False
    if msg.sender_id != user_id:
        return False
    
    msg.is_deleted = True
    msg.content = "This message was deleted"
    db.commit()
    return True

def mark_messages_as_read(db: Session, conversation_id: int, user_id: int):
    # Update last_read_at for member
    mem = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        )
        .first()
    )
    if mem:
        mem.last_read_at = datetime.now(timezone.utc)
        db.commit()

def search_messages(
    db: Session, user_id: int, query_str: str, conversation_id: Optional[int] = None, limit: int = 20, offset: int = 0
) -> Tuple[List[dict], int]:
    # Find user conversations
    user_conv_ids = [
        m.conversation_id for m in db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == user_id).all()
    ]

    if not user_conv_ids:
        return [], 0

    q = db.query(Message).options(joinedload(Message.conversation), joinedload(Message.sender)).filter(
        Message.conversation_id.in_(user_conv_ids),
        Message.is_deleted == False,
        Message.content.ilike(f"%{query_str}%")
    )

    if conversation_id:
        q = q.filter(Message.conversation_id == conversation_id)

    total = q.count()
    messages = q.order_by(desc(Message.created_at)).offset(offset).limit(limit).all()

    results = []
    for msg in messages:
        conv_name = msg.conversation.name
        if not conv_name and msg.conversation.type == ConversationType.PRIVATE:
            # Get other member's username
            other_mem = (
                db.query(ConversationMember)
                .join(User)
                .filter(
                    ConversationMember.conversation_id == msg.conversation_id,
                    ConversationMember.user_id != user_id
                )
                .first()
            )
            if other_mem and other_mem.user:
                conv_name = other_mem.user.username
            else:
                conv_name = "Private Chat"
        elif not conv_name:
            conv_name = f"Group #{msg.conversation_id}"

        results.append({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "conversation_name": conv_name,
            "sender_name": msg.sender.username if msg.sender else "Unknown",
            "content": msg.content,
            "created_at": msg.created_at
        })

    return results, total
