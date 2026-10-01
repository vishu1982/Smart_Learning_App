from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from typing import Literal
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.services.ai_service import ai_service
from app.models.quiz import QuizCreateRequest, QuizSubmitRequest
from app.utils.security import get_current_user
from app.services.email_service import send_quiz_milestone_email

QUIZ_MILESTONE = 8   # trigger subscription prompt + email after this many submissions


router = APIRouter(prefix="/quizzes")


class QuizTranslateRequest(BaseModel):
    language: Literal["hindi", "gujarati"]

FREE_QUIZ_LIMIT = 5    # free users can generate up to this many quizzes total

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: QuizCreateRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    # ── Quiz limit for free users ─────────────────────────────────────────────
    user_subscription = current_user.get("subscription", "free")
    if user_subscription == "free" and db is not None:
        user_oid = ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else None
        if user_oid:
            quiz_count = await db["quizzes"].count_documents({"created_by": user_oid})
            if quiz_count >= FREE_QUIZ_LIMIT:
                raise HTTPException(
                    status_code=403,
                    detail="QUIZ_LIMIT_REACHED"
                )
    # ─────────────────────────────────────────────────────────────────────────

    context_text = ""
    if payload.material_id and ObjectId.is_valid(payload.material_id) and db is not None:
        mat = await db["materials"].find_one({"_id": ObjectId(payload.material_id)})
        if mat:
            context_text = mat.get("extracted_text_preview", "")

    grade_level = payload.grade_level or current_user.get("profile", {}).get("grade_level", "Class 10th")

    quiz_data = await ai_service.generate_mcq_quiz(
        topic=payload.topic,
        subject=payload.subject,
        num_questions=payload.num_questions,
        difficulty=payload.difficulty,
        context_text=context_text,
        grade_level=grade_level
    )

    doc = {
        "title": quiz_data.get("title", f"{payload.topic} Practice Test"),
        "subject": payload.subject,
        "topic": payload.topic,
        "grade_level": grade_level,
        "material_id": ObjectId(payload.material_id) if payload.material_id and ObjectId.is_valid(payload.material_id) else None,
        "created_by": ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else None,
        "questions": quiz_data.get("questions", []),
        "time_limit_minutes": max(5, payload.num_questions * 2),
        "created_at": datetime.utcnow()
    }

    if db is not None:
        res = await db["quizzes"].insert_one(doc)
        quiz_id = str(res.inserted_id)
    else:
        quiz_id = "mock_quiz_id"

    return {
        "quiz_id": quiz_id,
        "title": doc["title"],
        "subject": doc["subject"],
        "grade_level": grade_level,
        "total_questions": len(doc["questions"]),
        "time_limit_minutes": doc["time_limit_minutes"]
    }


@router.get("/")
async def list_quizzes(db = Depends(get_database)):
    if db is None:
        return []
    quizzes = await db["quizzes"].find().sort("created_at", -1).to_list(30)
    return [{
        "id": str(q["_id"]),
        "title": q.get("title"),
        "subject": q.get("subject"),
        "grade_level": q.get("grade_level", "Class 10th"),
        "total_questions": len(q.get("questions", [])),
        "time_limit_minutes": q.get("time_limit_minutes", 10),
        "created_at": q.get("created_at")
    } for q in quizzes]

@router.get("/{quiz_id}")
async def get_quiz_for_taking(quiz_id: str, db = Depends(get_database)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid Quiz ID")
    quiz = await db["quizzes"].find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    sanitized = []
    for q in quiz.get("questions", []):
        sanitized.append({
            "question_id": q.get("question_id"),
            "question_text": q.get("question_text"),
            "options": q.get("options")
        })

    return {
        "quiz_id": str(quiz["_id"]),
        "title": quiz.get("title"),
        "subject": quiz.get("subject"),
        "grade_level": quiz.get("grade_level", "Class 10th"),
        "time_limit_minutes": quiz.get("time_limit_minutes", 10),
        "questions": sanitized
    }


@router.post("/{quiz_id}/translate")
async def translate_quiz(
    quiz_id: str,
    payload: QuizTranslateRequest,
    db = Depends(get_database)
):
    """
    Translates all quiz questions and options into Hindi or Gujarati using Gemini 3.6.
    Returns the translated questions list while preserving question_id ordering.
    The correct_option_index is NOT sent to the client (grading remains server-side).
    """
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid Quiz ID")

    quiz = await db["quizzes"].find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    original_questions = quiz.get("questions", [])
    if not original_questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions to translate")

    # Call Gemini translation — returns merged list with translated text
    translated = await ai_service.translate_quiz_questions(
        questions=original_questions,
        target_language=payload.language
    )

    # Strip answer metadata before sending to client (security — same as GET endpoint)
    sanitized = [{
        "question_id": q["question_id"],
        "question_text": q["question_text"],
        "options": q["options"]
    } for q in translated]

    return {
        "quiz_id": quiz_id,
        "language": payload.language,
        "questions": sanitized
    }


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid Quiz ID")
    quiz = await db["quizzes"].find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    q_map = {q["question_id"]: q for q in quiz.get("questions", [])}
    score = 0
    detailed_review = []
    stored_answers = []

    for ans in payload.answers:
        orig = q_map.get(ans.question_id)
        if orig:
            is_correct = (ans.selected_option_index == orig.get("correct_option_index"))
            if is_correct:
                score += 1
            stored_answers.append({
                "question_id": ans.question_id,
                "selected_option_index": ans.selected_option_index,
                "is_correct": is_correct
            })
            detailed_review.append({
                "question_id": ans.question_id,
                "question_text": orig.get("question_text"),
                "options": orig.get("options"),
                "selected_option_index": ans.selected_option_index,
                "correct_option_index": orig.get("correct_option_index"),
                "is_correct": is_correct,
                "explanation": orig.get("explanation", "")
            })

    total_q = len(quiz.get("questions", []))
    percentage = round((score / total_q) * 100, 2) if total_q > 0 else 0.0

    student_oid = ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else None

    sub_doc = {
        "quiz_id": ObjectId(quiz_id),
        "student_id": student_oid,
        "subject": quiz.get("subject", "Science"),
        "grade_level": quiz.get("grade_level", "Class 10th"),
        "time_taken_seconds": payload.time_taken_seconds,
        "score": score,
        "total_questions": total_q,
        "percentage": percentage,
        "answers": stored_answers,
        "submitted_at": datetime.utcnow()
    }
    res = await db["quiz_submissions"].insert_one(sub_doc)

    # ── Quiz milestone check ──────────────────────────────────────────────────
    subscription_prompt = False
    if student_oid:
        total_submissions = await db["quiz_submissions"].count_documents({"student_id": student_oid})
        if total_submissions > 0 and total_submissions % QUIZ_MILESTONE == 0:
            subscription_prompt = True
            user_email = current_user.get("email", "")
            user_name  = current_user.get("full_name", "Student")
            user_sub   = current_user.get("subscription", "free")
            # Only email free users (don't spam Pro/Elite subscribers)
            if user_email and user_sub == "free":
                background_tasks.add_task(
                    send_quiz_milestone_email, user_email, user_name, total_submissions
                )
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "submission_id": str(res.inserted_id),
        "score": score,
        "total_questions": total_q,
        "percentage": percentage,
        "time_taken_seconds": payload.time_taken_seconds,
        "detailed_review": detailed_review,
        "subscription_prompt": subscription_prompt    # frontend shows modal when True
    }


@router.get("/submissions/my")
async def get_my_submissions(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    if db is None:
        return []
    subs = await db["quiz_submissions"].find({"student_id": ObjectId(current_user["_id"])}).sort("submitted_at", -1).to_list(50)
    return [{
        "submission_id": str(s["_id"]),
        "subject": s.get("subject"),
        "grade_level": s.get("grade_level", "Class 10th"),
        "score": s.get("score"),
        "total_questions": s.get("total_questions"),
        "percentage": s.get("percentage"),
        "time_taken_seconds": s.get("time_taken_seconds"),
        "submitted_at": s.get("submitted_at")
    } for s in subs]
