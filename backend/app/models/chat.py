from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    subject: str = "Science / General"
    grade_level: Optional[str] = "Class 10th" # e.g. "Class 10th", "Class 11th-12th", "College / Degree"
    message: str

class ChatSessionResponse(BaseModel):
    id: str
    session_title: str
    subject: str
    grade_level: Optional[str] = "Class 10th"
    last_updated: datetime
