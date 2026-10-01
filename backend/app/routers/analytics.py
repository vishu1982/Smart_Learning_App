from fastapi import APIRouter, Depends
from bson import ObjectId
from app.database import get_database
from app.services.analytics_service import analytics_service
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/analytics")

@router.get("/student/overview")
async def get_student_overview(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    student_id = ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else ObjectId()
    return await analytics_service.get_student_overview(db, student_id)

@router.get("/student/performance-chart")
async def get_student_chart(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    student_id = ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else ObjectId()
    return await analytics_service.get_student_chart_data(db, student_id)

@router.get("/admin/overview")
async def get_admin_overview(current_user: dict = Depends(require_role("ADMIN")), db = Depends(get_database)):
    return await analytics_service.get_admin_overview(db)

@router.get("/admin/students")
async def get_all_students(current_user: dict = Depends(require_role("ADMIN")), db = Depends(get_database)):
    if db is None:
        return []
    cursor = db["users"].find({"role": "STUDENT"}).sort("created_at", -1)
    students = await cursor.to_list(length=100)
    return [{
        "id": str(s["_id"]),
        "full_name": s.get("full_name"),
        "email": s.get("email"),
        "program": s.get("profile", {}).get("program", "MCA"),
        "semester": s.get("profile", {}).get("semester", 3),
        "created_at": s.get("created_at")
    } for s in students]
