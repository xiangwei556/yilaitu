from typing import Optional, Any
from pydantic import BaseModel
from datetime import datetime

class MessageBase(BaseModel):
    title: str
    content: str
    type: Optional[str] = "system"
    priority: Optional[str] = "normal"
    link: Optional[str] = None
    extra_data: Optional[str] = None

class MessageCreate(MessageBase):
    receiver_id: int
    sender_id: Optional[int] = None

class MessageUpdate(BaseModel):
    status: Optional[str] = None

class Message(MessageBase):
    id: int
    sender_id: Optional[int]
    receiver_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UnreadCount(BaseModel):
    count: int

class MessageList(BaseModel):
    items: list[Message]
    total: int
    page: int
    page_size: int
