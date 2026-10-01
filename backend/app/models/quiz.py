from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class QuestionSchema(BaseModel):
    question_id: int
    question_text: str
    options: List[str] = Field(..., min_items=4, max_items=4)
    correct_option_index: int = Field(..., ge=0, le=3)
    explanation: str

class QuizCreateRequest(BaseModel):
    topic: str
    subject: str = "Science"
    grade_level: Optional[str] = "Class 10th"
    num_questions: int = Field(default=5, ge=1, le=15)
    difficulty: str = Field(default="medium") # "easy", "medium", "hard"
    material_id: Optional[str] = None

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option_index: int

class QuizSubmitRequest(BaseModel):
    time_taken_seconds: int
    answers: List[AnswerSubmission]

class ReviewItem(BaseModel):
    question_id: int
    question_text: str
    options: List[str]
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: str

class QuizSubmissionResponse(BaseModel):
    submission_id: str
    score: int
    total_questions: int
    percentage: float
    time_taken_seconds: int
    detailed_review: List[ReviewItem]
