import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.config import settings
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service
from app.utils.security import get_current_user

router = APIRouter(prefix="/materials")


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_material(
    title: str = Form(...),
    subject: str = Form(...),
    grade_level: str = Form(default="Class 10th"),
    is_private: str = Form(default="false"),   # "true" or "false" from FormData
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    private = is_private.lower() in ("true", "1", "yes")

    file_bytes = await file.read()
    file_size = len(file_bytes)

    safe_filename = f"{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        print(f" [Upload Notice] Could not write file to disk ({e}). Proceeding with in-memory text extraction.")

    extracted_text = pdf_service.extract_text_from_bytes(file_bytes)
    summary_data = await ai_service.summarize_document(
        title=title, text_content=extracted_text, grade_level=grade_level
    )

    uploader_id = ObjectId(current_user["_id"]) if ObjectId.is_valid(str(current_user["_id"])) else None

    material_doc = {
        "title": title,
        "subject": subject,
        "grade_level": grade_level,
        "is_private": private,
        "file_name": file.filename,
        "file_path": file_path,
        "file_size_bytes": file_size,
        "extracted_text_preview": extracted_text[:2000],
        "ai_summary": {
            "key_takeaways": summary_data.get("key_takeaways", []),
            "bullet_notes": summary_data.get("bullet_notes", ""),
            "generated_at": datetime.utcnow()
        },
        "uploaded_by": uploader_id,
        "status": "PROCESSED",
        "created_at": datetime.utcnow()
    }

    if db is not None:
        res = await db["materials"].insert_one(material_doc)
        material_id = str(res.inserted_id)
    else:
        material_id = "mock_material_id"

    return {
        "id": material_id,
        "title": title,
        "subject": subject,
        "grade_level": grade_level,
        "is_private": private,
        "file_name": file.filename,
        "status": "PROCESSED",
        "ai_summary": material_doc["ai_summary"]
    }


def _safe_id(user: dict):
    """Return ObjectId of current user or None."""
    uid = str(user.get("_id", ""))
    return ObjectId(uid) if ObjectId.is_valid(uid) else None


def _serialize(d: dict, show_notes: bool) -> dict:
    """Serialize a material document, hiding notes when not allowed."""
    summary = d.get("ai_summary")
    if summary and not show_notes:
        # Replace notes content with privacy placeholder
        summary = {
            "key_takeaways": ["🔒 Private — notes hidden"],
            "bullet_notes": "🔒 This material is marked **Private**. Only the owner can view the study notes.",
            "generated_at": summary.get("generated_at")
        }
    return {
        "id": str(d["_id"]),
        "title": d.get("title", ""),
        "subject": d.get("subject", ""),
        "grade_level": d.get("grade_level", "Class 10th"),
        "is_private": d.get("is_private", False),
        "file_name": d.get("file_name", ""),
        "file_size_bytes": d.get("file_size_bytes", 0),
        "status": d.get("status", "PROCESSED"),
        "ai_summary": summary,
        "created_at": d.get("created_at")
    }


@router.get("/my")
async def list_my_materials(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Returns ALL materials uploaded by the current user (public + private).
    Full AI notes are always shown here since the owner is viewing them.
    """
    if db is None:
        return []
    uid = _safe_id(current_user)
    query = {"uploaded_by": uid} if uid else {}
    docs = await db["materials"].find(query).sort("created_at", -1).to_list(100)
    return [_serialize(d, show_notes=True) for d in docs]


@router.get("/")
async def list_materials(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Public listing:
    - Public materials → shown to everyone WITH full notes.
    - Private materials uploaded by others → title/metadata only, notes hidden.
    - Private materials uploaded by the current user → shown WITH full notes.
    """
    if db is None:
        return []

    uid = _safe_id(current_user)
    docs = await db["materials"].find().sort("created_at", -1).to_list(100)

    result = []
    for d in docs:
        is_private = d.get("is_private", False)
        owner_id = d.get("uploaded_by")
        is_owner = (uid is not None and owner_id == uid)

        # Skip private materials uploaded by other users entirely (don't even list them)
        if is_private and not is_owner:
            continue

        # Owner always sees full notes; public materials always show full notes
        show_notes = (not is_private) or is_owner
        result.append(_serialize(d, show_notes=show_notes))

    return result


@router.get("/{material_id}")
async def get_material(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    if not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=400, detail="Invalid Material ID")

    doc = await db["materials"].find_one({"_id": ObjectId(material_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Material not found")

    uid = _safe_id(current_user)
    is_private = doc.get("is_private", False)
    is_owner = (uid is not None and doc.get("uploaded_by") == uid)

    if is_private and not is_owner:
        raise HTTPException(status_code=403, detail="This material is private")

    return _serialize(doc, show_notes=True)


@router.patch("/{material_id}/privacy")
async def toggle_privacy(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Toggle is_private flag on a material. Only the uploader can do this.
    """
    if not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=400, detail="Invalid Material ID")

    doc = await db["materials"].find_one({"_id": ObjectId(material_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Material not found")

    uid = _safe_id(current_user)
    if doc.get("uploaded_by") != uid:
        raise HTTPException(status_code=403, detail="Only the uploader can change privacy settings")

    new_private = not doc.get("is_private", False)
    await db["materials"].update_one(
        {"_id": ObjectId(material_id)},
        {"$set": {"is_private": new_private}}
    )
    return {"id": material_id, "is_private": new_private}
