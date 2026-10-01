from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AISummarySchema(BaseModel):
    key_takeaways: List[str]
    bullet_notes: str
    generated_at: Optional[datetime] = None

class MaterialResponse(BaseModel):
    id: str
    title: str
    subject: str
    file_name: str
    file_size_bytes: int
    status: str
    ai_summary: Optional[AISummarySchema] = None
    created_at: datetime
