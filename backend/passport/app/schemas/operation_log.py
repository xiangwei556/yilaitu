from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class OperationLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type: Optional[str] = None
    status: Optional[str] = None
    ip: Optional[str] = None
    device_fingerprint: Optional[str] = None
    client_type: Optional[str] = None
    detail: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True