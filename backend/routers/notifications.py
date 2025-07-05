from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from models import Notification, NotificationCreate, NotificationUpdate, User
from database import get_session
from auth_utils import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Notification])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all notifications for the authenticated user, sorted by creation date
    """
    statement = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc())
    
    notifications = session.exec(statement).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=Notification)
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Mark a specific notification as read
    """
    statement = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    notification = session.exec(statement).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    
    return notification

@router.patch("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Mark all notifications as read for the current user
    """
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    notifications = session.exec(statement).all()
    
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    
    session.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}

@router.post("/", response_model=Notification)
async def create_notification(
    notification_data: NotificationCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new notification (typically called by system/admin)
    """
    new_notification = Notification(
        id=f"notif-{datetime.utcnow().timestamp()}",
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        is_read=notification_data.is_read,
        user_id=notification_data.user_id,
        created_at=datetime.utcnow()
    )
    
    session.add(new_notification)
    session.commit()
    session.refresh(new_notification)
    
    return new_notification 