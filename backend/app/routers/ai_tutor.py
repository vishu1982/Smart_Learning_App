from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.services.ai_service import ai_service
from app.models.chat import ChatRequest
from app.utils.security import get_current_user

router = APIRouter(prefix="/ai-tutor")

@router.post("/chat")
async def chat_with_tutor(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    session_id = payload.session_id
    chat_history = []

    if session_id and ObjectId.is_valid(session_id) and db is not None:
        session = await db["chat_sessions"].find_one({"_id": ObjectId(session_id)})
        if session:
            chat_history = session.get("messages", [])

    grade_level = payload.grade_level or current_user.get("profile", {}).get("grade_level", "Class 10th")

    # Ask Gemini AI with Grade Level context
    reply_text = await ai_service.chat_with_tutor(
        subject=payload.subject,
        message=payload.message,
        chat_history=chat_history,
        grade_level=grade_level
    )

    new_messages = [
        {"sender": "USER", "content": payload.message, "timestamp": datetime.utcnow()},
        {"sender": "AI", "content": reply_text, "timestamp": datetime.utcnow()}
    ]

    if db is not None:
        if session_id and ObjectId.is_valid(session_id):
            await db["chat_sessions"].update_one(
                {"_id": ObjectId(session_id)},
                {
                    "$push": {"messages": {"$each": new_messages}},
                    "$set": {"updated_at": datetime.utcnow(), "grade_level": grade_level}
                }
            )
        else:
            title = payload.message[:35] + ("..." if len(payload.message) > 35 else "")
            new_session = {
                "student_id": ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else None,
                "session_title": title,
                "subject": payload.subject,
                "grade_level": grade_level,
                "messages": new_messages,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            res = await db["chat_sessions"].insert_one(new_session)
            session_id = str(res.inserted_id)
    else:
        session_id = "demo_chat_session"

    return {
        "session_id": session_id,
        "reply": reply_text,
        "timestamp": datetime.utcnow()
    }

@router.get("/sessions")
async def get_my_chat_sessions(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    if db is None:
        return []
    cursor = db["chat_sessions"].find({"student_id": ObjectId(current_user["_id"])}).sort("updated_at", -1)
    sessions = await cursor.to_list(length=30)
    return [{
        "id": str(s["_id"]),
        "session_title": s.get("session_title", "Untitled Discussion"),
        "subject": s.get("subject", "General"),
        "grade_level": s.get("grade_level", "Class 10th"),
        "last_message": s.get("messages", [{}])[-1].get("content", "")[:60] if s.get("messages") else "",
        "updated_at": s.get("updated_at")
    } for s in sessions]

@router.get("/sessions/{session_id}")
async def get_chat_session_details(session_id: str, db = Depends(get_database)):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    session = await db["chat_sessions"].find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {
        "id": str(session["_id"]),
        "session_title": session.get("session_title"),
        "subject": session.get("subject"),
        "grade_level": session.get("grade_level", "Class 10th"),
        "messages": session.get("messages", [])
    }
