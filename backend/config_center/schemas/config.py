from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SystemConfigBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    group: Optional[str] = None

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfig(SystemConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
