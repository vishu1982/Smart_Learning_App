"""
Chat Router — Direct messaging between mutually connected users.
Two users can chat only when they follow each other (mutual follow).

Collection: messages
  { from_user, to_user, text, read, created_at }
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.utils.security import get_current_user

router = APIRouter(prefix="/chat")


def _uid(user: dict):
    raw = str(user.get("_id", ""))
    return ObjectId(raw) if ObjectId.is_valid(raw) else None


async def _check_mutual_follow(db, me: ObjectId, other: ObjectId) -> bool:
    """Users can chat when an accepted follow connection exists between them."""
    connected = await db["follow_requests"].find_one({
        "$or": [
            {"from_user": me, "to_user": other, "status": "accepted"},
            {"from_user": other, "to_user": me, "status": "accepted"},
        ]
    })
    return bool(connected)



# ─── Get conversation list (all users I've chatted with) ─────────────────────

@router.get("/conversations")
async def get_conversations(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Returns list of users the current user has exchanged messages with,
    including the last message preview.
    """
    if db is None:
        return []

    me = _uid(current_user)

    # Get all messages involving me
    msgs = await db["messages"].find(
        {"$or": [{"from_user": me}, {"to_user": me}]}
    ).sort("created_at", -1).to_list(500)

    # Build conversation map: other_user_id → latest message
    conv_map = {}
    for m in msgs:
        other = m["to_user"] if m["from_user"] == me else m["from_user"]
        other_str = str(other)
        if other_str not in conv_map:
            conv_map[other_str] = m

    result = []
    for other_id_str, last_msg in conv_map.items():
        other_oid = ObjectId(other_id_str)
        user_doc = await db["users"].find_one({"_id": other_oid}, {"password_hash": 0})
        if not user_doc:
            continue

        profile = user_doc.get("profile", {})
        # Count unread messages from this person
        unread = await db["messages"].count_documents(
            {"from_user": other_oid, "to_user": me, "read": False}
        )

        result.append({
            "user": {
                "id":          other_id_str,
                "full_name":   user_doc.get("full_name", "Student"),
                "grade_level": profile.get("grade_level", "Class 10th"),
            },
            "last_message": {
                "text":       last_msg.get("text", ""),
                "from_me":    last_msg["from_user"] == me,
                "created_at": last_msg["created_at"].isoformat() if hasattr(last_msg.get("created_at"), "isoformat") else "",
            },
            "unread_count": unread,
        })

    # Sort by most recent
    result.sort(key=lambda x: x["last_message"]["created_at"], reverse=True)
    return result


# ─── Get messages with a specific user ───────────────────────────────────────

@router.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return []
    if not ObjectId.is_valid(other_user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    me = _uid(current_user)
    other = ObjectId(other_user_id)

    # Must be mutual followers to chat
    mutual = await _check_mutual_follow(db, me, other)
    if not mutual:
        raise HTTPException(
            status_code=403,
            detail="You can only chat with users who follow you back."
        )

    # Mark messages from other as read
    await db["messages"].update_many(
        {"from_user": other, "to_user": me, "read": False},
        {"$set": {"read": True}}
    )

    # Get messages
    msgs = await db["messages"].find(
        {"$or": [
            {"from_user": me,    "to_user": other},
            {"from_user": other, "to_user": me}
        ]}
    ).sort("created_at", 1).to_list(200)

    return [{
        "id":         str(m["_id"]),
        "text":       m.get("text", ""),
        "from_me":    m["from_user"] == me,
        "read":       m.get("read", False),
        "created_at": m["created_at"].isoformat() if hasattr(m.get("created_at"), "isoformat") else "",
    } for m in msgs]


# ─── Send a message ───────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    text: str

@router.post("/messages/{other_user_id}")
async def send_message(
    other_user_id: str,
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return {"sent": True}
    if not ObjectId.is_valid(other_user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    me = _uid(current_user)
    other = ObjectId(other_user_id)

    mutual = await _check_mutual_follow(db, me, other)
    if not mutual:
        raise HTTPException(
            status_code=403,
            detail="You can only send messages to mutual followers."
        )

    msg_doc = {
        "from_user":  me,
        "to_user":    other,
        "text":       payload.text.strip(),
        "read":       False,
        "created_at": datetime.utcnow()
    }
    res = await db["messages"].insert_one(msg_doc)

    return {
        "id":         str(res.inserted_id),
        "text":       payload.text.strip(),
        "from_me":    True,
        "read":       False,
        "created_at": msg_doc["created_at"].isoformat(),
    }


# ─── Clear chat history with a specific user ─────────────────────────────────

@router.delete("/messages/{other_user_id}")
async def clear_messages(
    other_user_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Deletes all messages exchanged between the current user and other_user_id."""
    if db is None:
        return {"cleared": True}
    if not ObjectId.is_valid(other_user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    me = _uid(current_user)
    other = ObjectId(other_user_id)

    await db["messages"].delete_many({
        "$or": [
            {"from_user": me,    "to_user": other},
            {"from_user": other, "to_user": me}
        ]
    })
    return {"cleared": True, "message": "Chat history cleared"}


# ─── Unread message count (for navbar badge) ─────────────────────────────────

@router.get("/unread-count")
async def unread_count(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if db is None:
        return {"count": 0}
    me = _uid(current_user)
    count = await db["messages"].count_documents(
        {"to_user": me, "read": False}
    )
    return {"count": count}

