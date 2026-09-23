from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User
from app.schemas.attachment import AttachmentOut
from app.services.upload_service import validate_and_save_upload

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.post("", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attachment = validate_and_save_upload(db, file)
    return AttachmentOut.model_validate(attachment)
