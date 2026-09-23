import os
import uuid
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.attachment import Attachment

def validate_and_save_upload(db: Session, file: UploadFile) -> Attachment:
    filename = file.filename or "file"
    ext = filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '.{ext}' is not allowed."
        )

    # Read content to measure size
    contents = file.file.read()
    file_size = len(contents)

    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB."
        )

    # Generate secure unique filename
    unique_filename = f"{uuid.uuid4().hex}_{filename.replace(' ', '_')}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Write file to storage
    with open(file_path, "wb") as f:
        f.write(contents)

    # Relative path for frontend access
    relative_url = f"/static/uploads/{unique_filename}"

    # Determine type (image, document, pdf, generic)
    if ext in ["jpg", "jpeg", "png", "gif", "webp"]:
        file_type = "image"
    elif ext == "pdf":
        file_type = "pdf"
    elif ext in ["doc", "docx", "txt"]:
        file_type = "document"
    else:
        file_type = "archive"

    # Create Attachment record with dummy message_id = 0 initially (linked when message is sent)
    attachment = Attachment(
        message_id=0,
        filename=filename,
        file_path=relative_url,
        file_type=file_type,
        file_size=file_size
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment
