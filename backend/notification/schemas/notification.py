from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationTemplateBase(BaseModel):
    code: str
    title_template: str
    content_template: str
    channels: Optional[str] = None

class NotificationTemplateCreate(NotificationTemplateBase):
    pass

class NotificationTemplate(NotificationTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
