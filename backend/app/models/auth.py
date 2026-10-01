from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "STUDENT"   # accepts "STUDENT" or "ADMIN" as plain string
    grade_level: Optional[str] = "Class 10th"
    program: Optional[str] = "General Academic"
    semester: Optional[int] = 1

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    grade_level: Optional[str] = "Class 10th"
    program: Optional[str] = None
    semester: Optional[int] = None
    subscription: Optional[str] = "free"   # "free" | "pro" | "elite"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

