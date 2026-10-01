from pydantic import BaseModel
from typing import List, Dict, Any

class StudentOverview(BaseModel):
    total_quizzes_taken: int
    average_score_pct: float
    total_materials_read: int
    total_ai_chat_queries: int
    weak_subjects: List[Dict[str, Any]]

class PerformancePoint(BaseModel):
    quiz_title: str
    subject: str
    score_pct: float
    submitted_at: str

class AdminOverview(BaseModel):
    total_students: int
    total_materials: int
    total_quizzes_generated: int
    total_submissions: int
